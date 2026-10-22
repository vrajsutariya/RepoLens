import { parse } from '@babel/parser';
import path from 'path';

const JS_TS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

const BABEL_PLUGINS = [
  'jsx',
  'typescript',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'asyncGenerators',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  'nullishCoalescingOperator',
  'topLevelAwait',
];

/**
 * Extracts param names from function param nodes.
 */
const extractParamNames = (params = []) => {
  return params
    .map((p) => {
      if (p.type === 'Identifier') return p.name;
      if (p.type === 'AssignmentPattern' && p.left?.type === 'Identifier') return p.left.name;
      if (p.type === 'RestElement' && p.argument?.type === 'Identifier') return `...${p.argument.name}`;
      if (p.type === 'ObjectPattern') return '{...}';
      if (p.type === 'ArrayPattern') return '[...]';
      return null;
    })
    .filter(Boolean);
};

/**
 * Parses a JavaScript/TypeScript source file using @babel/parser and extracts AST symbols.
 */
const parseJsTsSymbols = (content, filePath, warnings = []) => {
  const symbols = [];
  const imports = [];
  const exports = [];

  let ast;
  try {
    ast = parse(content, {
      sourceType: 'unambiguous',
      plugins: BABEL_PLUGINS,
      errorRecovery: true,
      ranges: false,
      tokens: false,
    });
  } catch (parseError) {
    warnings.push({
      file: filePath,
      message: `AST parsing error: ${parseError.message}`,
      type: 'ast-parse-error',
    });
    return { symbols, imports, exports };
  }

  const visitNode = (node, isExported = false) => {
    if (!node || typeof node !== 'object') return;

    // 1. Function Declarations
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      symbols.push({
        name: node.id.name,
        type: 'function',
        file: filePath,
        startLine: node.loc?.start?.line || 1,
        endLine: node.loc?.end?.line || 1,
        isExported,
        isAsync: Boolean(node.async),
        params: extractParamNames(node.params),
        detectionMethod: 'ast-verified',
      });
    }

    // 2. Class Declarations
    else if (node.type === 'ClassDeclaration' && node.id?.name) {
      const className = node.id.name;
      symbols.push({
        name: className,
        type: 'class',
        file: filePath,
        startLine: node.loc?.start?.line || 1,
        endLine: node.loc?.end?.line || 1,
        isExported,
        params: [],
        detectionMethod: 'ast-verified',
      });

      // Extract Class Methods
      if (node.body?.body) {
        for (const member of node.body.body) {
          if (member.type === 'ClassMethod' && member.key?.name) {
            symbols.push({
              name: `${className}.${member.key.name}`,
              type: 'method',
              file: filePath,
              startLine: member.loc?.start?.line || 1,
              endLine: member.loc?.end?.line || 1,
              isExported: false,
              isAsync: Boolean(member.async),
              methodType: member.kind || 'method', // constructor, get, set, method
              parentClass: className,
              params: extractParamNames(member.params),
              detectionMethod: 'ast-verified',
            });
          }
        }
      }
    }

    // 3. Variable Declarations (const handler = () => {} or function expressions)
    else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id?.type === 'Identifier' && decl.init) {
          const varName = decl.id.name;
          const init = decl.init;

          if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
            symbols.push({
              name: varName,
              type: init.type === 'ArrowFunctionExpression' ? 'arrow-function' : 'function',
              file: filePath,
              startLine: decl.loc?.start?.line || 1,
              endLine: decl.loc?.end?.line || 1,
              isExported,
              isAsync: Boolean(init.async),
              params: extractParamNames(init.params),
              detectionMethod: 'ast-verified',
            });
          }
        }
      }
    }

    // 4. Export Named Declarations
    else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        visitNode(node.declaration, true);
      }
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.exported?.name) {
            exports.push({
              name: spec.exported.name,
              file: filePath,
              startLine: node.loc?.start?.line || 1,
            });
          }
        }
      }
    }

    // 5. Export Default Declaration
    else if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration) {
        if (node.declaration.id?.name) {
          visitNode(node.declaration, true);
        } else if (node.declaration.type === 'Identifier') {
          exports.push({
            name: `default (${node.declaration.name})`,
            file: filePath,
            startLine: node.loc?.start?.line || 1,
          });
        }
      }
    }

    // 6. Import Declarations
    else if (node.type === 'ImportDeclaration' && node.source?.value) {
      const importedSymbols = [];
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.local?.name) importedSymbols.push(spec.local.name);
        }
      }
      imports.push({
        sourceFile: filePath,
        rawPath: node.source.value,
        importedSymbols,
        startLine: node.loc?.start?.line || 1,
      });
    }
  };

  if (ast.program?.body) {
    for (const stmt of ast.program.body) {
      visitNode(stmt, false);
    }
  }

  return { symbols, imports, exports };
};

/**
 * Heuristic symbol extraction for non-JS languages (Python, Go, Java, etc.)
 */
const parseHeuristicSymbols = (content, filePath) => {
  const symbols = [];
  const lines = content.split(/\r?\n/);
  const ext = path.extname(filePath).toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Python functions and classes
    if (ext === '.py') {
      const funcMatch = line.match(/^\s*def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          type: 'function',
          file: filePath,
          startLine: lineNum,
          endLine: lineNum,
          isExported: !funcMatch[1].startsWith('_'),
          params: funcMatch[2] ? funcMatch[2].split(',').map((p) => p.trim()) : [],
          detectionMethod: 'heuristic',
        });
      }
      const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          file: filePath,
          startLine: lineNum,
          endLine: lineNum,
          isExported: true,
          params: [],
          detectionMethod: 'heuristic',
        });
      }
    }

    // Go functions
    else if (ext === '.go') {
      const goFuncMatch = line.match(/^func\s+(?:\([a-zA-Z0-9_*\s]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/);
      if (goFuncMatch) {
        const name = goFuncMatch[1];
        symbols.push({
          name,
          type: 'function',
          file: filePath,
          startLine: lineNum,
          endLine: lineNum,
          isExported: name[0] === name[0].toUpperCase(),
          params: [],
          detectionMethod: 'heuristic',
        });
      }
    }
  }

  return { symbols, imports: [], exports: [] };
};

/**
 * Main symbol extraction entry point.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @param {Array} warningsArray - Collects warnings
 * @returns {{ symbols: Array, fileImports: Array, fileExports: Array }}
 */
export const extractSymbols = (files, warningsArray = []) => {
  const allSymbols = [];
  const allImports = [];
  const allExports = [];

  for (const file of files) {
    if (!file.content) continue;

    const ext = path.extname(file.path).toLowerCase();

    if (JS_TS_EXTENSIONS.has(ext)) {
      const { symbols, imports, exports } = parseJsTsSymbols(file.content, file.path, warningsArray);
      allSymbols.push(...symbols);
      allImports.push(...imports);
      allExports.push(...exports);
    } else {
      const { symbols } = parseHeuristicSymbols(file.content, file.path);
      allSymbols.push(...symbols);
    }
  }

  return {
    symbols: allSymbols,
    fileImports: allImports,
    fileExports: allExports,
  };
};
