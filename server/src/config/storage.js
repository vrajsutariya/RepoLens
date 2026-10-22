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

export const cleanupDirectory = async (dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`[Storage] Failed to cleanup directory ${dirPath}:`, error.message);
  }
};
