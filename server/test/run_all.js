import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  try {
    await runTestFile('ingestion.test.js');
    await runTestFile('analysis.test.js');
    await runTestFile('qa.test.js');
    console.log('\n[SUCCESS] All RepoLens test suites passed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n[ERROR] ${err.message}`);
    process.exit(1);
  }
}

main();
