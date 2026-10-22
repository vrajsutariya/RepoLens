import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import { config } from '../src/config/env.js';
import geminiService from '../src/services/gemini.service.js';
import { retrieveCodeEvidence } from '../src/services/code-intelligence/qaRetrieval.service.js';
import { validateQAResult } from '../src/services/code-intelligence/qaValidator.js';
import { answerCodebaseQuestion } from '../src/services/code-intelligence/qaService.js';
import { generateSuggestedQuestions } from '../src/services/code-intelligence/suggestedQuestions.service.js';
import Repository from '../src/models/Repository.js';
import AnalysisResult from '../src/models/AnalysisResult.js';
import { getRepoExtractedDir } from '../src/config/storage.js';

const API_BASE = 'http://localhost:5000/api';

async function runQATests() {
  console.log('--- RepoLens Phase 4: Gemini Codebase Q&A Automated Verification Suite ---\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  try {
    await connectDB();

    // -------------------------------------------------------------------------
    // Setup: Create and ingest a verified test repository fixture
    // -------------------------------------------------------------------------
    const fixtureZip = new AdmZip();

    fixtureZip.addFile(
      'package.json',
      Buffer.from(
        JSON.stringify(
          {
            name: 'repolens-qa-fixture',
            version: '1.0.0',
            main: 'server.js',
            scripts: { start: 'node server.js' },
            dependencies: {
              express: '^4.18.2',
              mongoose: '^7.0.0',
              bcrypt: '^5.1.0',
              jsonwebtoken: '^9.0.0',
            },
          },
          null,
          2
        )
      )
    );

    fixtureZip.addFile(
      'server.js',
      Buffer.from(`import express from 'express';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export const startServer = () => {
  app.listen(5000);
};
startServer();
`)
    );

    fixtureZip.addFile(
      'routes/user.routes.js',
      Buffer.from(`import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller.js';

const router = Router();
router.get('/', getUsers);
router.post('/', createUser);

export default router;
`)
    );

    fixtureZip.addFile(
      'controllers/user.controller.js',
      Buffer.from(`import User from '../models/User.js';

export const getUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

export const createUser = async (req, res) => {
  const newUser = await User.create(req.body);
  res.status(201).json(newUser);
};
`)
    );

    fixtureZip.addFile(
      'routes/auth.routes.js',
      Buffer.from(`import { Router } from 'express';
import { loginUser, registerUser } from '../controllers/auth.controller.js';

const router = Router();
router.post('/login', loginUser);
router.post('/register', registerUser);

export default router;
`)
    );

    fixtureZip.addFile(
      'controllers/auth.controller.js',
      Buffer.from(`import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'User not found' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ id: user._id }, 'secret_key');
  res.json({ token, user });
};

export const registerUser = async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newUser = await User.create({ ...req.body, password: hashedPassword });
  res.status(201).json(newUser);
};
`)
    );

    fixtureZip.addFile(
      'models/User.js',
      Buffer.from(`import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);
export default User;
`)
    );

    fixtureZip.addFile(
      '.env.example',
      Buffer.from(`PORT=5000\nMONGODB_URI=mongodb://localhost:27017/app\nJWT_SECRET=supersecret\n`)
    );

    // Upload fixture repository
    const zipBuffer = fixtureZip.toBuffer();
    const form = new FormData();
    form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'qa-fixture.zip');
    form.append('name', 'QA Test Repository');

    const uploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.data._id, 'Upload: Fixture repository uploaded successfully');
    const repoId = uploadData.data._id;

    // Trigger Code Intelligence Analysis
    const analyzeRes = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
      method: 'POST',
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success && analyzeData.data.status === 'completed', 'Analysis: Analysis pipeline completed');

    const repoDoc = await Repository.findById(repoId);
    const analysisDoc = await AnalysisResult.findOne({ repositoryId: repoId });
    const extractedDir = getRepoExtractedDir(repoDoc.storageKey);

    // -------------------------------------------------------------------------
    // Test 1: Asking where a known function is defined (e.g. "getUsers")
    // -------------------------------------------------------------------------
    const { evidence: symEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'Where is the getUsers function defined?'
    );
    const foundGetUsers = symEvidence.some(
      (e) => e.symbolName === 'getUsers' && e.filePath.includes('user.controller.js')
    );
    assert(foundGetUsers, 'Test 1: Known function "getUsers" retrieved with correct file path');

    // -------------------------------------------------------------------------
    // Test 2: Asking about a real Express API endpoint (e.g. "POST /api/auth/login")
    // -------------------------------------------------------------------------
    const { evidence: epEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'What happens when POST /api/auth/login is called?'
    );
    const foundAuthEndpoint = epEvidence.some(
      (e) => e.filePath.includes('auth.routes.js') || e.symbolName?.includes('loginUser')
    );
    assert(foundAuthEndpoint, 'Test 2: Real Express endpoint "POST /api/auth/login" retrieved');

    // -------------------------------------------------------------------------
    // Test 3: Asking about a detected database model (e.g. "User")
    // -------------------------------------------------------------------------
    const { evidence: dbEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'Where is the User database model defined?'
    );
    const foundUserModel = dbEvidence.some(
      (e) => e.filePath.includes('User.js') && e.evidenceType === 'database_operation'
    );
    assert(foundUserModel, 'Test 3: Detected database model "User" retrieved from models/User.js');

    // -------------------------------------------------------------------------
    // Test 4: Asking about a file with a known import relationship (routes -> controller)
    // -------------------------------------------------------------------------
    const { evidence: importEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'How does server.js connect to user routes and controllers?'
    );
    const foundUserRoutes = importEvidence.some((e) => e.filePath.includes('user.routes.js'));
    const foundServer = importEvidence.some((e) => e.filePath.includes('server.js'));
    assert(foundUserRoutes && foundServer, 'Test 4: Related files expanded via dependency graph');

    // -------------------------------------------------------------------------
    // Test 5: Asking an unrelated question with insufficient repository evidence
    // -------------------------------------------------------------------------
    const { evidence: unEvidence, hasSufficientEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'What is the tomorrow weather forecast in Tokyo Japan?'
    );
    assert(!hasSufficientEvidence && unEvidence.length === 0, 'Test 5: Unrelated question detects insufficient repository evidence');

    // -------------------------------------------------------------------------
    // Test 6: Handling missing Gemini configuration
    // -------------------------------------------------------------------------
    geminiService.resetMockClient();
    const originalApiKey = config.geminiApiKey;
    let missingConfigCaught = false;
    try {
      config.geminiApiKey = '';
      await answerCodebaseQuestion(repoId, 'Where is the User model defined?');
    } catch (err) {
      missingConfigCaught =
        err.statusCode === 503 &&
        (err.code === 'GEMINI_NOT_CONFIGURED' || err.message?.includes('GEMINI_API_KEY'));
    } finally {
      config.geminiApiKey = originalApiKey;
    }
    assert(missingConfigCaught, 'Test 6: Missing Gemini API key reports clean HTTP 503 configuration error');

    // -------------------------------------------------------------------------
    // Test 7: Handling Gemini API errors and timeouts gracefully
    // -------------------------------------------------------------------------
    geminiService.setMockClient({
      models: {
        generateContent: async () => {
          const err = new Error('Gateway Timeout');
          err.code = 'GEMINI_TIMEOUT';
          err.statusCode = 504;
          throw err;
        },
      },
    });

    let timeoutCaught = false;
    try {
      await answerCodebaseQuestion(repoId, 'How is user login processed?');
    } catch (err) {
      timeoutCaught = err.statusCode === 504 || err.code === 'GEMINI_TIMEOUT';
    }
    assert(timeoutCaught, 'Test 7: Gemini request timeout returns HTTP 504 with structured error');

    // -------------------------------------------------------------------------
    // Test 8: Rejecting invalid / invented evidence IDs in model claims
    // -------------------------------------------------------------------------
    const mockEvidence = [
      {
        id: 'ev_1',
        filePath: 'controllers/user.controller.js',
        startLine: 3,
        endLine: 6,
        evidenceType: 'function_definition',
        symbolName: 'getUsers',
        snippet: 'export const getUsers = async ...',
        retrievalMethod: 'symbol_match',
        verification: 'source_verified',
      },
    ];

    const mockOutputWithFabricatedCitation = {
      answer: 'Users are fetched from MongoDB using User.find().',
      summary: 'getUsers queries MongoDB.',
      claims: [
        {
          text: 'The getUsers controller invokes User.find().',
          type: 'source_fact',
          evidenceIds: ['ev_1', 'ev_fabricated_999'], // ev_fabricated_999 should be stripped
        },
        {
          text: 'Another invented claim with fake ID only.',
          type: 'source_fact',
          evidenceIds: ['ev_ghost'], // Should be downgraded to architectural_inference
        },
      ],
      suggestedFiles: ['controllers/user.controller.js'],
    };

    const validatedCitations = await validateQAResult(
      mockOutputWithFabricatedCitation,
      mockEvidence,
      repoDoc,
      extractedDir
    );

    const firstClaimIds = validatedCitations.claims[0].evidenceIds;
    const secondClaim = validatedCitations.claims[1];
    assert(
      firstClaimIds.includes('ev_1') && !firstClaimIds.includes('ev_fabricated_999'),
      'Test 8a: Server-side validator strips fabricated evidence ID "ev_fabricated_999"'
    );
    assert(
      secondClaim.type === 'architectural_inference' && secondClaim.evidenceIds.length === 0,
      'Test 8b: Unsupported claim downgraded from source_fact to architectural_inference'
    );

    // -------------------------------------------------------------------------
    // Test 9: Rejecting fabricated file paths and line ranges
    // -------------------------------------------------------------------------
    const mockOutputWithFabricatedFiles = {
      answer: 'Configuration is loaded from secure vaults.',
      summary: 'Vault summary',
      claims: [],
      suggestedFiles: [
        'controllers/user.controller.js', // Valid
        'server/passwords.txt', // Fabricated
        '../../etc/shadow', // Malicious / invalid
      ],
    };

    const validatedFiles = await validateQAResult(
      mockOutputWithFabricatedFiles,
      mockEvidence,
      repoDoc,
      extractedDir
    );

    assert(
      validatedFiles.suggestedFiles.includes('controllers/user.controller.js') &&
        !validatedFiles.suggestedFiles.includes('server/passwords.txt') &&
        !validatedFiles.suggestedFiles.includes('../../etc/shadow'),
      'Test 9: Fabricated and unsafe suggested files rejected by repository validator'
    );

    // -------------------------------------------------------------------------
    // Test 10: Preventing cross-repository evidence access
    // -------------------------------------------------------------------------
    // Create a second repository
    const zip2 = new AdmZip();
    zip2.addFile('secret.js', Buffer.from('const SECRET = "repo2_secret";'));
    zip2.addFile('package.json', Buffer.from('{"name":"repo2"}'));
    const form2 = new FormData();
    form2.append('file', new Blob([zip2.toBuffer()], { type: 'application/zip' }), 'repo2.zip');
    form2.append('name', 'Repository 2');

    const upload2Res = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form2,
    });
    const upload2Data = await upload2Res.json();
    const repo2Id = upload2Data.data._id;
    await fetch(`${API_BASE}/repositories/${repo2Id}/analyze`, { method: 'POST' });

    // Retrieve evidence for repo1; ensure repo2 files are NEVER included
    const { evidence: crossEvidence } = await retrieveCodeEvidence(
      repoDoc,
      analysisDoc,
      'Show me all secrets'
    );
    const hasRepo2File = crossEvidence.some((e) => e.filePath.includes('secret.js'));
    assert(!hasRepo2File, 'Test 10: Cross-repository evidence access strictly blocked');

    // -------------------------------------------------------------------------
    // Test 11: Handling stale source line numbers with disk verification
    // -------------------------------------------------------------------------
    const staleEvidence = [
      {
        id: 'ev_1',
        filePath: 'controllers/user.controller.js',
        startLine: 9999, // Stale line far exceeding file length
        endLine: 10050,
        evidenceType: 'function_definition',
        symbolName: 'getUsers',
        snippet: 'export const getUsers = ...',
      },
    ];

    const validatedStale = await validateQAResult(
      { answer: 'ok', summary: 'ok', claims: [{ text: 'test', type: 'source_fact', evidenceIds: ['ev_1'] }] },
      staleEvidence,
      repoDoc,
      extractedDir
    );

    assert(
      validatedStale.evidence[0].startLine <= 30, // Actual file line count clamped
      'Test 11: Stale source line numbers validated and clamped against actual disk content'
    );

    // -------------------------------------------------------------------------
    // Test 12: Handling malformed model responses safely
    // -------------------------------------------------------------------------
    const malformedValidatorResult = await validateQAResult(
      null, // Malformed null response
      mockEvidence,
      repoDoc,
      extractedDir
    );
    assert(
      typeof malformedValidatorResult.answer === 'string' &&
        Array.isArray(malformedValidatorResult.claims),
      'Test 12: Malformed model response handled with safe structured fallback'
    );

    // -------------------------------------------------------------------------
    // Test 13: Handling empty and oversized questions
    // -------------------------------------------------------------------------
    const emptyQRes = await fetch(`${API_BASE}/repositories/${repoId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    });
    assert(emptyQRes.status === 400, 'Test 13a: Empty question rejected with HTTP 400');

    const oversizedQRes = await fetch(`${API_BASE}/repositories/${repoId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'a'.repeat(501) }),
    });
    assert(oversizedQRes.status === 400, 'Test 13b: Oversized question (>500 chars) rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // Test 14: Verifying suggested questions generation
    // -------------------------------------------------------------------------
    const suggestedRes = await fetch(`${API_BASE}/repositories/${repoId}/suggested-questions`);
    const suggestedData = await suggestedRes.json();
    const suggestions = suggestedData.data || [];
    assert(
      suggestedData.success &&
        suggestions.length > 0 &&
        suggestions.some((s) => s.toLowerCase().includes('auth') || s.toLowerCase().includes('user')),
      'Test 14: Dynamic suggested questions tailored to detected authentication & API features'
    );

    // -------------------------------------------------------------------------
    // Test 15: Deterministic End-to-End Q&A with Mock Gemini Client
    // -------------------------------------------------------------------------
    geminiService.setMockClient({
      models: {
        generateContent: async () => {
          return {
            text: JSON.stringify({
              answer: 'Authentication is implemented in `controllers/auth.controller.js` using bcrypt for password hashing and JSON Web Tokens (jwt) for stateless session tokens.',
              summary: 'User authentication is handled by auth.controller.js via bcrypt and jsonwebtoken.',
              claims: [
                {
                  text: 'loginUser verifies credentials via bcrypt.compare and signs tokens with jwt.sign.',
                  type: 'source_fact',
                  evidenceIds: ['ev_1'],
                },
                {
                  text: 'User sessions are stateless and token-based.',
                  type: 'architectural_inference',
                  evidenceIds: [],
                },
              ],
              inferences: ['The application uses standard JWT Bearer token authentication.'],
              limitations: ['Token expiration duration is not explicitly declared in jwt.sign.'],
              suggestedFiles: ['controllers/auth.controller.js', 'routes/auth.routes.js'],
            }),
          };
        },
      },
    });

    const askSuccessData = await answerCodebaseQuestion(repoId, 'Where is authentication handled?');

    assert(
      askSuccessData &&
        askSuccessData.claims.length === 2 &&
        askSuccessData.evidence.length > 0 &&
        askSuccessData.evidence[0].verification === 'source_verified',
      'Test 15: End-to-end codebase Q&A succeeds with verified claims and source evidence citations'
    );

    geminiService.resetMockClient();
  } catch (err) {
    console.error(`[FAIL] Unhandled test exception: ${err.message}`, err);
    failed++;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect error
    }
  }

  console.log('\n========================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQATests();
