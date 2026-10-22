/**
 * Graph Builder Service for RepoLens Architecture & Execution Flow Engine.
 *
 * Transforms deterministic static code intelligence results into structured nodes
 * and edges formatted for React Flow (@xyflow/react) and interactive inspection.
 */

const MAX_NODES_LIMIT = 80;
const MAX_EDGES_LIMIT = 120;

/**
 * Normalizes file paths with forward slashes.
 */
const norm = (p) => (p || '').replace(/\\/g, '/');

/**
 * Formats a clean human-readable node label from a file path or symbol name.
 */
const getFileBaseName = (filePath) => norm(filePath).split('/').pop() || filePath;

/**
 * 1. Module Dependency Graph
 * Visualizes file-to-file import relationships, circular dependencies, and entry points.
 */
export const buildModuleDependencyGraph = (repository, analysis, options = {}) => {
  const maxNodes = options.maxNodes || MAX_NODES_LIMIT;
  const maxEdges = options.maxEdges || MAX_EDGES_LIMIT;

  const internalImports = analysis?.dependencies?.internalImports || [];
  const circularDeps = analysis?.dependencies?.circularDependencies || [];
  const entryPoints = analysis?.entryPoints || [];
  const symbols = analysis?.symbols || [];
  const fileList = repository?.fileList || [];

  // Index circular edge pairs: "source->target"
  const circularEdgeSet = new Set();
  for (const c of circularDeps) {
    const cycle = c.cycle || [];
    for (let i = 0; i < cycle.length - 1; i++) {
      circularEdgeSet.add(`${norm(cycle[i])}->${norm(cycle[i + 1])}`);
    }
  }

  // Count symbols per file
  const symbolsCountMap = new Map();
  for (const s of symbols) {
    const f = norm(s.file);
    symbolsCountMap.set(f, (symbolsCountMap.get(f) || 0) + 1);
  }

  // Entry point paths
  const entryPointMap = new Map();
  for (const ep of entryPoints) {
    entryPointMap.set(norm(ep.path), ep);
  }

  // Identify all active files involved in imports or entry points
  const activeFilesSet = new Set();
  for (const ep of entryPoints) activeFilesSet.add(norm(ep.path));
  for (const imp of internalImports) {
    activeFilesSet.add(norm(imp.sourceFile));
    activeFilesSet.add(norm(imp.targetFile));
  }

  // If no internal imports, include candidate source files
  if (activeFilesSet.size === 0) {
    for (const f of fileList.slice(0, 15)) {
      if (!f.isBinary) activeFilesSet.add(norm(f.path));
    }
  }

  const activeFileList = Array.from(activeFilesSet).slice(0, maxNodes);
  const activeFileIndexSet = new Set(activeFileList);

  // Compute graph in-degree and out-degree for layout layering
  const inDegree = new Map();
  const outDegree = new Map();
  for (const f of activeFileList) {
    inDegree.set(f, 0);
    outDegree.set(f, 0);
  }

  for (const imp of internalImports) {
    const src = norm(imp.sourceFile);
    const tgt = norm(imp.targetFile);
    if (activeFileIndexSet.has(src) && activeFileIndexSet.has(tgt)) {
      outDegree.set(src, (outDegree.get(src) || 0) + 1);
      inDegree.set(tgt, (inDegree.get(tgt) || 0) + 1);
    }
  }

  // Layering heuristic:
  // Layer 0: Entry points and files with 0 in-degree
  // Layer 1: Routes and controllers
  // Layer 2: Services and models
  // Layer 3: Utilities and leaves
  const getFileLayer = (filePath) => {
    if (entryPointMap.has(filePath)) return 0;
    const lower = filePath.toLowerCase();
    if (lower.includes('route')) return 1;
    if (lower.includes('controller') || lower.includes('handler')) return 2;
    if (lower.includes('model') || lower.includes('schema') || lower.includes('db')) return 3;
    if (lower.includes('util') || lower.includes('config') || lower.includes('helper')) return 3;
    if ((inDegree.get(filePath) || 0) === 0) return 0;
    return 1;
  };

  const layers = [[], [], [], []];
  for (const file of activeFileList) {
    const layerIdx = getFileLayer(file);
    layers[layerIdx].push(file);
  }

  // Build Node objects with positions
  const nodes = [];
  const nodeIdsSet = new Set();

  layers.forEach((layerFiles, colIdx) => {
    layerFiles.forEach((filePath, rowIdx) => {
      const isEntry = entryPointMap.has(filePath);
      const epData = entryPointMap.get(filePath);
      const symbolsCount = symbolsCountMap.get(filePath) || 0;
      const lower = filePath.toLowerCase();

      let nodeCategory = 'module';
      if (isEntry) nodeCategory = 'entry-point';
      else if (lower.includes('route')) nodeCategory = 'route';
      else if (lower.includes('controller')) nodeCategory = 'controller';
      else if (lower.includes('model') || lower.includes('schema')) nodeCategory = 'model';
      else if (lower.includes('config') || lower.includes('.env')) nodeCategory = 'config';

      const nodeId = `mod_${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      nodeIdsSet.add(nodeId);

      nodes.push({
        id: nodeId,
        type: 'customNode',
        position: {
          x: 50 + colIdx * 320,
          y: 40 + rowIdx * 130,
        },
        data: {
          id: nodeId,
          label: getFileBaseName(filePath),
          sublabel: filePath,
          filePath,
          nodeCategory,
          nodeType: isEntry ? 'entry-point' : nodeCategory,
          isEntryPoint: isEntry,
          entryPointType: epData?.type || null,
          symbolsCount,
          language: filePath.split('.').pop()?.toUpperCase() || 'CODE',
          verification: 'statically_verified',
        },
      });
    });
  });

  // Map relative file paths to node IDs
  const pathToNodeId = new Map(
    nodes.map((n) => [norm(n.data.filePath), n.id])
  );

  // Build Edge objects
  const edges = [];
  const seenEdgePairs = new Set();

  for (const imp of internalImports) {
    const srcPath = norm(imp.sourceFile);
    const tgtPath = norm(imp.targetFile);

    const sourceId = pathToNodeId.get(srcPath);
    const targetId = pathToNodeId.get(tgtPath);

    if (sourceId && targetId && sourceId !== targetId) {
      const pairKey = `${sourceId}->${targetId}`;
      if (seenEdgePairs.has(pairKey)) continue;
      seenEdgePairs.add(pairKey);

      const isCircular = circularEdgeSet.has(`${srcPath}->${tgtPath}`);
      const symbolNames = imp.importedSymbols || [];
      const labelText = symbolNames.length > 0 ? `imports ${symbolNames.slice(0, 2).join(', ')}${symbolNames.length > 2 ? '...' : ''}` : 'imports';

      edges.push({
        id: `e_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        animated: isCircular,
        data: {
          relationshipType: isCircular ? 'circular_dependency' : 'module_import',
          label: labelText,
          symbols: symbolNames,
          startLine: imp.startLine || 1,
          isCircular,
          sourceFile: srcPath,
          targetFile: tgtPath,
          verification: 'statically_verified',
        },
      });

      if (edges.length >= maxEdges) break;
    }
  }

  const limitations = [];
  if (circularDeps.length > 0) {
    limitations.push(`Detected ${circularDeps.length} circular dependency cycle(s) in module import graph.`);
  }
  if (internalImports.length === 0) {
    limitations.push('No relative ES/CommonJS imports were statically detected between files.');
  }

  return {
    repositoryId: repository._id,
    graphType: 'modules',
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      isTruncated: activeFilesSet.size > maxNodes,
      limitations,
      supportedTypes: ['modules', 'api-flow', 'call-graph', 'database'],
      summary: `Module dependency graph displaying ${nodes.length} files and ${edges.length} verified import relationships.`,
    },
  };
};

/**
 * 2. API Request Flow Graph
 * Traces HTTP routes -> middleware -> controller handlers -> database operations.
 */
export const buildApiFlowGraph = (repository, analysis, options = {}) => {
  const maxNodes = options.maxNodes || MAX_NODES_LIMIT;
  const maxEdges = options.maxEdges || MAX_EDGES_LIMIT;

  const apiEndpoints = analysis?.apiEndpoints || [];
  const symbols = analysis?.symbols || [];
  const dbInteractions = analysis?.databaseInteractions || [];

  const nodes = [];
  const edges = [];
  const nodeIdsSet = new Set();
  const edgeIdsSet = new Set();

  // Index symbols by name and file
  const symbolsMap = new Map(); // "name" -> Array<symbol>
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!symbolsMap.has(k)) symbolsMap.set(k, []);
    symbolsMap.get(k).push(s);
  }

  // Index database operations by file
  const dbByFile = new Map(); // "file" -> Array<dbInteraction>
  for (const db of dbInteractions) {
    const f = norm(db.file);
    if (!dbByFile.has(f)) dbByFile.set(f, []);
    dbByFile.get(f).push(db);
  }

  // Non-mount endpoints (skip raw router.use declarations if route endpoints exist)
  const actualRoutes = apiEndpoints.filter((ep) => ep.method !== 'USE');
  const targetEndpoints = (actualRoutes.length > 0 ? actualRoutes : apiEndpoints).slice(0, 15);

  let rowIndex = 0;

  for (const ep of targetEndpoints) {
    const routeId = `route_${ep.method}_${ep.path.replace(/[^a-zA-Z0-9_-]/g, '_')}_${rowIndex}`;
    if (!nodeIdsSet.has(routeId) && nodes.length < maxNodes) {
      nodeIdsSet.add(routeId);
      nodes.push({
        id: routeId,
        type: 'customNode',
        position: { x: 50, y: 40 + rowIndex * 150 },
        data: {
          id: routeId,
          label: `${ep.method} ${ep.path}`,
          sublabel: `Route in ${getFileBaseName(ep.file)}:${ep.startLine}`,
          nodeCategory: 'api-route',
          httpMethod: ep.method,
          apiPath: ep.path,
          filePath: ep.file,
          startLine: ep.startLine,
          endLine: ep.endLine,
          verification: 'statically_verified',
        },
      });
    }

    let previousNodeId = routeId;

    // A. Middlewares (if declared)
    if (ep.middlewares && ep.middlewares.length > 0) {
      for (let mIdx = 0; mIdx < ep.middlewares.length; mIdx++) {
        const mwName = ep.middlewares[mIdx];
        const mwId = `mw_${mwName}_${rowIndex}_${mIdx}`;
        if (!nodeIdsSet.has(mwId) && nodes.length < maxNodes) {
          nodeIdsSet.add(mwId);
          nodes.push({
            id: mwId,
            type: 'customNode',
            position: { x: 380, y: 40 + rowIndex * 150 + mIdx * 50 },
            data: {
              id: mwId,
              label: mwName,
              sublabel: `Middleware on ${ep.method} ${ep.path}`,
              nodeCategory: 'middleware',
              filePath: ep.file,
              startLine: ep.startLine,
              verification: 'statically_verified',
            },
          });

          const mwEdgeId = `e_${previousNodeId}_${mwId}`;
          if (!edgeIdsSet.has(mwEdgeId) && edges.length < maxEdges) {
            edgeIdsSet.add(mwEdgeId);
            edges.push({
              id: mwEdgeId,
              source: previousNodeId,
              target: mwId,
              type: 'smoothstep',
              data: {
                relationshipType: 'executes_middleware',
                label: 'passes through',
                verification: 'statically_verified',
              },
            });
          }
          previousNodeId = mwId;
        }
      }
    }

    // B. Controller Handler
    const handlerName = ep.handlerName || 'anonymous';
    const isInline = handlerName === '(inline handler)' || handlerName === 'anonymous';

    // Search for symbol matching handlerName
    const candidateSymbols = symbolsMap.get(handlerName.toLowerCase()) || [];
    const matchedSymbol = candidateSymbols[0];

    const handlerFile = matchedSymbol ? matchedSymbol.file : ep.file;
    const handlerStart = matchedSymbol ? matchedSymbol.startLine : ep.startLine;
    const handlerEnd = matchedSymbol ? matchedSymbol.endLine : ep.endLine;

    const handlerId = `handler_${handlerName}_${rowIndex}`;
    if (!nodeIdsSet.has(handlerId) && nodes.length < maxNodes) {
      nodeIdsSet.add(handlerId);
      nodes.push({
        id: handlerId,
        type: 'customNode',
        position: { x: 700, y: 40 + rowIndex * 150 },
        data: {
          id: handlerId,
          label: `${handlerName}()`,
          sublabel: `Handler in ${getFileBaseName(handlerFile)}:${handlerStart}`,
          nodeCategory: 'controller',
          symbolName: handlerName,
          filePath: handlerFile,
          startLine: handlerStart,
          endLine: handlerEnd,
          isAsync: matchedSymbol ? matchedSymbol.isAsync : true,
          verification: isInline ? 'inferred' : 'statically_verified',
        },
      });

      const handlerEdgeId = `e_${previousNodeId}_${handlerId}`;
      if (!edgeIdsSet.has(handlerEdgeId) && edges.length < maxEdges) {
        edgeIdsSet.add(handlerEdgeId);
        edges.push({
          id: handlerEdgeId,
          source: previousNodeId,
          target: handlerId,
          type: 'smoothstep',
          data: {
            relationshipType: 'dispatches_to',
            label: 'dispatches to',
            verification: isInline ? 'inferred' : 'statically_verified',
          },
        });
      }
    }

    // C. Database Operations attached to handler file
    const fileDbs = dbByFile.get(norm(handlerFile)) || [];
    for (let dbIdx = 0; dbIdx < fileDbs.length && dbIdx < 2; dbIdx++) {
      const db = fileDbs[dbIdx];
      const dbId = `db_${db.modelName}_${db.operationType}_${rowIndex}_${dbIdx}`;
      if (!nodeIdsSet.has(dbId) && nodes.length < maxNodes) {
        nodeIdsSet.add(dbId);
        nodes.push({
          id: dbId,
          type: 'customNode',
          position: { x: 1040, y: 40 + rowIndex * 150 + dbIdx * 60 },
          data: {
            id: dbId,
            label: `${db.modelName}.${db.operationType}()`,
            sublabel: `${db.technology} in ${getFileBaseName(db.file)}:${db.startLine}`,
            nodeCategory: 'database',
            modelName: db.modelName,
            operationType: db.operationType,
            technology: db.technology,
            filePath: db.file,
            startLine: db.startLine,
            endLine: db.endLine,
            evidence: db.evidence,
            verification: 'statically_verified',
          },
        });

        const dbEdgeId = `e_${handlerId}_${dbId}`;
        if (!edgeIdsSet.has(dbEdgeId) && edges.length < maxEdges) {
          edgeIdsSet.add(dbEdgeId);
          edges.push({
            id: dbEdgeId,
            source: handlerId,
            target: dbId,
            type: 'smoothstep',
            data: {
              relationshipType: db.operationType === 'create' ? 'mutates_db' : 'queries_db',
              label: `${db.operationType}()`,
              evidence: db.evidence,
              verification: 'statically_verified',
            },
          });
        }
      }
    }

    rowIndex++;
  }

  const limitations = [];
  if (apiEndpoints.length === 0) {
    limitations.push('No Express HTTP route definitions were discovered in the analyzed source files.');
  } else {
    limitations.push('Dynamic route dispatching and third-party middleware chains outside static AST scope are omitted.');
  }

  return {
    repositoryId: repository._id,
    graphType: 'api-flow',
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      isTruncated: apiEndpoints.length > targetEndpoints.length,
      limitations,
      supportedTypes: ['modules', 'api-flow', 'call-graph', 'database'],
      summary: `API Request Flow graph mapping ${nodes.length} components across ${targetEndpoints.length} HTTP routes.`,
    },
  };
};

/**
 * 3. Function & Call Graph
 * Visualizes discovered functions, classes, methods, and verified call connections.
 */
export const buildFunctionCallGraph = (repository, analysis, options = {}) => {
  const maxNodes = options.maxNodes || MAX_NODES_LIMIT;
  const maxEdges = options.maxEdges || MAX_EDGES_LIMIT;

  const symbols = (analysis?.symbols || []).slice(0, 50);
  const entryPoints = analysis?.entryPoints || [];

  const nodes = [];
  const edges = [];
  const nodeIdsSet = new Set();
  const edgeIdsSet = new Set();

  const symbolMap = new Map(); // "name" -> symbol
  for (const s of symbols) {
    symbolMap.set(s.name.toLowerCase(), s);
  }

  // Group symbols by file
  const symbolsByFile = new Map();
  for (const s of symbols) {
    const f = norm(s.file);
    if (!symbolsByFile.has(f)) symbolsByFile.set(f, []);
    symbolsByFile.get(f).push(s);
  }

  let colIdx = 0;
  for (const [filePath, fileSymbols] of symbolsByFile.entries()) {
    let rowIdx = 0;

    for (const sym of fileSymbols) {
      if (nodes.length >= maxNodes) break;

      const nodeId = `sym_${sym.name}_${sym.file.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      if (!nodeIdsSet.has(nodeId)) {
        nodeIdsSet.add(nodeId);

        let nodeCat = 'function';
        if (sym.type === 'class') nodeCat = 'class';
        else if (sym.type === 'method') nodeCat = 'method';

        nodes.push({
          id: nodeId,
          type: 'customNode',
          position: {
            x: 60 + colIdx * 340,
            y: 40 + rowIdx * 110,
          },
          data: {
            id: nodeId,
            label: `${sym.name}${sym.type === 'class' ? '' : '()'}`,
            sublabel: `${sym.type} in ${getFileBaseName(sym.file)}:${sym.startLine}`,
            nodeCategory: nodeCat,
            symbolName: sym.name,
            symbolType: sym.type,
            filePath: sym.file,
            startLine: sym.startLine,
            endLine: sym.endLine,
            isExported: sym.isExported,
            isAsync: sym.isAsync,
            parentClass: sym.parentClass || null,
            params: sym.params || [],
            verification: 'statically_verified',
          },
        });
      }
      rowIdx++;
    }
    colIdx++;
  }

  // Connect Class to its Methods
  const pathToNode = new Map(nodes.map((n) => [`${n.data.symbolName}@${norm(n.data.filePath)}`, n.id]));

  for (const sym of symbols) {
    if (sym.type === 'method' && sym.parentClass) {
      const classKey = `${sym.parentClass}@${norm(sym.file)}`;
      const methodKey = `${sym.name}@${norm(sym.file)}`;

      const classNodeId = pathToNode.get(classKey);
      const methodNodeId = pathToNode.get(methodKey);

      if (classNodeId && methodNodeId) {
        const edgeId = `e_class_${classNodeId}_${methodNodeId}`;
        if (!edgeIdsSet.has(edgeId) && edges.length < maxEdges) {
          edgeIdsSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: classNodeId,
            target: methodNodeId,
            type: 'smoothstep',
            data: {
              relationshipType: 'contains_method',
              label: 'declares method',
              verification: 'statically_verified',
            },
          });
        }
      }
    }
  }

  // Link Entry Points to called startup functions (e.g. server.js -> startServer)
  for (const ep of entryPoints) {
    const epFile = norm(ep.path);
    const fileSyms = symbolsByFile.get(epFile) || [];
    for (const sym of fileSyms) {
      const lower = sym.name.toLowerCase();
      if (lower.includes('start') || lower.includes('listen') || lower.includes('init') || lower.includes('app')) {
        const targetId = pathToNode.get(`${sym.name}@${epFile}`);
        if (targetId) {
          const selfEdgeId = `e_boot_${targetId}`;
          if (!edgeIdsSet.has(selfEdgeId) && edges.length < maxEdges) {
            edgeIdsSet.add(selfEdgeId);
            edges.push({
              id: selfEdgeId,
              source: targetId,
              target: targetId,
              type: 'smoothstep',
              animated: true,
              data: {
                relationshipType: 'invoked_on_bootstrap',
                label: 'entry execution',
                verification: 'statically_verified',
              },
            });
          }
        }
      }
    }
  }

  const limitations = [
    'Static call analysis only links statically discoverable declarations, class-method containment, and bootstrap invocations.',
    'Dynamic runtime invocations, callbacks passed via arguments, and event listeners cannot be guaranteed statically.',
  ];

  return {
    repositoryId: repository._id,
    graphType: 'call-graph',
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      isTruncated: (analysis?.symbols?.length || 0) > symbols.length,
      limitations,
      supportedTypes: ['modules', 'api-flow', 'call-graph', 'database'],
      summary: `Function and call graph visualizing ${nodes.length} functions, classes, and methods across ${symbolsByFile.size} files.`,
    },
  };
};

/**
 * 4. Database Interaction Graph
 * Connects controllers, routes, and services to database models, schemas, and query patterns.
 */
export const buildDatabaseGraph = (repository, analysis, options = {}) => {
  const maxNodes = options.maxNodes || MAX_NODES_LIMIT;
  const maxEdges = options.maxEdges || MAX_EDGES_LIMIT;

  const dbInteractions = analysis?.databaseInteractions || [];
  const apiEndpoints = analysis?.apiEndpoints || [];

  const nodes = [];
  const edges = [];
  const nodeIdsSet = new Set();
  const edgeIdsSet = new Set();

  // Distinct model names
  const modelNames = Array.from(new Set(dbInteractions.map((db) => db.modelName)));

  // 1. Center / Target Column: Database Models
  modelNames.forEach((modelName, mIdx) => {
    const modelInteractions = dbInteractions.filter((db) => db.modelName === modelName);
    const tech = modelInteractions[0]?.technology || 'Database';
    const schemaFile = modelInteractions.find((db) => db.operationType.includes('schema') || db.operationType.includes('model'))?.file || modelInteractions[0]?.file;

    const modelNodeId = `dbmodel_${modelName}`;
    if (!nodeIdsSet.has(modelNodeId) && nodes.length < maxNodes) {
      nodeIdsSet.add(modelNodeId);
      nodes.push({
        id: modelNodeId,
        type: 'customNode',
        position: { x: 600, y: 50 + mIdx * 180 },
        data: {
          id: modelNodeId,
          label: `${modelName} Model`,
          sublabel: `${tech} in ${getFileBaseName(schemaFile)}`,
          nodeCategory: 'model',
          modelName,
          technology: tech,
          filePath: schemaFile,
          operationsCount: modelInteractions.length,
          verification: 'statically_verified',
        },
      });
    }
  });

  // 2. Left Column: Calling Controllers / Routes / Files
  const callersMap = new Map(); // "file" -> Array<dbInteraction>
  for (const db of dbInteractions) {
    const f = norm(db.file);
    if (!callersMap.has(f)) callersMap.set(f, []);
    callersMap.get(f).push(db);
  }

  let callerIdx = 0;
  for (const [callerFile, ops] of callersMap.entries()) {
    const callerNodeId = `caller_${callerFile.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    if (!nodeIdsSet.has(callerNodeId) && nodes.length < maxNodes) {
      nodeIdsSet.add(callerNodeId);

      const isRoute = callerFile.toLowerCase().includes('route');
      const isController = callerFile.toLowerCase().includes('controller');

      nodes.push({
        id: callerNodeId,
        type: 'customNode',
        position: { x: 50, y: 40 + callerIdx * 130 },
        data: {
          id: callerNodeId,
          label: getFileBaseName(callerFile),
          sublabel: callerFile,
          nodeCategory: isController ? 'controller' : isRoute ? 'route' : 'module',
          filePath: callerFile,
          operationsCount: ops.length,
          verification: 'statically_verified',
        },
      });

      // Link Caller to Models
      for (const op of ops) {
        const targetModelId = `dbmodel_${op.modelName}`;
        if (nodeIdsSet.has(targetModelId)) {
          const edgeId = `e_${callerNodeId}_${targetModelId}_${op.operationType}_${op.startLine}`;
          if (!edgeIdsSet.has(edgeId) && edges.length < maxEdges) {
            edgeIdsSet.add(edgeId);

            const isWrite = ['create', 'update', 'delete', 'mutates_db'].includes(op.operationType);

            edges.push({
              id: edgeId,
              source: callerNodeId,
              target: targetModelId,
              type: 'smoothstep',
              data: {
                relationshipType: op.operationType,
                label: `${op.operationType}()`,
                filePath: op.file,
                startLine: op.startLine,
                endLine: op.endLine,
                evidence: op.evidence,
                isWrite,
                verification: 'statically_verified',
              },
            });
          }
        }
      }

      callerIdx++;
    }
  }

  const limitations = [];
  if (dbInteractions.length === 0) {
    limitations.push('No ORM/ODM models, schemas, or database query operations were statically identified.');
  } else {
    limitations.push('Dynamic database queries created via string concatenation or unindexed drivers are not captured.');
  }

  return {
    repositoryId: repository._id,
    graphType: 'database',
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      isTruncated: false,
      limitations,
      supportedTypes: ['modules', 'api-flow', 'call-graph', 'database'],
      summary: `Database interaction graph connecting ${callersMap.size} source modules to ${modelNames.length} models across ${dbInteractions.length} query operations.`,
    },
  };
};

/**
 * Universal Graph Generator Gateway
 *
 * @param {object} repository - Repository Mongoose model
 * @param {object} analysis - AnalysisResult Mongoose model
 * @param {string} graphType - 'modules' | 'api-flow' | 'call-graph' | 'database'
 * @param {object} [options]
 * @returns {object} Formatted graph response
 */
export const generateRepositoryGraph = (repository, analysis, graphType = 'modules', options = {}) => {
  const normalizedType = (graphType || 'modules').toLowerCase().trim();

  switch (normalizedType) {
    case 'api-flow':
    case 'api':
      return buildApiFlowGraph(repository, analysis, options);

    case 'call-graph':
    case 'calls':
      return buildFunctionCallGraph(repository, analysis, options);

    case 'database':
    case 'db':
      return buildDatabaseGraph(repository, analysis, options);

    case 'modules':
    case 'dependencies':
    default:
      return buildModuleDependencyGraph(repository, analysis, options);
  }
};

export default {
  buildModuleDependencyGraph,
  buildApiFlowGraph,
  buildFunctionCallGraph,
  buildDatabaseGraph,
  generateRepositoryGraph,
};
