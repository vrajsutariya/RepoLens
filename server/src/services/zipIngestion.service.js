import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { assertSafePath } from '../utils/pathSafety.js';
import { getRepoStorageDir, getRepoExtractedDir, cleanupDirectory } from '../config/storage.js';
import { indexRepositoryFiles } from './fileIndexer.service.js';
import { analyzeRepository } from './code-intelligence/repositoryAnalyzer.js';
import Repository from '../models/Repository.js';

const MAX_UNCOMPRESSED_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit
const MAX_ARCHIVE_ENTRIES = 5000;

/**
 * Validates, safely extracts a ZIP archive, indexes its code files, and persists metadata.
 *
 * @param {object} file - Uploaded multer file object.
 * @param {string} customName - Optional custom repository name.
 * @returns {Promise<object>} Persisted repository document.
 */
export const processZipUpload = async (file, customName) => {
  if (!file || !file.path) {
    throw new Error('No zip file provided for ingestion.');
  }

  const repoStorageKey = `repo_zip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const repoDir = getRepoStorageDir(repoStorageKey);
  const extractedDir = getRepoExtractedDir(repoStorageKey);

  // Derive human-readable repository name
  const repoName =
    customName ||
    path.basename(file.originalname, path.extname(file.originalname)) ||
    'Uploaded Repository';

  try {
    // 1. Verify archive readability
    let zip;
    try {
      zip = new AdmZip(file.path);
    } catch (parseErr) {
      throw new Error(`Corrupted or invalid ZIP archive: ${parseErr.message}`);
    }

    const zipEntries = zip.getEntries();
    if (!zipEntries || zipEntries.length === 0) {
      throw new Error('ZIP archive is empty.');
    }

    if (zipEntries.length > MAX_ARCHIVE_ENTRIES) {
      throw new Error(
        `Archive exceeds maximum file count limit of ${MAX_ARCHIVE_ENTRIES} entries.`
      );
    }

    // 2. Pre-scan entries for ZIP Slip and compression bomb validation
    let totalUncompressedSize = 0;
    for (const entry of zipEntries) {
      // Check entry size
      totalUncompressedSize += entry.header?.size || 0;
      if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE_BYTES) {
        throw new Error(
          `Extracted archive size exceeds maximum safety limit of ${MAX_UNCOMPRESSED_SIZE_BYTES / (1024 * 1024)}MB.`
        );
      }

      // Check for path traversal / Zip Slip attempts in entry names
      const entryName = entry.entryName.replace(/\\/g, '/');
      if (entryName.includes('../') || entryName.startsWith('/')) {
        throw new Error(`Dangerous archive entry name detected: ${entry.entryName}`);
      }

      // Test containment with assertSafePath
      assertSafePath(extractedDir, entryName);
    }

    // 3. Prepare clean extraction target directory
    await fs.promises.mkdir(extractedDir, { recursive: true });

    // 4. Safe entry extraction loop
    for (const entry of zipEntries) {
      const sanitizedRelativePath = entry.entryName.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!sanitizedRelativePath) continue;

      const targetPath = assertSafePath(extractedDir, sanitizedRelativePath);

      if (entry.isDirectory) {
        await fs.promises.mkdir(targetPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

        // Reject symbolic links if present in mode
        const mode = entry.attr >> 16;
        const isSymlink = (mode & 0o170000) === 0o120000;
        if (isSymlink) {
          console.warn(`[ZipIngestion] Skipping symbolic link entry: ${entry.entryName}`);
          continue;
        }

        // Write file safely
        const contentBuffer = entry.getData();
        await fs.promises.writeFile(targetPath, contentBuffer);
      }
    }

    // 5. Index extracted files, compute language breakdown, and build tree
    const indexResult = await indexRepositoryFiles(extractedDir);

    if (indexResult.totalFiles === 0) {
      throw new Error('No valid, indexable source files found in the archive.');
    }

    // 6. Persist repository in MongoDB
    const repository = new Repository({
      name: repoName,
      sourceType: 'zip',
      sourceUrl: null,
      status: 'ready',
      storageKey: repoStorageKey,
      totalFiles: indexResult.totalFiles,
      totalSize: indexResult.totalSize,
      detectedLanguages: indexResult.detectedLanguages,
      fileTree: indexResult.fileTree,
      fileList: indexResult.fileList,
    });

    await repository.save();

    // 7. Automatically execute Code Intelligence analysis
    try {
      await analyzeRepository(repository._id);
    } catch (analysisErr) {
      console.warn(`[ZipIngestion] Initial analysis warning: ${analysisErr.message}`);
    }

    // 8. Cleanup uploaded temp zip file
    if (fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path).catch(() => {});
    }

    return repository;
  } catch (error) {
    // Cleanup extraction folder and temporary zip file upon error
    await cleanupDirectory(repoDir);
    if (file && file.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path).catch(() => {});
    }
    throw error;
  }
};
