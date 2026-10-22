import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for persisting extracted repositories
export const STORAGE_ROOT = path.resolve(__dirname, '../../storage/repositories');
export const UPLOADS_ROOT = path.resolve(__dirname, '../../storage/uploads');

// Ensure root storage directories exist
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

export const getRepoStorageDir = (repoId) => {
  return path.join(STORAGE_ROOT, repoId);
};

export const getRepoExtractedDir = (repoId) => {
  return path.join(STORAGE_ROOT, repoId, 'extracted');
};

/**
 * Recursively removes read-only permissions on Windows to allow unlinking
 */
const makeWritableRecursive = async (targetPath) => {
  try {
    const stats = await fs.promises.stat(targetPath);
    if (stats.isDirectory()) {
      await fs.promises.chmod(targetPath, 0o777).catch(() => {});
      const entries = await fs.promises.readdir(targetPath);
      for (const entry of entries) {
        await makeWritableRecursive(path.join(targetPath, entry));
      }
    } else {
      await fs.promises.chmod(targetPath, 0o666).catch(() => {});
    }
  } catch {
    // Ignore permissions inspection errors
  }
};

/**
 * Safely and thoroughly deletes a directory and all nested contents.
 * Resilient against Windows read-only flags (e.g. .git packfiles) and file locks.
 *
 * @param {string} dirPath - Absolute path to target directory.
 * @returns {Promise<boolean>} True if directory no longer exists, false otherwise.
 */
export const cleanupDirectory = async (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return true;
    }

    try {
      await fs.promises.rm(dirPath, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 150,
      });
    } catch (rmErr) {
      // If access/permission error (common with Git files on Windows), remove read-only attribute and retry
      if (rmErr.code === 'EPERM' || rmErr.code === 'EACCES') {
        await makeWritableRecursive(dirPath);
        await fs.promises.rm(dirPath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 200,
        });
      } else {
        throw rmErr;
      }
    }

    return !fs.existsSync(dirPath);
  } catch (error) {
    console.warn(`[Storage] Failed to cleanup directory ${dirPath}:`, error.message);
    return false;
  }
};

/**
 * Purges ALL repository directories from STORAGE_ROOT and temporary files from UPLOADS_ROOT.
 *
 * @returns {Promise<number>} Count of directories removed.
 */
export const cleanupAllRepositoriesStorage = async () => {
  let cleanedCount = 0;
  try {
    if (fs.existsSync(STORAGE_ROOT)) {
      const entries = await fs.promises.readdir(STORAGE_ROOT, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(STORAGE_ROOT, entry.name);
        const removed = await cleanupDirectory(fullPath);
        if (removed) cleanedCount++;
      }
    }

    if (fs.existsSync(UPLOADS_ROOT)) {
      const uploadFiles = await fs.promises.readdir(UPLOADS_ROOT);
      for (const file of uploadFiles) {
        const filePath = path.join(UPLOADS_ROOT, file);
        await fs.promises.unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.warn('[Storage] Error during complete storage cleanup:', error.message);
  }
  return cleanedCount;
};

/**
 * Cleans up orphaned directories on disk that do not correspond to any active repository in MongoDB.
 *
 * @param {Set<string>} validStorageKeys - Set of known valid repository storage keys.
 * @returns {Promise<number>} Count of orphaned directories removed.
 */
export const cleanupOrphanedStorage = async (validStorageKeys = new Set()) => {
  let cleanedCount = 0;
  try {
    if (!fs.existsSync(STORAGE_ROOT)) return 0;
    const entries = await fs.promises.readdir(STORAGE_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !validStorageKeys.has(entry.name)) {
        const fullPath = path.join(STORAGE_ROOT, entry.name);
        const removed = await cleanupDirectory(fullPath);
        if (removed) cleanedCount++;
      }
    }
  } catch (error) {
    console.warn('[Storage] Error cleaning orphaned storage directories:', error.message);
  }
  return cleanedCount;
};
