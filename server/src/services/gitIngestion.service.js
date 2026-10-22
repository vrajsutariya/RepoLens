import dns from 'dns';
import path from 'path';
import { spawn } from 'child_process';
import { getRepoStorageDir, getRepoExtractedDir, cleanupDirectory } from '../config/storage.js';
import { indexRepositoryFiles } from './fileIndexer.service.js';
import { analyzeRepository } from './code-intelligence/repositoryAnalyzer.js';
import Repository from '../models/Repository.js';

const ALLOWED_GIT_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'gitlab.com',
  'www.gitlab.com',
  'bitbucket.org',
  'www.bitbucket.org',
]);

const CLONE_TIMEOUT_MS = 45000; // 45 seconds max clone timeout

/**
 * Checks whether an IP address belongs to private, loopback, or metadata networks (SSRF defense).
 */
const isPrivateOrReservedIP = (ip) => {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-Local & Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 checks
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd')) return true;
  }

  return false;
};

/**
 * Validates, normalizes, and SSRF-checks a public Git repository URL.
 */
export const validateGitUrl = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Git repository URL is required.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format. Please provide a valid HTTPS repository URL.');
  }

  // 1. Enforce HTTPS protocol
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only secure HTTPS Git repository URLs are supported (e.g., https://github.com/owner/repo).');
  }

  // 2. Reject embedded credentials
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Repository URLs containing credentials or tokens are rejected for security.');
  }

  // 3. Enforce approved Git hosting domains
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_GIT_HOSTS.has(hostname)) {
    throw new Error(
      `Unsupported Git host: "${hostname}". Currently supported providers: GitHub, GitLab, and Bitbucket.`
    );
  }

  // 4. Validate repository path structure (e.g., /owner/repo)
  const pathSegments = parsedUrl.pathname.replace(/^\/|\/$/g, '').split('/');
  if (pathSegments.length < 2 || !pathSegments[0] || !pathSegments[1]) {
    throw new Error('URL must point to a specific repository (e.g., https://github.com/owner/repo).');
  }

  // 5. SSRF Defense: DNS resolution & destination validation
  let lookupResult;
  try {
    lookupResult = await dns.promises.lookup(hostname, { all: true });
  } catch (dnsErr) {
    throw new Error(`Failed to resolve repository host "${hostname}": ${dnsErr.message}`);
  }

  for (const record of lookupResult) {
    if (isPrivateOrReservedIP(record.address)) {
      throw new Error(`Security violation: Host "${hostname}" resolves to a restricted network address.`);
    }
  }

  // Strip trailing .git for canonical naming, but keep full clone URL
  let cleanRepoName = pathSegments[1].replace(/\.git$/i, '');
  // Sanitize repo name
  cleanRepoName = cleanRepoName.replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    normalizedUrl: parsedUrl.origin + parsedUrl.pathname,
    repoName: cleanRepoName,
  };
};

/**
 * Clones a public Git repository into isolated storage, indexes its contents, and persists metadata.
 *
 * @param {string} gitUrl - Public Git repository HTTPS URL.
 * @returns {Promise<object>} Persisted repository document.
 */
export const processGitImport = async (gitUrl) => {
  const { normalizedUrl, repoName } = await validateGitUrl(gitUrl);

  const repoStorageKey = `repo_git_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const repoDir = getRepoStorageDir(repoStorageKey);
  const extractedDir = getRepoExtractedDir(repoStorageKey);

  try {
    // Execute git clone safely using child_process.spawn with NO shell
    await new Promise((resolve, reject) => {
      const gitArgs = [
        'clone',
        '--depth',
        '1',
        '--single-branch',
        '--no-tags',
        normalizedUrl,
        extractedDir,
      ];

      const child = spawn('git', gitArgs, {
        shell: false,
        timeout: CLONE_TIMEOUT_MS,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '',
        },
      });

      let stderrOutput = '';

      child.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start git process: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Parse common Git errors to provide developer-friendly feedback
          let userMessage = 'Failed to clone repository.';
          if (stderrOutput.includes('Repository not found') || stderrOutput.includes('not found')) {
            userMessage = 'Repository not found. Please ensure the repository is public and the URL is correct.';
          } else if (stderrOutput.includes('timed out') || stderrOutput.includes('timeout')) {
            userMessage = 'Git clone operation timed out. The repository may be too large or network is slow.';
          } else if (stderrOutput.includes('Authentication failed') || stderrOutput.includes('could not read Username')) {
            userMessage = 'Repository requires authentication or is private. Only public repositories are supported.';
          } else if (stderrOutput) {
            userMessage = `Git clone error: ${stderrOutput.trim().split('\n').pop()}`;
          }
          reject(new Error(userMessage));
        }
      });
    });

    // Index extracted files
    const indexResult = await indexRepositoryFiles(extractedDir);

    if (indexResult.totalFiles === 0) {
      throw new Error('No valid, indexable source files found in the cloned repository.');
    }

    // Persist repository in MongoDB
    const repository = new Repository({
      name: repoName,
      sourceType: 'git',
      sourceUrl: normalizedUrl,
      status: 'ready',
      storageKey: repoStorageKey,
      totalFiles: indexResult.totalFiles,
      totalSize: indexResult.totalSize,
      detectedLanguages: indexResult.detectedLanguages,
      fileTree: indexResult.fileTree,
      fileList: indexResult.fileList,
    });

    await repository.save();

    // Automatically execute Code Intelligence analysis
    try {
      await analyzeRepository(repository._id);
    } catch (analysisErr) {
      console.warn(`[GitIngestion] Initial analysis warning: ${analysisErr.message}`);
    }

    return repository;
  } catch (error) {
    // Always clean up on failure
    await cleanupDirectory(repoDir);
    throw error;
  }
};
