import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const HEALTH_URL = 'http://localhost:5000/api/health';

async function checkServerHealth() {
  try {
    const res = await fetch(HEALTH_URL);
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.success);
    }
    return false;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServerHealth()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n==================================================`);
    console.log(`Running Test: ${testFile}`);
    console.log(`==================================================`);

    const child = spawn('node', [path.join(__dirname, testFile)], {
      stdio: 'inherit',
      shell: false,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test suite ${testFile} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  let spawnedServer = null;

  try {
    const isAlreadyRunning = await checkServerHealth();
    if (isAlreadyRunning) {
      console.log('[Test Runner] RepoLens server is already running on http://localhost:5000');
    } else {
      console.log('[Test Runner] Starting background RepoLens server for test execution...');
      spawnedServer = spawn('node', ['src/server.js'], {
        cwd: serverRoot,
        stdio: 'inherit',
        shell: false,
      });

      const isReady = await waitForServer(15000);
      if (!isReady) {
        throw new Error('Timed out waiting for RepoLens server to become healthy on http://localhost:5000');
      }
      console.log('[Test Runner] RepoLens server ready and healthy.');
    }

    await runTestFile('ingestion.test.js');
    await runTestFile('analysis.test.js');
    await runTestFile('qa.test.js');
    await runTestFile('graph.test.js');
    await runTestFile('onboarding.test.js');
    await runTestFile('deletion_and_faq.test.js');

    console.log('\n==================================================');
    console.log('[SUCCESS] All RepoLens test suites passed successfully!');
    console.log('==================================================\n');

    if (spawnedServer) {
      spawnedServer.kill();
    }
    process.exit(0);
  } catch (err) {
    console.error(`\n[ERROR] ${err.message}`);
    if (spawnedServer) {
      spawnedServer.kill();
    }
    process.exit(1);
  }
}

main();
