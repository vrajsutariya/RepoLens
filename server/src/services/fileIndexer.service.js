import fs from 'fs';
import path from 'path';
import { isBinaryFile } from '../utils/pathSafety.js';
import { detectLanguage, calculateLanguageBreakdown } from '../utils/languageDetector.js';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.cache',
  'vendor',
  '.vscode',
  '.idea',
  'coverage',
  '.turbo',
]);

const IGNORED_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
  'npm-debug.log',
  'yarn-error.log',
]);

const MAX_INDEXABLE_FILES = 5000;

/**
 * Recursively scans an extracted repository directory, builds a file index and hierarchical tree.
 *
 * @param {string} rootDir - Root directory containing the extracted codebase.
 * @returns {Promise<{ fileTree: object, fileList: Array, totalFiles: number, totalSize: number, detectedLanguages: Array }>}
 */
export const indexRepositoryFiles = async (rootDir) => {
  const fileList = [];
  let totalSize = 0;

  // Hierarchical root node
  const rootNode = {
    name: path.basename(rootDir),
    path: '',
    type: 'directory',
    children: [],
  };

  const walkDir = async (currentDir, relativePath, parentNode) => {
    if (fileList.length >= MAX_INDEXABLE_FILES) {
      return;
    }

    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    // Sort entries: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    for (const entry of entries) {
      if (fileList.length >= MAX_INDEXABLE_FILES) break;

      const fullPath = path.join(currentDir, entry.name);
      const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const lowerName = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(lowerName)) {
          continue;
        }

        const dirNode = {
          name: entry.name,
          path: entryRelPath,
          type: 'directory',
          children: [],
        };

        parentNode.children.push(dirNode);
        await walkDir(fullPath, entryRelPath, dirNode);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(lowerName)) {
          continue;
        }

        try {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size;

          const isBinary = isBinaryFile(entry.name);
          const language = detectLanguage(entry.name);

          const fileInfo = {
            path: entryRelPath,
            name: entry.name,
            size: stats.size,
            extension: path.extname(entry.name).toLowerCase(),
            language,
            isBinary,
          };

          fileList.push(fileInfo);

          parentNode.children.push({
            ...fileInfo,
            type: 'file',
          });
        } catch (fileErr) {
          console.warn(`[FileIndexer] Could not stat file ${entryRelPath}:`, fileErr.message);
        }
      }
    }
  };

  await walkDir(rootDir, '', rootNode);

  // If the extracted archive had a single top-level directory (e.g. repo-main/...), unnest it for cleaner UX
  let effectiveTree = rootNode;
  if (rootNode.children.length === 1 && rootNode.children[0].type === 'directory') {
    effectiveTree = rootNode.children[0];
  }

  const detectedLanguages = calculateLanguageBreakdown(fileList);

  return {
    fileTree: effectiveTree,
    fileList,
    totalFiles: fileList.length,
    totalSize,
    detectedLanguages,
  };
};
