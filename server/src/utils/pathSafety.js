import path from 'path';

/**
 * Ensures that a candidate target path strictly resides inside a trusted base directory.
 * Throws an error or returns false if directory traversal is detected (e.g., ZIP Slip or ../).
 *
 * @param {string} baseDir - Trusted parent directory (absolute path).
 * @param {string} relativeOrTargetPath - Candidate relative or entry path.
 * @returns {string} Sanitized absolute path.
 */
export const assertSafePath = (baseDir, relativeOrTargetPath) => {
  const normalizedBase = path.resolve(baseDir);
  // Normalize candidate path
  const resolvedTarget = path.resolve(normalizedBase, relativeOrTargetPath);

  // Must strictly start with base directory followed by path separator or be base directory itself
  if (resolvedTarget !== normalizedBase && !resolvedTarget.startsWith(normalizedBase + path.sep)) {
    throw new Error(`Path traversal attempt detected: ${relativeOrTargetPath}`);
  }

  return resolvedTarget;
};

/**
 * Checks if a filename or buffer represents a binary file.
 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svgz',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.iso', '.img',
  '.wasm', '.class', '.pyc', '.pyo',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.lock', '.sqlite', '.db'
]);

export const isBinaryFile = (fileName, buffer = null) => {
  const ext = path.extname(fileName).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // If a buffer is available, check for NULL bytes (standard heuristic for binary files)
  if (buffer && Buffer.isBuffer(buffer)) {
    const checkLength = Math.min(buffer.length, 1024);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
  }

  return false;
};
