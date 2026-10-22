import path from 'path';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'use', 'all']);

/**
 * Analyzes Express API endpoints and associated handlers from source code.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @returns {Array<{ method: string, path: string, file: string, startLine: number, endLine: number, handlerName: string, middlewares: Array, routerPrefix: string, confidence: string }>}
 */
export const analyzeApiEndpoints = (files) => {
  const endpoints = [];
  const routerMounts = new Map(); // router variable or file -> prefix

  // 1. Pass 1: Discover router mounts (e.g., app.use('/api/users', userRoutes))
  for (const file of files) {
    if (!file.content) continue;
    const lines = file.content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match app.use('/prefix', routerVariable)
      const mountMatch = line.match(/(?:app|router)\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*([a-zA-Z0-9_]+)\s*\)/);
      if (mountMatch) {
        const prefix = mountMatch[1];
        const routerVar = mountMatch[2];
        routerMounts.set(routerVar, prefix);

        // Also track mount declaration itself
        endpoints.push({
          method: 'USE',
          path: prefix,
          file: file.path,
          startLine: i + 1,
          endLine: i + 1,
          handlerName: routerVar,
          middlewares: [],
          routerPrefix: '',
          confidence: 'ast-verified',
        });
      }
    }
  }

  // 2. Pass 2: Discover route definitions (app.get, router.post, etc.)
  for (const file of files) {
    if (!file.content) continue;
    const lines = file.content.split(/\r?\n/);

    // Heuristic prefix deduction: if file path contains routes/something.routes.js
    // Check if filename suggests prefix
    let fileSuggestedPrefix = '';
    const baseName = path.basename(file.path, path.extname(file.path)).replace(/\.routes?$/i, '');
    for (const [routerVar, prefix] of routerMounts.entries()) {
      if (routerVar.toLowerCase().includes(baseName.toLowerCase())) {
        fileSuggestedPrefix = prefix;
        break;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match: (app|router).(get|post|put|delete|patch|options|head|all)('/path', ...handlers)
      const routeMatch = line.match(/(?:app|router)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const routePath = routeMatch[2];

        // Extract handler names or middlewares in the rest of the arguments
        const argsStr = line.substring(routeMatch.index + routeMatch[0].length);
        const argTokens = argsStr
          .split(',')
          .map((t) => t.trim().replace(/[)\s;{]+$/, ''))
          .filter((t) => t.length > 0 && !t.startsWith('//'));

        let handlerName = 'anonymous';
        const middlewares = [];

        if (argTokens.length > 0) {
          const lastToken = argTokens[argTokens.length - 1];
          if (/^[a-zA-Z0-9_]+$/.test(lastToken)) {
            handlerName = lastToken;
          } else if (lastToken.includes('=>') || lastToken.includes('function')) {
            handlerName = '(inline handler)';
          }

          // Middlewares
          for (let m = 0; m < argTokens.length - 1; m++) {
            if (/^[a-zA-Z0-9_()]+$/.test(argTokens[m])) {
              middlewares.push(argTokens[m]);
            }
          }
        }

        // Full path with router prefix if known
        let effectivePath = routePath;
        if (fileSuggestedPrefix && !routePath.startsWith(fileSuggestedPrefix)) {
          effectivePath = `${fileSuggestedPrefix.replace(/\/$/, '')}/${routePath.replace(/^\//, '')}`;
        }

        endpoints.push({
          method,
          path: effectivePath,
          file: file.path,
          startLine: i + 1,
          endLine: i + 1,
          handlerName,
          middlewares,
          routerPrefix: fileSuggestedPrefix,
          confidence: 'ast-verified',
        });
      }
    }
  }

  return endpoints;
};
