import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { config } from '../src/config/env.js';
import geminiService from '../src/services/gemini.service.js';
import { matchFaqQuestion, FAQ_ENTRIES } from '../src/services/code-intelligence/faqKnowledgeBase.js';
import { answerCodebaseQuestion } from '../src/services/code-intelligence/qaService.js';
import { generateOnboardingGuide } from '../src/services/code-intelligence/onboardingService.js';
import Repository from '../src/models/Repository.js';
import AnalysisResult from '../src/models/AnalysisResult.js';
import OnboardingGuide from '../src/models/OnboardingGuide.js';
import { getRepoStorageDir } from '../src/config/storage.js';

const API_BASE = 'http://localhost:5000/api';

async function runDeletionAndFaqTests() {
  console.log('--- RepoLens Feature Verification: Repository Deletion & FAQ Fallback Suite ---\n');
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

    // =========================================================================
    // Part 1: FAQ Knowledge Base Verification
    // =========================================================================
    console.log('[SECTION 1] Predefined FAQ Knowledge Base');

    assert(
      Array.isArray(FAQ_ENTRIES) && FAQ_ENTRIES.length >= 15,
      `FAQ 1: Knowledge base contains all 15 required core questions (${FAQ_ENTRIES.length} defined)`
    );

    const requiredQuestions = [
      'What is RepoLens?',
      'How do I import a repository?',
      'How does repository analysis work?',
      'What information does the dashboard display?',
      'How do I understand the project architecture?',
      'How do I explore file dependencies?',
      'How can I understand API routes?',
      'How do I use the AI Q&A feature?',
      'What happens when the Gemini API is unavailable?',
      'How does the onboarding guide help developers?',
      'How can I find a file or symbol?',
      'How do I delete a repository?',
      'Why might repository analysis fail?',
      'How can I troubleshoot a missing or invalid Gemini API key?',
      "Does RepoLens execute the uploaded repository's code?",
    ];

    const allFound = requiredQuestions.every((q) =>
      FAQ_ENTRIES.some((entry) => entry.question.toLowerCase().trim() === q.toLowerCase().trim())
    );
    assert(allFound, 'FAQ 2: All 15 specific user questions are present with valid answers');

    // Test API route GET /api/repositories/faq
    const faqRes = await fetch(`${API_BASE}/repositories/faq`);
    const faqData = await faqRes.json();
    assert(
      faqRes.status === 200 && faqData.success && faqData.data.length >= 15,
      'FAQ 3: GET /api/repositories/faq returns full FAQ catalog via REST API'
    );

    // Test deterministic matcher
    const match1 = matchFaqQuestion('What is RepoLens?');
    assert(
      match1.matched && match1.matched.id === 'what-is-repolens' && match1.confidence >= 0.8,
      'FAQ 4: Matcher correctly resolves "What is RepoLens?"'
    );

    const match2 = matchFaqQuestion('how do I upload a zip file?');
    assert(
      match2.matched && match2.matched.id === 'how-to-import',
      'FAQ 5: Matcher handles synonym phrasing ("upload a zip file" -> import)'
    );

    const match3 = matchFaqQuestion('does it run or execute untrusted code?');
    assert(
      match3.matched && match3.matched.id === 'code-execution-safety',
      'FAQ 6: Matcher identifies security/execution query'
    );

    const match4 = matchFaqQuestion('what is the tomorrow weather forecast in Tokyo Japan?');
    assert(
      match4.matched === null && match4.suggestedFaqs.length > 0,
      'FAQ 7: Unrelated query returns null match with relevant FAQ suggestions'
    );

    // =========================================================================
    // Part 2: Ingest Fixture Repository for Testing
    // =========================================================================
    console.log('\n[SECTION 2] Repository Ingestion & Analysis Setup');

    const zip = new AdmZip();
    zip.addFile(
      'package.json',
      Buffer.from(
        JSON.stringify(
          {
            name: 'deletion-test-repo',
            version: '1.0.0',
            main: 'server.js',
            scripts: { start: 'node server.js' },
            dependencies: { express: '^4.18.2' },
          },
          null,
          2
        )
      )
    );
    zip.addFile(
      'server.js',
      Buffer.from(`import express from 'express';\nconst app = express();\napp.get('/ping', (req, res) => res.send('pong'));\nexport default app;`)
    );
    zip.addFile(
      'README.md',
      Buffer.from(`# Deletion Test Repo\nSimple repository for deletion verification.`)
    );

    const zipBuffer = zip.toBuffer();
    const form = new FormData();
    form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'del-test.zip');
    form.append('name', 'Deletion and FAQ Test Repository');

    const uploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.data._id, 'Setup: Test repository uploaded successfully');
    const repoId = uploadData.data._id;

    // Analyze repository
    const analyzeRes = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
      method: 'POST',
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success && analyzeData.data.status === 'completed', 'Setup: Analysis pipeline completed');

    // Create mock onboarding guide for repository
    geminiService.setMockClient({
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            overview: {
              purpose: 'Deletion test project',
              features: ['Express server'],
              technologies: [{ name: 'express', category: 'framework' }],
              missingInfo: [],
            },
            architecture: {
              frontend: 'N/A',
              backend: 'Express.js microservice',
              entryPoints: [{ path: 'server.js', type: 'application-server' }],
              keyModules: [{ path: 'server.js', responsibility: 'HTTP API' }],
            },
            setup: {
              prerequisites: ['Node.js'],
              installCommands: [{ command: 'npm install', purpose: 'Install dependencies', isSafeToExecute: true }],
              devCommands: [{ command: 'npm start', purpose: 'Start server' }],
              buildCommands: [],
            },
            environment: { variables: [] },
            readingOrder: [{ order: 1, path: 'server.js', reason: 'Main entry point' }],
            requestFlow: { steps: [] },
            testingAndTroubleshooting: { hasTests: false, testCommands: [], troubleshooting: [] },
          }),
        }),
      },
    });

    const guideDoc = await generateOnboardingGuide(repoId);
    assert(Boolean(guideDoc && guideDoc.overview), 'Setup: Onboarding guide generated');

    // =========================================================================
    // Part 3: FAQ Fallback Behavior Under Unconfigured & Failing Gemini
    // =========================================================================
    console.log('\n[SECTION 3] Predefined FAQ Fallback Execution');

    // Scenario A: Missing API key with matching FAQ
    geminiService.resetMockClient();
    const originalApiKey = config.geminiApiKey;
    try {
      config.geminiApiKey = '';

      const faqFallbackAnswer = await answerCodebaseQuestion(repoId, 'How do I import a repository?');
      assert(
        faqFallbackAnswer.isFaqFallback === true &&
          faqFallbackAnswer.source === 'faq_fallback' &&
          faqFallbackAnswer.evidence.length === 0 &&
          faqFallbackAnswer.answer.includes('ZIP Archive Upload'),
        'Fallback 1: Unconfigured Gemini returns predefined FAQ answer for "How do I import a repository?"'
      );

      // Scenario B: Missing API key with security FAQ
      const secFaqAnswer = await answerCodebaseQuestion(
        repoId,
        "Does RepoLens execute the uploaded repository's code?"
      );
      assert(
        secFaqAnswer.isFaqFallback === true && secFaqAnswer.answer.includes('No, absolutely not'),
        'Fallback 2: Unconfigured Gemini returns predefined answer for code execution safety query'
      );

      // Scenario C: Missing API key with UNMATCHED code question
      let missingConfigCaught = false;
      let suggestedTopicsFound = false;
      try {
        await answerCodebaseQuestion(repoId, 'Where is the User model defined?');
      } catch (err) {
        missingConfigCaught = err.statusCode === 503 && err.code === 'GEMINI_NOT_CONFIGURED';
        suggestedTopicsFound = Array.isArray(err.suggestedFaqs) && err.suggestedFaqs.length > 0;
      }
      assert(
        missingConfigCaught && suggestedTopicsFound,
        'Fallback 3: Unmatched question with unconfigured Gemini throws clean 503 with suggested FAQs'
      );
    } finally {
      config.geminiApiKey = originalApiKey;
    }

    // Scenario D: Gemini Timeout with matching FAQ
    geminiService.setMockClient({
      models: {
        generateContent: async () => {
          const timeoutErr = new Error('Gateway Timeout');
          timeoutErr.statusCode = 504;
          timeoutErr.code = 'GEMINI_TIMEOUT';
          throw timeoutErr;
        },
      },
    });

    const timeoutFaqAnswer = await answerCodebaseQuestion(repoId, 'How do I delete a repository?');
    assert(
      timeoutFaqAnswer.isFaqFallback === true &&
        timeoutFaqAnswer.answer.includes('Delete Repository'),
      'Fallback 4: Predefined FAQ answer returned for "How do I delete a repository?"'
    );

    // Scenario E: Gemini Timeout with UNMATCHED code question
    let codeTimeoutCaught = false;
    try {
      await answerCodebaseQuestion(repoId, 'How does the ping endpoint respond?');
    } catch (err) {
      codeTimeoutCaught = err.statusCode === 504 || err.code === 'GEMINI_TIMEOUT';
    }
    assert(
      codeTimeoutCaught,
      'Fallback 5: Gemini timeout on unmatched code question reports clean 504 error'
    );

    geminiService.resetMockClient();

    // =========================================================================
    // Part 4: Repository Deletion & Safe Cascading Cleanup
    // =========================================================================
    console.log('\n[SECTION 4] Repository Deletion & Cascading Storage Cleanup');

    const repoDoc = await Repository.findById(repoId);
    const storageDir = getRepoStorageDir(repoDoc.storageKey);

    assert(Boolean(repoDoc), 'Delete 1: Repository document exists in MongoDB before deletion');
    assert(fs.existsSync(storageDir), 'Delete 2: Repository extracted directory exists on disk');

    // Test 4.1: Invalid ID format returns 400
    const invalidIdRes = await fetch(`${API_BASE}/repositories/not-a-valid-hex-id`, {
      method: 'DELETE',
    });
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 && !invalidIdData.success,
      'Delete 3: Invalid repository ID format rejected with HTTP 400'
    );

    // Test 4.2: Non-existent repository returns 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(`${API_BASE}/repositories/${fakeId}`, {
      method: 'DELETE',
    });
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && !notFoundData.success,
      'Delete 4: Non-existent repository ID returns HTTP 404'
    );

    // Test 4.3: Valid deletion of repoId
    const delRes = await fetch(`${API_BASE}/repositories/${repoId}`, {
      method: 'DELETE',
    });
    const delData = await delRes.json();
    assert(
      delRes.status === 200 && delData.success && delData.data.id === repoId,
      'Delete 5: DELETE /api/repositories/:id returns HTTP 200 success response'
    );

    // Verify Repository document is deleted
    const postRepo = await Repository.findById(repoId);
    assert(postRepo === null, 'Delete 6: Repository document permanently removed from MongoDB');

    // Verify AnalysisResult document is deleted
    const postAnalysis = await AnalysisResult.findOne({ repositoryId: repoId });
    assert(postAnalysis === null, 'Delete 7: Associated AnalysisResult record permanently purged');

    // Verify OnboardingGuide document is deleted
    const postGuide = await OnboardingGuide.findOne({ repositoryId: repoId });
    assert(postGuide === null, 'Delete 8: Associated OnboardingGuide record permanently purged');

    // Verify disk directory is removed
    const postDirExists = fs.existsSync(storageDir);
    assert(!postDirExists, 'Delete 9: Extracted files and directory safely deleted from disk');

    // Verify subsequent GET returns 404
    const getDeletedRes = await fetch(`${API_BASE}/repositories/${repoId}`);
    assert(
      getDeletedRes.status === 404,
      'Delete 10: Subsequent GET /api/repositories/:id confirms repository no longer accessible'
    );

    console.log('\n========================================');
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`[FAIL] Unhandled test exception: ${err.message}`, err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runDeletionAndFaqTests();
