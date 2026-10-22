import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- RepoLens Phase 2 Automated Verification Suite ---\n');
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
    // 1. Health check
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json();
    assert(health.success && health.data.services.database === 'connected', 'Health check: API online & MongoDB connected');

    // 2. Reject non-zip upload
    const invalidForm = new FormData();
    invalidForm.append('file', new Blob(['console.log("malicious")'], { type: 'text/javascript' }), 'script.js');
    const invalidUploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: invalidForm,
    });
    const invalidUploadData = await invalidUploadRes.json();
    assert(!invalidUploadData.success && invalidUploadRes.status === 400, 'Security: Non-zip upload rejected (HTTP 400)');

    // 3. Reject ZIP with Zip Slip path traversal attempt
    const slipZip = new AdmZip();
    slipZip.addFile('valid.js', Buffer.from('console.log("hello");'));
    slipZip.addFile('evil.txt', Buffer.from('root:x:0:0:...'));
    // Manually set raw entry name to simulate an attacker's crafted ZIP Slip archive
    slipZip.getEntries()[1].entryName = '../../etc/passwd';
    const slipBuffer = slipZip.toBuffer();

    const slipForm = new FormData();
    slipForm.append('file', new Blob([slipBuffer], { type: 'application/zip' }), 'slip.zip');
    const slipRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: slipForm,
    });
    const slipData = await slipRes.json();
    assert(!slipData.success, 'Security: ZIP Slip path traversal attack detected and blocked');

    // 4. Valid ZIP upload
    const validZip = new AdmZip();
    validZip.addFile('src/index.js', Buffer.from('// Sample entry\nconst app = require("express")();\napp.listen(3000);\n'));
    validZip.addFile('src/utils/math.js', Buffer.from('export const add = (a, b) => a + b;\n'));
    validZip.addFile('styles/main.css', Buffer.from('body { margin: 0; background: #000; }\n'));
    validZip.addFile('package.json', Buffer.from('{\n  "name": "sample-repo",\n  "version": "1.0.0"\n}\n'));
    validZip.addFile('README.md', Buffer.from('# Sample Repository\nTesting RepoLens ingestion.\n'));
    const validBuffer = validZip.toBuffer();

    const validForm = new FormData();
    validForm.append('file', new Blob([validBuffer], { type: 'application/zip' }), 'sample-project.zip');
    validForm.append('name', 'Sample Test Repo');

    const validUploadRes = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: validForm,
    });
    const validUploadData = await validUploadRes.json();
    assert(validUploadData.success && validUploadData.data.totalFiles === 5, 'Ingestion: Valid ZIP upload extracted and indexed 5 files');
    assert(validUploadData.data.detectedLanguages.length > 0, 'Language Detection: Languages detected from file extensions');

    const repoId = validUploadData.data._id;

    // 5. Retrieve repository by ID
    const getRepoRes = await fetch(`${API_BASE}/repositories/${repoId}`);
    const getRepoData = await getRepoRes.json();
    assert(getRepoData.success && getRepoData.data.name === 'Sample Test Repo', 'Metadata: GET /api/repositories/:id returns correct repo');

    // 6. Retrieve file tree
    const treeRes = await fetch(`${API_BASE}/repositories/${repoId}/tree`);
    const treeData = await treeRes.json();
    assert(treeData.success && treeData.data.fileTree !== null, 'Tree: GET /api/repositories/:id/tree returns navigable tree');

    // 7. Retrieve file content
    const fileRes = await fetch(`${API_BASE}/repositories/${repoId}/file?path=src/index.js`);
    const fileData = await fileRes.json();
    assert(fileData.success && fileData.data.content.includes('const app = require'), 'Content: GET /api/repositories/:id/file returns file text');
    assert(fileData.data.lineCount === 4, 'Line Count: Correct line count calculated for text file');

    // 8. Reject Path Traversal on file reading
    const traversalRes = await fetch(`${API_BASE}/repositories/${repoId}/file?path=../../server.js`);
    const traversalData = await traversalRes.json();
    assert(!traversalData.success && traversalRes.status === 403, 'Security: File path traversal attack blocked with HTTP 403 Forbidden');

    // 9. SSRF Defense on Git URL
    const ssrfRes = await fetch(`${API_BASE}/repositories/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://localhost/attacker/repo' }),
    });
    const ssrfData = await ssrfRes.json();
    assert(!ssrfData.success, 'Security: SSRF attempt to localhost blocked');

    // 10. Unsupported protocol on Git URL
    const protoRes = await fetch(`${API_BASE}/repositories/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'git://github.com/expressjs/express.git' }),
    });
    const protoData = await protoRes.json();
    assert(!protoData.success, 'Security: Non-HTTPS protocol rejected');

    // 11. Public GitHub Clone Test (using tiny official GitHub test repo)
    console.log('\n[INFO] Testing public Git repository import (https://github.com/octocat/Hello-World)...');
    const gitRes = await fetch(`${API_BASE}/repositories/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com/octocat/Hello-World' }),
    });
    const gitData = await gitRes.json();
    assert(gitData.success && gitData.data.sourceType === 'git', 'Git Import: Public GitHub repository cloned & indexed successfully');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
