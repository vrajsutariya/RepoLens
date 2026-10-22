import AdmZip from 'adm-zip';

const API_BASE = 'http://localhost:5000/api';

async function runAnalysisTests() {
  console.log('--- RepoLens Phase 3: Code Intelligence Engine Verification ---\n');
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
    // 1. Prepare comprehensive test fixture project
    const zip = new AdmZip();

    // Manifest
    zip.addFile(
      'package.json',
      Buffer.from(
        JSON.stringify(
          {
            name: 'fullstack-fixture-app',
            version: '1.0.0',
            main: 'server.js',
            scripts: {
              start: 'node server.js',
              dev: 'nodemon server.js',
            },
            dependencies: {
              express: '^4.18.2',
              mongoose: '^7.0.0',
              react: '^18.2.0',
              'react-dom': '^18.2.0',
            },
            devDependencies: {
              vite: '^4.0.0',
              typescript: '^5.0.0',
            },
          },
          null,
          2
        )
      )
    );

    // Server entry point
    zip.addFile(
      'server.js',
      Buffer.from(`import express from 'express';
import mongoose from 'mongoose';
import userRoutes from './routes/user.routes.js';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export const startServer = () => {
  app.listen(3000);
};
startServer();
`)
    );

    // Express router
    zip.addFile(
      'routes/user.routes.js',
      Buffer.from(`import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller.js';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', (req, res) => {
  res.status(204).end();
});

export default router;
`)
    );

    // Controller
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

    // Mongoose Model
    zip.addFile(
      'models/User.js',
      Buffer.from(`import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);
export default User;
`)
    );

    // React Frontend Component
    zip.addFile(
      'src/App.jsx',
      Buffer.from(`import { useState } from 'react';
import './styles.css';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <h1>RepoLens Test</h1>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  );
}
`)
    );

    // CSS file
    zip.addFile(
      'src/styles.css',
      Buffer.from(`body { margin: 0; background: #0D0D0F; color: #fff; }\n`)
    );

    // TypeScript Class & Method
    zip.addFile(
      'utils/calculator.ts',
      Buffer.from(`export class Calculator {
  private baseValue: number;

  constructor(initial: number = 0) {
    this.baseValue = initial;
  }

  public add(a: number, b: number): number {
    return this.baseValue + a + b;
  }

  public multiply(x: number, y: number): number {
    return x * y;
  }
}
`)
    );

    // Python File
    zip.addFile(
      'scripts/helper.py',
      Buffer.from(`def calculate_metric(data):
    return sum(data)

class MetricAggregator:
    def process(self):
        pass
`)
    );

    const fixtureBuffer = zip.toBuffer();

    // 2. Upload and trigger automated analysis
    const form = new FormData();
    form.append('file', new Blob([fixtureBuffer], { type: 'application/zip' }), 'fullstack-fixture.zip');
    form.append('name', 'Code Intelligence Fixture');

    const uploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success, 'Upload: Fixture repository uploaded successfully');
    const repoId = uploadData.data._id;

    // 3. Retrieve analysis results
    const analysisRes = await fetch(`${API_BASE}/repositories/${repoId}/analysis`);
    const analysisData = await analysisRes.json();
    assert(analysisData.success && analysisData.data.status === 'completed', 'Pipeline: Code Intelligence analysis status is completed');
    const analysis = analysisData.data;

    // 4. Framework Detection Verification
    const frameworkNames = analysis.frameworks.map((f) => f.name);
    assert(frameworkNames.includes('Express.js'), 'Framework: Express.js detected from dependencies');
    assert(frameworkNames.includes('React'), 'Framework: React detected from dependencies');
    assert(frameworkNames.includes('Mongoose (MongoDB)'), 'Framework: Mongoose detected from dependencies');

    // 5. Entry Point Verification
    const entryPointPaths = analysis.entryPoints.map((e) => e.path);
    assert(entryPointPaths.some((p) => p.endsWith('server.js')), 'Entry Point: server.js detected as application-server');
    assert(entryPointPaths.some((p) => p.endsWith('package.json')), 'Entry Point: package.json startup script recognized');

    // 6. AST Symbol Extraction Verification
    const symbolNames = analysis.symbols.map((s) => s.name);
    assert(symbolNames.includes('getUsers'), 'Symbols: AST extracted exported async arrow function "getUsers"');
    assert(symbolNames.includes('createUser'), 'Symbols: AST extracted exported async arrow function "createUser"');
    assert(symbolNames.includes('App'), 'Symbols: AST extracted React component function "App"');
    assert(symbolNames.includes('Calculator'), 'Symbols: AST extracted TypeScript class "Calculator"');
    assert(symbolNames.includes('Calculator.add'), 'Symbols: AST extracted class method "Calculator.add"');
    assert(symbolNames.includes('calculate_metric'), 'Symbols: Heuristic extracted Python function "calculate_metric"');
    assert(symbolNames.includes('MetricAggregator'), 'Symbols: Heuristic extracted Python class "MetricAggregator"');

    // Check symbol lines
    const getUsersSym = analysis.symbols.find((s) => s.name === 'getUsers');
    assert(getUsersSym && getUsersSym.startLine > 0 && getUsersSym.endLine >= getUsersSym.startLine, 'Symbols: Line ranges recorded accurately');

    // 7. Express API Endpoints Verification
    const endpoints = analysis.apiEndpoints;
    assert(endpoints.some((e) => e.method === 'GET' && e.path.includes('/health')), 'API Analyzer: app.get("/health") detected');
    assert(endpoints.some((e) => e.method === 'GET' && e.handlerName === 'getUsers'), 'API Analyzer: router.get("/", getUsers) detected with handler');
    assert(endpoints.some((e) => e.method === 'POST' && e.handlerName === 'createUser'), 'API Analyzer: router.post("/", createUser) detected with handler');

    // 8. Database Interaction Verification
    const dbInteractions = analysis.databaseInteractions;
    assert(dbInteractions.some((d) => d.modelName === 'User' && d.operationType === 'define-schema'), 'Database: Mongoose Schema definition detected');
    assert(dbInteractions.some((d) => d.modelName === 'User' && d.operationType === 'define-model'), 'Database: Mongoose Model definition detected');
    assert(dbInteractions.some((d) => d.modelName === 'User' && d.operationType === 'query'), 'Database: User.find() query operation detected');
    assert(dbInteractions.some((d) => d.modelName === 'User' && d.operationType === 'create'), 'Database: User.create() mutation operation detected');

    // 9. Dependency Relationships Verification
    const deps = analysis.dependencies;
    assert(deps.internalImports.some((i) => i.targetFile.includes('user.routes.js')), 'Dependencies: Internal file import server.js -> user.routes.js resolved');
    assert(deps.externalImports.some((e) => e.packageName === 'express'), 'Dependencies: External package import express recorded');

    // 10. Re-analysis Endpoint Test (POST /api/repositories/:id/analyze)
    const reanalyzeRes = await fetch(`${API_BASE}/repositories/${repoId}/analyze`, { method: 'POST' });
    const reanalyzeData = await reanalyzeRes.json();
    assert(reanalyzeData.success && reanalyzeData.data.status === 'completed', 'Re-analysis: POST /api/repositories/:id/analyze runs idempotently');

    // 11. Symbols Filter & Pagination Endpoint Test
    const symFilterRes = await fetch(`${API_BASE}/repositories/${repoId}/symbols?query=Calc`);
    const symFilterData = await symFilterRes.json();
    assert(symFilterData.success && symFilterData.data.symbols.length > 0, 'Endpoints: GET /api/repositories/:id/symbols filters correctly');

    // 12. Structured Context for Gemini Test (GET /api/repositories/:id/context)
    const ctxRes = await fetch(`${API_BASE}/repositories/${repoId}/context`);
    const ctxData = await ctxRes.json();
    assert(ctxData.success && ctxData.data.summary.includes('[VERIFIED] Technology Stack'), 'ContextBuilder: Verified Markdown context generated for Gemini');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runAnalysisTests();
