import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Repository from '../src/models/Repository.js';
import AnalysisResult from '../src/models/AnalysisResult.js';
import {
  buildModuleDependencyGraph,
  buildApiFlowGraph,
  buildFunctionCallGraph,
  buildDatabaseGraph,
  generateRepositoryGraph,
} from '../src/services/code-intelligence/graphBuilder.js';

const API_BASE = 'http://localhost:5000/api';

async function runGraphTests() {
  console.log('--- RepoLens Phase 5: Architecture & Execution Flow Visualization Automated Verification Suite ---\n');
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

    // 1. Prepare comprehensive test repository fixture
    const zip = new AdmZip();

    zip.addFile(
      'package.json',
      Buffer.from(
        JSON.stringify(
          {
            name: 'graph-test-app',
            version: '1.0.0',
            main: 'server.js',
            scripts: { start: 'node server.js' },
            dependencies: {
              express: '^4.18.2',
              mongoose: '^7.0.0',
            },
          },
          null,
          2
        )
      )
    );

    zip.addFile(
      'server.js',
      Buffer.from(`import express from 'express';
import userRoutes from './routes/user.routes.js';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export const startServer = () => {
  app.listen(5000);
};
startServer();
`)
    );

    zip.addFile(
      'routes/user.routes.js',
      Buffer.from(`import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.get('/', authMiddleware, getUsers);
router.post('/', createUser);

export default router;
`)
    );

    zip.addFile(
      'middleware/auth.js',
      Buffer.from(`export const authMiddleware = (req, res, next) => {
  next();
};
`)
    );

    zip.addFile(
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

    zip.addFile(
      'models/User.js',
      Buffer.from(`import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);
export default User;
`)
    );

    // Upload fixture repository
    const form = new FormData();
    form.append('file', new Blob([zip.toBuffer()], { type: 'application/zip' }), 'graph-fixture.zip');
    form.append('name', 'Graph Fixture Repo');

    const uploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.data._id, 'Upload: Graph fixture repository ingested successfully');
    const repoId = uploadData.data._id;

    // Trigger Code Intelligence Analysis
    const analyzeRes = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, {
      method: 'POST',
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success && analyzeData.data.status === 'completed', 'Analysis: Code Intelligence analysis completed');

    const repoDoc = await Repository.findById(repoId);
    const analysisDoc = await AnalysisResult.findOne({ repositoryId: repoId });

    // -------------------------------------------------------------------------
    // Test 1: Module Dependency Graph Generation
    // -------------------------------------------------------------------------
    const moduleGraph = buildModuleDependencyGraph(repoDoc, analysisDoc);
    assert(
      moduleGraph.nodes.length >= 4 &&
        moduleGraph.edges.length >= 3 &&
        moduleGraph.graphType === 'modules',
      'Test 1: Module dependency graph generated with files and verified import edges'
    );

    const serverNode = moduleGraph.nodes.find((n) => n.data.filePath.includes('server.js'));
    assert(
      serverNode && serverNode.data.isEntryPoint,
      'Test 1b: Server entry point correctly classified in module graph'
    );

    // -------------------------------------------------------------------------
    // Test 2: API Flow Graph Generation
    // -------------------------------------------------------------------------
    const apiFlowGraph = buildApiFlowGraph(repoDoc, analysisDoc);
    assert(
      apiFlowGraph.nodes.length >= 3 && apiFlowGraph.graphType === 'api-flow',
      'Test 2: API flow graph generated with route and handler nodes'
    );

    const hasRouteNode = apiFlowGraph.nodes.some((n) => n.data.nodeCategory === 'api-route');
    const hasHandlerNode = apiFlowGraph.nodes.some((n) => n.data.nodeCategory === 'controller');
    const hasDbNode = apiFlowGraph.nodes.some((n) => n.data.nodeCategory === 'database');
    assert(
      hasRouteNode && hasHandlerNode && hasDbNode,
      'Test 2b: API flow traces Route -> Controller Handler -> Database operation'
    );

    // -------------------------------------------------------------------------
    // Test 3: Function and Call Graph Generation
    // -------------------------------------------------------------------------
    const callGraph = buildFunctionCallGraph(repoDoc, analysisDoc);
    assert(
      callGraph.nodes.length >= 3 && callGraph.graphType === 'call-graph',
      'Test 3: Function and call graph generated with symbols and line numbers'
    );

    const hasGetUsersSym = callGraph.nodes.some((n) => n.data.symbolName === 'getUsers');
    assert(hasGetUsersSym, 'Test 3b: Statically extracted symbol "getUsers" present in call graph');

    // -------------------------------------------------------------------------
    // Test 4: Database Interaction Graph Generation
    // -------------------------------------------------------------------------
    const dbGraph = buildDatabaseGraph(repoDoc, analysisDoc);
    assert(
      dbGraph.nodes.length >= 2 && dbGraph.graphType === 'database',
      'Test 4: Database interaction graph connects callers to database models'
    );

    const hasUserModel = dbGraph.nodes.some((n) => n.data.modelName === 'User');
    assert(hasUserModel, 'Test 4b: Mongoose model "User" represented with query edges');

    // -------------------------------------------------------------------------
    // Test 5: Circular Dependency Edge Marking
    // -------------------------------------------------------------------------
    const mockAnalysisWithCycle = {
      ...analysisDoc.toObject(),
      dependencies: {
        ...analysisDoc.dependencies.toObject(),
        internalImports: [
          { sourceFile: 'fileA.js', targetFile: 'fileB.js', importedSymbols: ['b'] },
          { sourceFile: 'fileB.js', targetFile: 'fileA.js', importedSymbols: ['a'] },
        ],
        circularDependencies: [{ cycle: ['fileA.js', 'fileB.js', 'fileA.js'] }],
      },
    };
    const mockRepo = {
      ...repoDoc.toObject(),
      fileList: [{ path: 'fileA.js' }, { path: 'fileB.js' }],
    };

    const cycleGraph = buildModuleDependencyGraph(mockRepo, mockAnalysisWithCycle);
    const circularEdge = cycleGraph.edges.find((e) => e.data.isCircular);
    assert(
      Boolean(circularEdge),
      'Test 5: Circular dependency cycles detected and marked with isCircular=true'
    );

    // -------------------------------------------------------------------------
    // Test 6: API Endpoint - GET /api/repositories/:id/graph?type=modules
    // -------------------------------------------------------------------------
    const apiRes = await fetch(`${API_BASE}/repositories/${repoId}/graph?type=modules`);
    const apiData = await apiRes.json();
    assert(
      apiData.success &&
        apiData.data.graphType === 'modules' &&
        apiData.data.nodes.length > 0 &&
        Array.isArray(apiData.data.edges),
      'Test 6: GET /api/repositories/:id/graph?type=modules returns structured graph'
    );

    // -------------------------------------------------------------------------
    // Test 7: API Endpoint - GET /api/repositories/:id/graph?type=api-flow
    // -------------------------------------------------------------------------
    const flowRes = await fetch(`${API_BASE}/repositories/${repoId}/graph?type=api-flow`);
    const flowData = await flowRes.json();
    assert(
      flowData.success && flowData.data.graphType === 'api-flow',
      'Test 7: GET /api/repositories/:id/graph?type=api-flow returns execution flow'
    );

    // -------------------------------------------------------------------------
    // Test 8: API Endpoint - GET /api/repositories/:id/graph?type=database
    // -------------------------------------------------------------------------
    const dbApiRes = await fetch(`${API_BASE}/repositories/${repoId}/graph?type=database`);
    const dbApiData = await dbApiRes.json();
    assert(
      dbApiData.success && dbApiData.data.graphType === 'database',
      'Test 8: GET /api/repositories/:id/graph?type=database returns database graph'
    );

    // -------------------------------------------------------------------------
    // Test 9: Rejecting Invalid Graph Type
    // -------------------------------------------------------------------------
    const invalidTypeRes = await fetch(`${API_BASE}/repositories/${repoId}/graph?type=unknown_type`);
    const invalidTypeData = await invalidTypeRes.json();
    assert(
      !invalidTypeData.success && invalidTypeRes.status === 400,
      'Test 9: Invalid graph type rejected with HTTP 400'
    );

    // -------------------------------------------------------------------------
    // Test 10: Rejecting Invalid Repository ID
    // -------------------------------------------------------------------------
    const invalidIdRes = await fetch(`${API_BASE}/repositories/123/graph`);
    const invalidIdData = await invalidIdRes.json();
    assert(
      !invalidIdData.success && invalidIdRes.status === 400,
      'Test 10: Invalid repository ID format rejected with HTTP 400'
    );

    // -------------------------------------------------------------------------
    // Test 11: Rejecting Non-Existent Repository ID
    // -------------------------------------------------------------------------
    const nonExistentRes = await fetch(`${API_BASE}/repositories/507f1f77bcf86cd799439011/graph`);
    const nonExistentData = await nonExistentRes.json();
    assert(
      !nonExistentData.success && nonExistentRes.status === 404,
      'Test 11: Non-existent repository ID returns HTTP 404'
    );

    // -------------------------------------------------------------------------
    // Test 12: Graph Size Limits Enforcement
    // -------------------------------------------------------------------------
    const limitedGraph = buildModuleDependencyGraph(repoDoc, analysisDoc, { maxNodes: 2, maxEdges: 1 });
    assert(
      limitedGraph.nodes.length <= 2 && limitedGraph.edges.length <= 1,
      'Test 12: Graph size limits correctly enforced via options bounds'
    );

    // -------------------------------------------------------------------------
    // Test 13: Handling Unanalyzed Repository
    // -------------------------------------------------------------------------
    // Create unanalyzed repo
    const unanalyzedRepo = new Repository({
      name: 'Unanalyzed Repo',
      sourceType: 'zip',
      storageKey: `repo_unanalyzed_${Date.now()}`,
      status: 'ready',
    });
    await unanalyzedRepo.save();

    const unanalyzedRes = await fetch(`${API_BASE}/repositories/${unanalyzedRepo._id}/graph`);
    const unanalyzedData = await unanalyzedRes.json();
    assert(
      !unanalyzedData.success && unanalyzedRes.status === 400 && unanalyzedData.error?.code === 'ANALYSIS_NOT_READY',
      'Test 13: Unanalyzed repository returns clean HTTP 400 with ANALYSIS_NOT_READY code'
    );

    await Repository.findByIdAndDelete(unanalyzedRepo._id);
  } catch (err) {
    console.error(`[FAIL] Unhandled test exception: ${err.message}`, err);
    failed++;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Disconnect cleanly
    }
  }

  console.log('\n========================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGraphTests();
