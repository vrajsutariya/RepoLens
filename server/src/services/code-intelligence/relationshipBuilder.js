/**
 * Detects circular dependencies in an internal module import graph using DFS.
 */
export const findCircularDependencies = (internalImports) => {
  const adjacencyList = new Map();

  for (const imp of internalImports) {
    if (!adjacencyList.has(imp.sourceFile)) {
      adjacencyList.set(imp.sourceFile, new Set());
    }
    adjacencyList.get(imp.sourceFile).add(imp.targetFile);
  }

  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  const dfs = (node, path) => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = path.slice(cycleStartIndex);
          cyclePath.push(neighbor);
          cycles.push({ cycle: cyclePath });
        }
      }
    }

    recursionStack.delete(node);
  };

  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
};

/**
 * Builds normalized nodes and edges suitable for graph visualization.
 *
 * @param {Array<{ path: string, language?: string }>} repositoryFiles
 * @param {Array<{ sourceFile: string, targetFile: string, importedSymbols: Array }>} internalImports
 * @param {Array<{ file: string }>} symbols
 * @returns {{ nodes: Array, edges: Array }}
 */
export const buildRelationshipGraph = (repositoryFiles, internalImports, symbols = []) => {
  const symbolsPerFile = new Map();
  for (const s of symbols) {
    symbolsPerFile.set(s.file, (symbolsPerFile.get(s.file) || 0) + 1);
  }

  // Filter nodes to files involved in relationships or containing symbols
  const activeFilePaths = new Set();
  for (const imp of internalImports) {
    activeFilePaths.add(imp.sourceFile);
    activeFilePaths.add(imp.targetFile);
  }

  const nodes = repositoryFiles
    .filter((f) => activeFilePaths.has(f.path) || (symbolsPerFile.get(f.path) || 0) > 0)
    .slice(0, 100) // Keep graph manageable
    .map((file) => ({
      id: file.path,
      label: file.path.split('/').pop(),
      type: 'file',
      language: file.language || 'Other',
      symbolsCount: symbolsPerFile.get(file.path) || 0,
    }));

  const edges = internalImports
    .filter((imp) => activeFilePaths.has(imp.sourceFile) && activeFilePaths.has(imp.targetFile))
    .slice(0, 200)
    .map((imp) => ({
      from: imp.sourceFile,
      to: imp.targetFile,
      type: 'imports',
      symbols: imp.importedSymbols || [],
    }));

  return { nodes, edges };
};
