import path from 'path';

const COMMON_EXTENSIONS = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.json'];

/**
 * Resolves a relative import path to a real repository file path.
 */
const resolveRelativeImport = (sourceFilePath, rawImportPath, fileSet) => {
  const dir = path.dirname(sourceFilePath);
  const normalizedCandidate = path.join(dir, rawImportPath).replace(/\\/g, '/');

  // Try direct match or extension permutations
  for (const ext of COMMON_EXTENSIONS) {
    const candidateWithExt = normalizedCandidate + ext;
    if (fileSet.has(candidateWithExt)) {
      return candidateWithExt;
    }
  }

  // Try index file resolution (e.g., ./utils -> ./utils/index.js)
  for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
    const candidateIndex = `${normalizedCandidate}/index${ext}`;
    if (fileSet.has(candidateIndex)) {
      return candidateIndex;
    }
  }

  return null;
};

/**
 * Analyzes module imports, package declarations, and resolves dependencies.
 *
 * @param {Array<{ sourceFile: string, rawPath: string, importedSymbols: Array, startLine: number }>} rawImports
 * @param {Array<{ path: string }>} repositoryFiles
 * @param {object} parsedManifests
 * @returns {object} Dependencies summary
 */
export const analyzeDependencies = (rawImports, repositoryFiles, parsedManifests = {}) => {
  const fileSet = new Set(repositoryFiles.map((f) => f.path.replace(/\\/g, '/')));

  const internalImports = [];
  const externalImports = [];
  const unresolvedImports = [];
  const packageUsageMap = new Map();

  // 1. Process Raw Import Statements
  for (const imp of rawImports) {
    const raw = imp.rawPath.trim();

    // Relative import (internal module)
    if (raw.startsWith('./') || raw.startsWith('../') || raw.startsWith('/')) {
      const targetFile = resolveRelativeImport(imp.sourceFile, raw, fileSet);
      if (targetFile) {
        internalImports.push({
          sourceFile: imp.sourceFile,
          targetFile,
          importedSymbols: imp.importedSymbols,
          startLine: imp.startLine,
        });
      } else {
        unresolvedImports.push({
          sourceFile: imp.sourceFile,
          rawPath: raw,
          startLine: imp.startLine,
        });
      }
    }
    // External npm package or core module
    else {
      // Extract package root name (e.g., '@xyflow/react' -> '@xyflow/react', 'lodash/get' -> 'lodash')
      let packageName = raw;
      if (raw.startsWith('@')) {
        const parts = raw.split('/');
        packageName = parts.slice(0, 2).join('/');
      } else {
        packageName = raw.split('/')[0];
      }

      externalImports.push({
        sourceFile: imp.sourceFile,
        packageName,
        importedSymbols: imp.importedSymbols,
        startLine: imp.startLine,
      });

      packageUsageMap.set(packageName, (packageUsageMap.get(packageName) || 0) + 1);
    }
  }

  // 2. Process Declared Dependencies from package.json
  const declared = [];
  const pkg = parsedManifests['package.json'];
  if (pkg) {
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        declared.push({
          name,
          version,
          isDev: false,
          usageCount: packageUsageMap.get(name) || 0,
        });
      }
    }
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        declared.push({
          name,
          version,
          isDev: true,
          usageCount: packageUsageMap.get(name) || 0,
        });
      }
    }
  }

  return {
    declared,
    internalImports,
    externalImports,
    unresolvedImports,
  };
};
