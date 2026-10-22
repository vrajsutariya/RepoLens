import path from 'path';

const KNOWN_ENTRY_PATTERNS = [
  // Application Servers & Backends
  { pattern: /(?:^|\/)server\.(?:js|ts|mjs)$/i, type: 'application-server', desc: 'Main HTTP/Express server entry point' },
  { pattern: /(?:^|\/)app\.(?:js|ts|mjs)$/i, type: 'application-server', desc: 'Application setup & middleware entry point' },
  { pattern: /(?:^|\/)main\.(?:py|go|rs|java)$/i, type: 'application-server', desc: 'Application runtime entry point' },
  { pattern: /(?:^|\/)manage\.py$/i, type: 'cli', desc: 'Django project management & server entry point' },
  { pattern: /(?:^|\/)artisan$/i, type: 'cli', desc: 'Laravel console & execution entry point' },

  // Frontend Mount Points
  { pattern: /(?:^|\/)src\/main\.(?:jsx|tsx|js|ts)$/i, type: 'frontend-mount', desc: 'React/Vite DOM root mount entry point' },
  { pattern: /(?:^|\/)src\/index\.(?:jsx|tsx|js|ts)$/i, type: 'frontend-mount', desc: 'Client application mount entry point' },
  { pattern: /(?:^|\/)src\/App\.(?:jsx|tsx|js|ts)$/i, type: 'root-component', desc: 'Primary root component & routing tree' },
  { pattern: /(?:^|\/)index\.html$/i, type: 'frontend-mount', desc: 'Single-page application HTML entry document' },

  // Key Configuration & Orchestration
  { pattern: /(?:^|\/)package\.json$/i, type: 'configuration', desc: 'Node.js manifest, dependencies, and script runner' },
  { pattern: /(?:^|\/)vite\.config\.(?:js|ts|mjs)$/i, type: 'configuration', desc: 'Vite build tool & dev-server configuration' },
  { pattern: /(?:^|\/)tsconfig\.json$/i, type: 'configuration', desc: 'TypeScript compiler configuration' },
  { pattern: /(?:^|\/)Dockerfile$/i, type: 'docker', desc: 'Container build & container entrypoint definition' },
  { pattern: /(?:^|\/)docker-compose\.ya?ml$/i, type: 'docker', desc: 'Multi-service container orchestration' },
];

/**
 * Detects repository entry points and configuration files with evidence.
 *
 * @param {Array<{ path: string, content?: string }>} files
 * @param {object} parsedManifests - Package manifests dictionary
 * @returns {Array<{ path: string, type: string, description: string, command: string|null, evidence: string, startLine: number, endLine: number }>}
 */
export const detectEntryPoints = (files, parsedManifests = {}) => {
  const entryPoints = [];
  const registeredPaths = new Set();

  const fileMap = new Map();
  for (const f of files) {
    fileMap.set(f.path.replace(/\\/g, '/'), f);
  }

  // 1. Inspect package.json "main" and scripts
  const pkg = parsedManifests['package.json'];
  if (pkg) {
    if (pkg.main) {
      const resolvedMain = pkg.main.replace(/^\.\//, '');
      const matchFile = files.find((f) => f.path.replace(/\\/g, '/').endsWith(resolvedMain));
      if (matchFile && !registeredPaths.has(matchFile.path)) {
        registeredPaths.add(matchFile.path);
        entryPoints.push({
          path: matchFile.path,
          type: 'application-server',
          description: `Declared as primary module entry in package.json ("main": "${pkg.main}")`,
          command: pkg.scripts?.start ? `npm start (${pkg.scripts.start})` : null,
          evidence: `package.json -> main: "${pkg.main}"`,
          startLine: 1,
          endLine: 1,
        });
      }
    }

    // Inspect package start/dev scripts
    if (pkg.scripts) {
      if (pkg.scripts.start) {
        const pkgFile = files.find((f) => f.path.endsWith('package.json'));
        if (pkgFile && !registeredPaths.has(pkgFile.path)) {
          registeredPaths.add(pkgFile.path);
          entryPoints.push({
            path: pkgFile.path,
            type: 'configuration',
            description: `Primary startup script: npm start -> "${pkg.scripts.start}"`,
            command: `npm start -> ${pkg.scripts.start}`,
            evidence: `Defined in package.json scripts`,
            startLine: 1,
            endLine: 1,
          });
        }
      }
    }
  }

  // 2. Inspect files against known entry point patterns
  for (const file of files) {
    const normPath = file.path.replace(/\\/g, '/');
    if (registeredPaths.has(file.path)) continue;

    for (const patternSpec of KNOWN_ENTRY_PATTERNS) {
      if (patternSpec.pattern.test(normPath)) {
        registeredPaths.add(file.path);
        entryPoints.push({
          path: file.path,
          type: patternSpec.type,
          description: patternSpec.desc,
          command: null,
          evidence: `Convention matched: ${path.basename(file.path)}`,
          startLine: 1,
          endLine: 1,
        });
        break;
      }
    }
  }

  return entryPoints;
};
