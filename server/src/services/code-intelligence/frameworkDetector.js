import path from 'path';

const KNOWN_FRAMEWORKS = [
  // Backend web frameworks
  {
    name: 'Express.js',
    category: 'backend',
    signatures: ['express'],
    codeRegex: /require\(["']express["']\)|from\s+["']express["']/i,
  },
  {
    name: 'NestJS',
    category: 'backend',
    signatures: ['@nestjs/core', '@nestjs/common'],
  },
  {
    name: 'Fastify',
    category: 'backend',
    signatures: ['fastify'],
  },
  {
    name: 'Django',
    category: 'backend',
    pythonPackages: ['django'],
    fileSignatures: ['manage.py'],
  },
  {
    name: 'Flask',
    category: 'backend',
    pythonPackages: ['flask'],
    codeRegex: /from\s+flask\s+import|import\s+flask/i,
  },
  {
    name: 'FastAPI',
    category: 'backend',
    pythonPackages: ['fastapi'],
    codeRegex: /from\s+fastapi\s+import|import\s+fastapi/i,
  },
  {
    name: 'Spring Boot',
    category: 'backend',
    fileSignatures: ['pom.xml', 'build.gradle'],
    codeRegex: /@SpringBootApplication/i,
  },
  {
    name: 'Laravel',
    category: 'backend',
    fileSignatures: ['artisan'],
  },

  // Frontend web frameworks
  {
    name: 'React',
    category: 'frontend',
    signatures: ['react', 'react-dom'],
    codeRegex: /from\s+["']react["']|require\(["']react["']\)/i,
  },
  {
    name: 'Next.js',
    category: 'frontend',
    signatures: ['next'],
    fileSignatures: ['next.config.js', 'next.config.mjs'],
  },
  {
    name: 'Vue.js',
    category: 'frontend',
    signatures: ['vue'],
  },
  {
    name: 'Angular',
    category: 'frontend',
    signatures: ['@angular/core'],
    fileSignatures: ['angular.json'],
  },
  {
    name: 'Svelte',
    category: 'frontend',
    signatures: ['svelte'],
  },

  // Database / ODM / ORM
  {
    name: 'Mongoose (MongoDB)',
    category: 'database',
    signatures: ['mongoose'],
    codeRegex: /from\s+["']mongoose["']|require\(["']mongoose["']\)/i,
  },
  {
    name: 'MongoDB Driver',
    category: 'database',
    signatures: ['mongodb'],
  },
  {
    name: 'Sequelize',
    category: 'database',
    signatures: ['sequelize'],
  },
  {
    name: 'Prisma ORM',
    category: 'database',
    signatures: ['@prisma/client', 'prisma'],
    fileSignatures: ['schema.prisma'],
  },
  {
    name: 'PostgreSQL (pg)',
    category: 'database',
    signatures: ['pg', 'pg-promise'],
  },
  {
    name: 'MySQL Client',
    category: 'database',
    signatures: ['mysql', 'mysql2'],
  },

  // Build tools & UI Toolkits
  {
    name: 'Vite',
    category: 'build-tool',
    signatures: ['vite'],
    fileSignatures: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
  },
  {
    name: 'Bootstrap',
    category: 'frontend',
    signatures: ['bootstrap'],
  },
  {
    name: 'Tailwind CSS',
    category: 'frontend',
    signatures: ['tailwindcss'],
    fileSignatures: ['tailwind.config.js', 'tailwind.config.ts'],
  },
  {
    name: 'React Flow',
    category: 'frontend',
    signatures: ['@xyflow/react', 'reactflow'],
  },
];

/**
 * Detects frameworks and libraries by analyzing package manifests and source code evidence.
 *
 * @param {Array<{ path: string, content?: string }>} files
 * @param {object} parsedManifests - Dictionary of manifest data (e.g. package.json, requirements.txt)
 * @returns {Array<{ name: string, category: string, version: string|null, confidence: string, evidence: string }>}
 */
export const detectFrameworks = (files, parsedManifests = {}) => {
  const detected = new Map();
  const filePathsSet = new Set(files.map((f) => f.path.replace(/\\/g, '/')));

  // 1. Manifest Inspection (Node.js package.json)
  const pkg = parsedManifests['package.json'];
  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const fw of KNOWN_FRAMEWORKS) {
      if (fw.signatures) {
        for (const sig of fw.signatures) {
          if (allDeps[sig]) {
            detected.set(fw.name, {
              name: fw.name,
              category: fw.category,
              version: allDeps[sig],
              confidence: 'manifest-verified',
              evidence: `Declared in package.json dependencies: "${sig}": "${allDeps[sig]}"`,
            });
            break;
          }
        }
      }
    }
  }

  // 2. Python requirements.txt inspection
  const reqsText = parsedManifests['requirements.txt'];
  if (reqsText && typeof reqsText === 'string') {
    const lines = reqsText.split(/\r?\n/);
    for (const fw of KNOWN_FRAMEWORKS) {
      if (fw.pythonPackages && !detected.has(fw.name)) {
        for (const pyPkg of fw.pythonPackages) {
          const matchLine = lines.find((l) => l.trim().toLowerCase().startsWith(pyPkg.toLowerCase()));
          if (matchLine) {
            detected.set(fw.name, {
              name: fw.name,
              category: fw.category,
              version: matchLine.split('==')[1] || null,
              confidence: 'manifest-verified',
              evidence: `Declared in requirements.txt: "${matchLine.trim()}"`,
            });
            break;
          }
        }
      }
    }
  }

  // 3. File Signature & Code Heuristics
  for (const fw of KNOWN_FRAMEWORKS) {
    if (!detected.has(fw.name)) {
      // Check config file signatures
      if (fw.fileSignatures) {
        for (const fileSig of fw.fileSignatures) {
          const match = Array.from(filePathsSet).find((p) => p.endsWith(fileSig));
          if (match) {
            detected.set(fw.name, {
              name: fw.name,
              category: fw.category,
              version: null,
              confidence: 'manifest-verified',
              evidence: `Configuration file present: "${match}"`,
            });
            break;
          }
        }
      }

      // Check code regex in source files
      if (!detected.has(fw.name) && fw.codeRegex) {
        for (const file of files) {
          if (file.content && fw.codeRegex.test(file.content)) {
            detected.set(fw.name, {
              name: fw.name,
              category: fw.category,
              version: null,
              confidence: 'code-inferred',
              evidence: `Import or usage signature detected in "${file.path}"`,
            });
            break;
          }
        }
      }
    }
  }

  return Array.from(detected.values());
};
