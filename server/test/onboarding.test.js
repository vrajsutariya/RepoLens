import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { config } from '../src/config/env.js';
import geminiService from '../src/services/gemini.service.js';
import {
  gatherOnboardingEvidence,
  buildOnboardingPrompt,
  buildOnboardingSystemInstruction,
  validateOnboardingGuide,
  generateOnboardingGuide,
  getOnboardingGuide,
  sanitizePlaceholder,
} from '../src/services/code-intelligence/onboardingService.js';
import Repository from '../src/models/Repository.js';
import AnalysisResult from '../src/models/AnalysisResult.js';
import OnboardingGuide from '../src/models/OnboardingGuide.js';
import { getRepoExtractedDir } from '../src/config/storage.js';

const API_BASE = 'http://localhost:5000/api';

async function runOnboardingTests() {
  console.log('--- RepoLens Phase 6: AI-Powered Onboarding Guide & Setup Assistant Automated Verification Suite ---\n');
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
            name: 'repolens-onboarding-fixture',
            version: '2.0.0',
            description: 'Task management microservice with MongoDB',
            main: 'server.js',
            engines: { node: '>=18.0.0' },
            scripts: {
              dev: 'nodemon server.js',
              start: 'node server.js',
              build: 'esbuild server.js --bundle --outfile=dist/server.js',
              test: 'node test/user.test.js',
            },
            dependencies: {
              express: '^4.18.2',
              mongoose: '^7.0.0',
              dotenv: '^16.0.3',
            },
            devDependencies: {
              nodemon: '^3.0.0',
              esbuild: '^0.19.0',
            },
          },
          null,
          2
        )
      )
    );

    fixtureZip.addFile(
      'README.md',
      Buffer.from(`# Task Manager Microservice

A backend service for organizing tasks with MongoDB and Express.

## Getting Started
To get started locally, install dependencies and start the dev server:
\`\`\`bash
npm install
npm run dev
\`\`\`

## Configuration
Copy \`.env.example\` to \`.env\` and configure your local MongoDB connection.
`)
    );

    fixtureZip.addFile(
      '.env.example',
      Buffer.from(`# Server HTTP Port
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/tasks_db

# Security Token (Secret)
JWT_SECRET=super_secret_jwt_token_12345
`)
    );

    fixtureZip.addFile(
      'server.js',
      Buffer.from(`import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

export const appServer = app;
app.listen(process.env.PORT || 5000);
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
  const users = await User.find({});
  res.json({ success: true, data: users });
};

export const createUser = async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ success: true, data: user });
};
`)
    );

    fixtureZip.addFile(
      'models/User.js',
      Buffer.from(`import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

export const User = mongoose.model('User', UserSchema);
export default User;
`)
    );

    fixtureZip.addFile(
      'test/user.test.js',
      Buffer.from(`console.log('Unit test execution');
`)
    );

    const zipBuffer = fixtureZip.toBuffer();

    // Ingest the fixture via POST /api/repositories/upload
    const form = new FormData();
    form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'onboarding-fixture.zip');
    form.append('name', 'Onboarding Test Repository');

    const uploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form,
    });

    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.data?._id, 'Upload: Fixture repository ingested successfully');
    const repoId = uploadData.data?._id;

    // Trigger Code Intelligence Analysis
    const analyzeRes = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
      method: 'POST',
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success && analyzeData.data?.status === 'completed', 'Analysis: Code Intelligence analysis completed');

    const repoDoc = await Repository.findById(repoId);
    const analysisDoc = await AnalysisResult.findOne({ repositoryId: repoId });
    const extractedDir = getRepoExtractedDir(repoDoc.storageKey);

    // -------------------------------------------------------------------------
    // Test 1: Evidence gathering extracts README, scripts, and env template
    // -------------------------------------------------------------------------
    const gathered = await gatherOnboardingEvidence(repoDoc, analysisDoc, extractedDir);
    assert(Boolean(gathered.readmeExcerpt && gathered.readmeFile === 'README.md'), 'Test 1: README discovered and excerpted');
    assert(Boolean(gathered.packageScripts.dev && gathered.packageScripts.start), 'Test 1b: Manifest scripts extracted');
    assert(Boolean(gathered.envExamplePath === '.env.example' && gathered.envVariables.length >= 3), 'Test 1c: Environment template parsed (.env.example)');
    assert(gathered.hasTests && gathered.testDirs.includes('test'), 'Test 1d: Test suite and directory recognized');

    // -------------------------------------------------------------------------
    // Test 2: Secret redaction in environment placeholders
    // -------------------------------------------------------------------------
    const rawSecret = 'super_secret_jwt_token_12345';
    const sanitized = sanitizePlaceholder('JWT_SECRET', rawSecret);
    assert(
      sanitized !== rawSecret && sanitized === '<your_jwt_secret_here>',
      'Test 2: Real JWT secret redacted to safe placeholder'
    );

    const safeMongo = sanitizePlaceholder('MONGODB_URI', 'mongodb://127.0.0.1:27017/tasks_db');
    assert(
      safeMongo === 'mongodb://127.0.0.1:27017/tasks_db',
      'Test 2b: Safe local loopback URI preserved'
    );

    // -------------------------------------------------------------------------
    // Test 3: Missing README and missing env example handle gracefully
    // -------------------------------------------------------------------------
    const mockEmptyRepo = {
      name: 'bare-repo',
      fileList: [
        { path: 'package.json', name: 'package.json', isBinary: false },
        { path: 'index.js', name: 'index.js', isBinary: false },
      ],
    };
    const emptyGathered = await gatherOnboardingEvidence(mockEmptyRepo, analysisDoc, extractedDir);
    assert(!emptyGathered.readmeExcerpt, 'Test 3: Missing README handled without error');
    assert(!emptyGathered.envExamplePath, 'Test 3b: Missing .env.example handled without error');

    // -------------------------------------------------------------------------
    // Test 4: Unanalyzed repository returns clean HTTP 400 with ANALYSIS_NOT_READY
    // -------------------------------------------------------------------------
    const unanalyzedRepo = await Repository.create({
      name: 'unanalyzed-repo',
      sourceType: 'zip',
      storageKey: 'fake_key_' + Math.random().toString(36).substring(2),
      totalFiles: 1,
      totalSize: 100,
    });

    const unanalyzedRes = await fetch(`${API_BASE}/repositories/${unanalyzedRepo._id}/onboarding/generate`, {
      method: 'POST',
    });
    const unanalyzedData = await unanalyzedRes.json();
    assert(
      !unanalyzedData.success &&
        unanalyzedData.error?.code === 'ANALYSIS_NOT_READY' &&
        unanalyzedRes.status === 400,
      'Test 4: Unanalyzed repository returns clean HTTP 400 with ANALYSIS_NOT_READY code'
    );

    // -------------------------------------------------------------------------
    // Test 5: Missing or unconfigured Gemini API key reports clean error
    // -------------------------------------------------------------------------
    geminiService.resetMockClient();
    const originalApiKey = config.geminiApiKey;
    let missingConfigCaught = false;
    try {
      config.geminiApiKey = '';
      await generateOnboardingGuide(repoId);
    } catch (err) {
      missingConfigCaught =
        err.statusCode === 503 &&
        (err.code === 'GEMINI_NOT_CONFIGURED' || err.message?.includes('GEMINI_API_KEY'));
    } finally {
      config.geminiApiKey = originalApiKey;
    }
    assert(missingConfigCaught, 'Test 5: Missing or invalid Gemini API key reports clean configuration error');

    // -------------------------------------------------------------------------
    // Test 6: Gemini timeout handling
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
      await generateOnboardingGuide(repoId);
    } catch (err) {
      timeoutCaught = err.statusCode === 504 || err.code === 'GEMINI_TIMEOUT';
    }
    assert(timeoutCaught, 'Test 6: Gemini request timeout returns HTTP 504');

    // -------------------------------------------------------------------------
    // Test 7: Successful End-to-End Onboarding Guide Generation with Mock Gemini
    // -------------------------------------------------------------------------
    const mockGeminiOutput = {
      overview: {
        purpose: 'Task management microservice with MongoDB database persistence and Express routing.',
        features: ['User management API', 'Persistent storage in MongoDB', 'Nodemon hot reloading'],
        technologies: [
          { name: 'Express', category: 'backend', version: '^4.18.2', confidence: 'manifest-verified', purpose: 'HTTP web routing' },
          { name: 'Mongoose', category: 'database', version: '^7.0.0', confidence: 'manifest-verified', purpose: 'MongoDB object modeling' },
        ],
        missingInfo: ['Authentication token expiry duration is not specified in the manifest.'],
      },
      architecture: {
        frontend: 'Headless / Backend API only',
        backend: 'Express MVC architecture with separated routes, controllers, and Mongoose models.',
        entryPoints: [
          { path: 'server.js', type: 'application-server', description: 'Server initialization and listener' },
        ],
        keyModules: [
          { path: 'controllers/user.controller.js', responsibility: 'User CRUD business logic', keySymbols: ['getUsers', 'createUser'] },
          { path: 'services/fictionalService.js', responsibility: 'Fabricated service that does not exist', keySymbols: [] },
        ],
        relationships: 'Routes import controllers which query Mongoose models.',
        recommendedGraph: 'api-flow',
      },
      setup: {
        prerequisites: ['Node.js (>=18.0.0)', 'npm package manager', 'MongoDB 6.0+'],
        installCommands: [
          { command: 'npm install', description: 'Install project dependencies', isVerified: true },
        ],
        devCommands: [
          { command: 'npm run dev', description: 'Start local server with Nodemon', isVerified: true },
        ],
        prodCommands: [
          { command: 'npm run build', description: 'Bundle server code', isVerified: true },
        ],
        requiredServices: [
          { name: 'MongoDB', description: 'Local database server on port 27017', isVerified: true },
        ],
        expectedUrls: [
          { label: 'Users API', url: 'http://localhost:5000/api/users', description: 'Users resource endpoint' },
        ],
      },
      environment: {
        hasExampleFile: true,
        exampleFilePath: '.env.example',
        setupInstructions: 'Copy .env.example to .env and configure local variables.',
        variables: [
          { name: 'PORT', description: 'HTTP port', required: false, placeholder: '5000', usedBy: 'HTTP Web Server', isVerified: true },
          { name: 'MONGODB_URI', description: 'Mongo URI', required: true, placeholder: 'mongodb://127.0.0.1:27017/tasks_db', usedBy: 'Database Service', isVerified: true },
          { name: 'JWT_SECRET', description: 'JWT signing secret', required: true, placeholder: 'super_secret_jwt_token_12345', usedBy: 'Security', isVerified: true },
        ],
      },
      readingOrder: [
        { order: 1, filePath: 'server.js', purpose: 'Application server bootstrapper', whyItMatters: 'Registers middleware and mounts routes', keySymbols: ['appServer'], startLine: 1, endLine: 15, nextFile: 'routes/user.routes.js' },
        { order: 2, filePath: 'routes/user.routes.js', purpose: 'User route definitions', whyItMatters: 'Maps endpoints to handlers', keySymbols: ['router'], startLine: 1, endLine: 12, nextFile: 'controllers/user.controller.js' },
        { order: 3, filePath: 'controllers/user.controller.js', purpose: 'User business logic', whyItMatters: 'Performs DB queries and handles requests', keySymbols: ['getUsers', 'createUser'], startLine: 1, endLine: 15, nextFile: 'models/User.js' },
        { order: 4, filePath: 'models/User.js', purpose: 'Mongoose user schema', whyItMatters: 'Defines MongoDB data contracts', keySymbols: ['User'], startLine: 1, endLine: 10, nextFile: null },
      ],
      requestFlow: {
        summary: 'Incoming HTTP requests are routed via user.routes.js to user.controller.js which interacts with User.js schema.',
        steps: [
          { step: 1, component: 'HTTP Request', action: 'Client sends GET /api/users', isVerified: true },
          { step: 2, component: 'Router', action: 'routes/user.routes.js matches route and calls getUsers', filePath: 'routes/user.routes.js', startLine: 1, endLine: 8, isVerified: true },
          { step: 3, component: 'Controller', action: 'controllers/user.controller.js calls User.find()', filePath: 'controllers/user.controller.js', startLine: 1, endLine: 6, isVerified: true },
          { step: 4, component: 'Database', action: 'Mongoose queries MongoDB tasks_db collection', filePath: 'models/User.js', startLine: 1, endLine: 8, isVerified: true },
        ],
        limitations: ['Static analysis cannot guarantee database index performance at runtime.'],
      },
      testingAndTroubleshooting: {
        hasTests: true,
        testCommands: [
          { command: 'npm test', description: 'Run unit test suite', isVerified: true },
        ],
        testDirectories: ['test'],
        troubleshooting: [
          { issue: 'MongoDB connection failed (ECONNREFUSED)', possibleCause: 'mongod service not running', suggestedFix: 'Start MongoDB service locally', isVerified: true },
        ],
      },
    };

    geminiService.setMockClient({
      models: {
        generateContent: async () => ({
          text: JSON.stringify(mockGeminiOutput),
        }),
      },
    });

    const generatedGuide = await generateOnboardingGuide(repoId, { forceRegenerate: true });
    assert(Boolean(generatedGuide && generatedGuide._id), 'Test 7: End-to-end onboarding guide generated and saved in MongoDB');
    assert(generatedGuide.overview.features.length >= 3, 'Test 7b: Overview features populated');
    assert(generatedGuide.setup.installCommands.length > 0, 'Test 7c: Setup install commands populated');
    assert(generatedGuide.readingOrder.length === 4, 'Test 7d: Reading order populated with 4 files');

    // -------------------------------------------------------------------------
    // Test 8: Authoritative Disk Verification: Fabricated file paths filtered out
    // -------------------------------------------------------------------------
    const keyModulesPaths = generatedGuide.architecture.keyModules.map((m) => m.path);
    assert(
      !keyModulesPaths.includes('services/fictionalService.js'),
      'Test 8: Fabricated file path "services/fictionalService.js" purged by authoritative validator'
    );

    // -------------------------------------------------------------------------
    // Test 9: Secret placeholder redaction verified in persisted guide
    // -------------------------------------------------------------------------
    const jwtVar = generatedGuide.environment.variables.find((v) => v.name === 'JWT_SECRET');
    assert(
      jwtVar && jwtVar.placeholder === '<your_jwt_secret_here>',
      'Test 9: JWT_SECRET placeholder safely sanitized in database guide'
    );

    // -------------------------------------------------------------------------
    // Test 10: Dangerous command warning flag detection
    // -------------------------------------------------------------------------
    const installCmd = generatedGuide.setup.installCommands.find((c) => c.command === 'npm install');
    assert(
      installCmd && installCmd.warning && installCmd.warning.includes('Installs external packages'),
      'Test 10: Package install command flagged with safety warning'
    );

    // -------------------------------------------------------------------------
    // Test 11: Cached Guide Retrieval via GET /api/repositories/:id/onboarding
    // -------------------------------------------------------------------------
    const getRes = await fetch(`${API_BASE}/repositories/${repoId}/onboarding`);
    const getData = await getRes.json();
    assert(getData.success && getData.data.hasGuide, 'Test 11: GET /api/repositories/:id/onboarding returns cached guide');
    assert(!getData.data.isStale, 'Test 11b: Newly generated guide is not stale');

    // -------------------------------------------------------------------------
    // Test 12: Stale Guide Detection on Re-analysis
    // -------------------------------------------------------------------------
    // Re-trigger analysis
    await fetch(`${API_BASE}/repositories/${repoId}/analyze`, { method: 'POST' });
    const getStaleRes = await fetch(`${API_BASE}/repositories/${repoId}/onboarding`);
    const getStaleData = await getStaleRes.json();
    assert(
      getStaleData.success && getStaleData.data.isStale === true,
      'Test 12: Guide marked stale after repository re-analysis'
    );

    // -------------------------------------------------------------------------
    // Test 13: Force Regeneration refreshes guide and clears stale flag
    // -------------------------------------------------------------------------
    const regeneratedGuide = await generateOnboardingGuide(repoId, { forceRegenerate: true });
    assert(
      Boolean(regeneratedGuide && regeneratedGuide.isStale === false),
      'Test 13: Force regeneration refreshes guide and clears stale flag'
    );

    const getRefreshedRes = await fetch(`${API_BASE}/repositories/${repoId}/onboarding`);
    const getRefreshedData = await getRefreshedRes.json();
    assert(
      getRefreshedData.success && getRefreshedData.data?.isStale === false,
      'Test 13b: GET /api/repositories/:id/onboarding confirms guide is refreshed and active'
    );

    // -------------------------------------------------------------------------
    // Test 14: Invalid repository ID format returns HTTP 400
    // -------------------------------------------------------------------------
    const invalidIdRes = await fetch(`${API_BASE}/repositories/not-a-valid-id/onboarding`);
    const invalidIdData = await invalidIdRes.json();
    assert(
      !invalidIdData.success && invalidIdRes.status === 400,
      'Test 14: Invalid repository ID format returns HTTP 400'
    );

    // -------------------------------------------------------------------------
    // Test 15: Non-existent repository ID returns HTTP 404
    // -------------------------------------------------------------------------
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(`${API_BASE}/repositories/${nonExistentId}/onboarding`);
    const notFoundData = await notFoundRes.json();
    assert(
      !notFoundData.success && notFoundRes.status === 404,
      'Test 15: Non-existent repository ID returns HTTP 404'
    );

    // Cleanup mock
    geminiService.resetMockClient();
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n========================================');
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');
    await mongoose.disconnect();
    if (failed > 0) process.exit(1);
  }
}

runOnboardingTests();
