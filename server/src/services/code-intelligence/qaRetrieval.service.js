import fs from 'fs';
import path from 'path';
import { getRepoExtractedDir } from '../../config/storage.js';
import { assertSafePath } from '../../utils/pathSafety.js';

// Configuration limits for context budget
export const RETRIEVAL_LIMITS = {
  MAX_FILES: 5,
  MAX_SNIPPETS: 6,
  MAX_CONTEXT_CHARS: 12000,
  MAX_SNIPPET_LINES: 45,
  CONTEXT_PADDING_LINES: 2,
};

// Common English & programming stop words to ignore during query tokenization
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'where', 'which', 'who',
  'how', 'when', 'why', 'can', 'does', 'do', 'called', 'handle', 'handled',
  'application', 'project', 'code', 'file', 'files', 'please', 'show', 'tell',
]);

/**
 * Tokenizes and normalizes a natural language question.
 *
 * @param {string} question
 * @returns {{ tokens: string[], methods: string[], paths: string[], categories: Set<string> }}
 */
export const analyzeQueryIntent = (question = '') => {
  if (!question || typeof question !== 'string') {
    return { tokens: [], methods: [], paths: [], categories: new Set() };
  }

  const raw = question.trim();
  const tokens = [];
  const methods = [];
  const paths = [];
  const categories = new Set();

  // 1. Extract HTTP methods (GET, POST, PUT, DELETE, PATCH)
  const methodRegex = /\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/gi;
  let match;
  while ((match = methodRegex.exec(raw)) !== null) {
    methods.push(match[1].toUpperCase());
  }

  // 2. Extract URL / Route paths (e.g., /api/users, /health)
  const pathRegex = /(\/[a-zA-Z0-9_\-./*]+)/g;
  while ((match = pathRegex.exec(raw)) !== null) {
    paths.push(match[1].toLowerCase());
  }

  // 3. Extract word tokens, splitting on camelCase, snake_case, and non-alphanumeric
  const words = raw
    .replace(/[/?#.,;:!'"()[\]{}<>_=-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const lower = word.toLowerCase();
    if (!STOP_WORDS.has(lower) && lower.length > 1) {
      tokens.push(lower);
    }

    // Split camelCase words (e.g. "authController" -> "auth", "controller")
    const camelParts = word.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
    if (camelParts.length > 1) {
      for (const part of camelParts) {
        const pLower = part.toLowerCase();
        if (!STOP_WORDS.has(pLower) && pLower.length > 2) {
          tokens.push(pLower);
        }
      }
    }
  }

  // 4. Classify intent categories based on domain keywords
  const tokenSet = new Set(tokens);
  const rawLower = raw.toLowerCase();

  if (
    tokenSet.has('auth') || tokenSet.has('authentication') || tokenSet.has('login') ||
    tokenSet.has('register') || tokenSet.has('password') || tokenSet.has('jwt') ||
    tokenSet.has('token') || tokenSet.has('bcrypt') || tokenSet.has('session') ||
    tokenSet.has('user') || rawLower.includes('auth')
  ) {
    categories.add('auth');
  }

  if (
    tokenSet.has('mongo') || tokenSet.has('mongodb') || tokenSet.has('mongoose') ||
    tokenSet.has('database') || tokenSet.has('db') || tokenSet.has('schema') ||
    tokenSet.has('model') || tokenSet.has('query') || tokenSet.has('crud') ||
    tokenSet.has('find') || tokenSet.has('create')
  ) {
    categories.add('database');
  }

  if (
    methods.length > 0 || paths.length > 0 || tokenSet.has('api') ||
    tokenSet.has('endpoint') || tokenSet.has('route') || tokenSet.has('router') ||
    tokenSet.has('controller') || tokenSet.has('handler') || tokenSet.has('middleware')
  ) {
    categories.add('api');
  }

  if (
    tokenSet.has('env') || tokenSet.has('environment') || tokenSet.has('variable') ||
    tokenSet.has('config') || tokenSet.has('configuration') || tokenSet.has('port') ||
    tokenSet.has('settings') || tokenSet.has('dotenv') || rawLower.includes('.env')
  ) {
    categories.add('config');
  }

  if (
    tokenSet.has('start') || tokenSet.has('startup') || tokenSet.has('entry') ||
    tokenSet.has('initialize') || tokenSet.has('boot') || tokenSet.has('main') ||
    tokenSet.has('server')
  ) {
    categories.add('entry_point');
  }

  if (
    tokenSet.has('import') || tokenSet.has('package') || tokenSet.has('dependency') ||
    tokenSet.has('dependencies') || tokenSet.has('library') || tokenSet.has('libraries')
  ) {
    categories.add('dependencies');
  }

  return {
    tokens: Array.from(new Set(tokens)),
    methods,
    paths,
    categories,
  };
};

/**
 * Safely extracts bounded source code lines from a file on disk.
 *
 * @param {string} extractedDir - Root directory of the extracted repository
 * @param {string} relativeFilePath - Relative path within repository
 * @param {number} targetStartLine - Desired 1-based start line
 * @param {number} targetEndLine - Desired 1-based end line
 * @param {number} [padding=2] - Extra lines before and after for context
 * @returns {Promise<{ snippet: string, startLine: number, endLine: number, totalLines: number } | null>}
 */
export const extractSafeSnippet = async (
  extractedDir,
  relativeFilePath,
  targetStartLine = 1,
  targetEndLine = 1,
  padding = RETRIEVAL_LIMITS.CONTEXT_PADDING_LINES,
  fileCache = null
) => {
  try {
    const safePath = assertSafePath(extractedDir, relativeFilePath);
    if (!fs.existsSync(safePath)) return null;

    let rawContent;
    if (fileCache && fileCache.has(safePath)) {
      rawContent = fileCache.get(safePath);
    } else {
      const stats = await fs.promises.stat(safePath);
      if (stats.isDirectory() || stats.size > 1024 * 1024) return null; // Skip files > 1MB
      rawContent = await fs.promises.readFile(safePath, 'utf8');
      if (fileCache) fileCache.set(safePath, rawContent);
    }

    const lines = rawContent.split(/\r?\n/);
    const totalLines = lines.length;

    if (totalLines === 0) return null;

    // Apply 1-based bounds with surrounding padding
    const boundedStart = Math.max(1, targetStartLine - padding);
    const boundedEnd = Math.min(
      totalLines,
      Math.max(targetEndLine + padding, boundedStart + RETRIEVAL_LIMITS.MAX_SNIPPET_LINES - 1)
    );

    // Limit snippet to MAX_SNIPPET_LINES
    const clampedEnd = Math.min(boundedEnd, boundedStart + RETRIEVAL_LIMITS.MAX_SNIPPET_LINES - 1);
    const snippetLines = lines.slice(boundedStart - 1, clampedEnd);

    return {
      snippet: snippetLines.join('\n'),
      startLine: boundedStart,
      endLine: clampedEnd,
      totalLines,
    };
  } catch (err) {
    return null;
  }
};

/**
 * Retrieves grounded source code evidence based on user query and static analysis data.
 *
 * @param {object} repository - Repository Mongoose document
 * @param {object} analysis - AnalysisResult Mongoose document
 * @param {string} question - User question
 * @returns {Promise<{ evidence: Array<object>, hasSufficientEvidence: boolean, intent: object }>}
 */
export const retrieveCodeEvidence = async (repository, analysis, question) => {
  const intent = analyzeQueryIntent(question);
  const extractedDir = getRepoExtractedDir(repository.storageKey);

  const candidates = []; // Array of candidate evidence objects with scores

  const { tokens, methods, paths, categories } = intent;

  // Helper to normalize file paths
  const norm = (p) => (p || '').replace(/\\/g, '/');

  // Map to hold internal dependency relationships for expansion
  const importMap = new Map(); // sourceFile -> Set<targetFile>
  const reverseImportMap = new Map(); // targetFile -> Set<sourceFile>

  if (analysis?.dependencies?.internalImports) {
    for (const imp of analysis.dependencies.internalImports) {
      const src = norm(imp.sourceFile);
      const tgt = norm(imp.targetFile);
      if (!importMap.has(src)) importMap.set(src, new Set());
      importMap.get(src).add(tgt);

      if (!reverseImportMap.has(tgt)) reverseImportMap.set(tgt, new Set());
      reverseImportMap.get(tgt).add(src);
    }
  }

  // 1. Check API Endpoints
  if (analysis?.apiEndpoints && analysis.apiEndpoints.length > 0) {
    for (const ep of analysis.apiEndpoints) {
      let score = 0;
      const epPath = (ep.path || '').toLowerCase();
      const epMethod = (ep.method || '').toUpperCase();
      const epHandler = (ep.handlerName || '').toLowerCase();
      const epFile = norm(ep.file).toLowerCase();

      // Check method match
      if (methods.includes(epMethod)) score += 40;

      // Check path match
      for (const p of paths) {
        if (epPath === p) score += 90;
        else if (epPath.includes(p) || p.includes(epPath)) score += 60;
      }

      // Check handler name against query tokens
      for (const token of tokens) {
        if (epHandler === token) score += 80;
        else if (epHandler.includes(token)) score += 50;
        if (epPath.includes(token)) score += 40;
        if (epFile.includes(token)) score += 30;
      }

      // Intent category bonus
      if (categories.has('api')) score += 20;

      if (score >= 40) {
        candidates.push({
          filePath: ep.file,
          startLine: ep.startLine,
          endLine: ep.endLine,
          evidenceType: 'endpoint_handler',
          symbolName: `${ep.method} ${ep.path} -> ${ep.handlerName}`,
          retrievalMethod: 'endpoint_match',
          score,
        });

        // Expand to handler definition in imported files
        if (ep.handlerName && ep.handlerName !== 'anonymous') {
          const matchingSymbols = (analysis.symbols || []).filter(
            (s) => s.name.toLowerCase() === epHandler
          );
          for (const sym of matchingSymbols) {
            candidates.push({
              filePath: sym.file,
              startLine: sym.startLine,
              endLine: sym.endLine,
              evidenceType: 'function_definition',
              symbolName: sym.name,
              retrievalMethod: 'endpoint_handler_expansion',
              score: score + 15, // High priority because this is the actual handler logic
            });
          }
        }
      }
    }
  }

  // 2. Check Database Interactions & Models
  if (analysis?.databaseInteractions && analysis.databaseInteractions.length > 0) {
    for (const db of analysis.databaseInteractions) {
      let score = 0;
      const modelLower = (db.modelName || '').toLowerCase();
      const opLower = (db.operationType || '').toLowerCase();
      const fileLower = norm(db.file).toLowerCase();

      for (const token of tokens) {
        if (modelLower === token) score += 85;
        else if (modelLower.includes(token)) score += 45;
        if (opLower.includes(token)) score += 35;
        if (fileLower.includes(token)) score += 30;
      }

      if (categories.has('database')) score += 30;

      if (score >= 40) {
        candidates.push({
          filePath: db.file,
          startLine: db.startLine,
          endLine: db.endLine,
          evidenceType: 'database_operation',
          symbolName: `${db.modelName}.${db.operationType}`,
          retrievalMethod: 'database_match',
          score,
        });
      }
    }
  }

  // 3. Check Domain Symbols (Functions, Classes, Methods)
  if (analysis?.symbols && analysis.symbols.length > 0) {
    for (const sym of analysis.symbols) {
      let score = 0;
      const symNameLower = sym.name.toLowerCase();
      const fileLower = norm(sym.file).toLowerCase();

      // Check exact symbol match
      for (const token of tokens) {
        if (symNameLower === token) {
          score += 95;
        } else if (symNameLower.includes(token)) {
          score += 50;
        }
        if (fileLower.includes(token)) {
          score += 30;
        }
      }

      // Check auth intent match
      if (categories.has('auth')) {
        if (
          symNameLower.includes('auth') || symNameLower.includes('login') ||
          symNameLower.includes('register') || symNameLower.includes('token') ||
          symNameLower.includes('password') || symNameLower.includes('jwt') ||
          fileLower.includes('auth') || fileLower.includes('user')
        ) {
          score += 55;
        }
      }

      // Check entry point or startup intent
      if (categories.has('entry_point')) {
        if (
          symNameLower.includes('start') || symNameLower.includes('init') ||
          symNameLower.includes('listen') || symNameLower.includes('app')
        ) {
          score += 45;
        }
      }

      if (sym.isExported) score += 10;

      if (score >= 45) {
        candidates.push({
          filePath: sym.file,
          startLine: sym.startLine,
          endLine: sym.endLine,
          evidenceType: sym.type === 'class' ? 'class_definition' : 'function_definition',
          symbolName: sym.name,
          retrievalMethod: 'symbol_match',
          score,
        });

        // Related file expansion via dependency graph (depth = 1)
        const currentFile = norm(sym.file);
        const importedFiles = importMap.get(currentFile) || new Set();
        for (const targetFile of importedFiles) {
          // If the imported file has matching symbols or models, add with expansion score
          const relatedSymbols = (analysis.symbols || []).filter(
            (s) => norm(s.file) === targetFile
          );
          for (const rSym of relatedSymbols.slice(0, 2)) {
            candidates.push({
              filePath: rSym.file,
              startLine: rSym.startLine,
              endLine: rSym.endLine,
              evidenceType: 'function_definition',
              symbolName: rSym.name,
              retrievalMethod: 'dependency_expansion',
              score: Math.max(score - 20, 35),
            });
          }
        }
      }
    }
  }

  // 4. Check Application Entry Points
  if (analysis?.entryPoints && analysis.entryPoints.length > 0) {
    for (const ep of analysis.entryPoints) {
      let score = 0;
      const pathLower = norm(ep.path).toLowerCase();
      const descLower = (ep.description || '').toLowerCase();

      for (const token of tokens) {
        if (pathLower.includes(token)) score += 50;
        if (descLower.includes(token)) score += 30;
      }

      if (categories.has('entry_point') && ep.type === 'application-server') score += 60;
      if (categories.has('config') && ep.type === 'configuration') score += 50;

      if (score >= 40) {
        candidates.push({
          filePath: ep.path,
          startLine: ep.startLine || 1,
          endLine: ep.endLine || Math.min(30, ep.startLine + 25),
          evidenceType: 'entry_point',
          symbolName: ep.type,
          retrievalMethod: 'entry_point_match',
          score,
        });
      }
    }
  }

  // 5. Check Repository Files (e.g., config files, manifests, environment templates)
  const fileList = repository.fileList || [];
  for (const f of fileList) {
    let score = 0;
    const fPathLower = norm(f.path).toLowerCase();
    const fNameLower = (f.name || '').toLowerCase();

    // Check environment / config query intent
    if (categories.has('config')) {
      if (
        fNameLower.includes('.env') || fNameLower.includes('config') ||
        fNameLower === 'package.json' || fPathLower.includes('config')
      ) {
        score += 65;
      }
    }

    // Check auth files
    if (categories.has('auth')) {
      if (fNameLower.includes('auth') || fPathLower.includes('auth')) {
        score += 55;
      }
    }

    // General token match against filename
    for (const token of tokens) {
      if (fNameLower === token || fNameLower.startsWith(token)) {
        score += 50;
      } else if (fPathLower.includes(token)) {
        score += 30;
      }
    }

    if (score >= 50 && !f.isBinary) {
      candidates.push({
        filePath: f.path,
        startLine: 1,
        endLine: Math.min(45, 50),
        evidenceType: 'configuration',
        symbolName: f.name,
        retrievalMethod: 'file_keyword_match',
        score,
      });
    }
  }

  // 6. Deduplicate & Merge Overlapping Candidates
  // Group candidates by filePath
  const candidatesByFile = new Map();
  for (const c of candidates) {
    const key = norm(c.filePath);
    if (!candidatesByFile.has(key)) candidatesByFile.set(key, []);
    candidatesByFile.get(key).push(c);
  }

  const prioritizedRanges = [];
  for (const [filePath, items] of candidatesByFile.entries()) {
    // Sort items by score descending
    items.sort((a, b) => b.score - a.score);

    // Merge overlapping or adjacent ranges within the same file
    const merged = [];
    for (const item of items) {
      const existing = merged.find(
        (m) =>
          Math.max(item.startLine, m.startLine) <= Math.min(item.endLine, m.endLine) + 5
      );

      if (existing) {
        // Expand existing range and keep highest score
        existing.startLine = Math.min(existing.startLine, item.startLine);
        existing.endLine = Math.max(existing.endLine, item.endLine);
        existing.score = Math.max(existing.score, item.score);
        if (!existing.symbolName && item.symbolName) existing.symbolName = item.symbolName;
      } else {
        merged.push({ ...item });
      }
    }

    prioritizedRanges.push(...merged);
  }

  // Sort all merged candidates by score descending
  prioritizedRanges.sort((a, b) => b.score - a.score);

  // 7. Enforce File and Snippet Limits
  const selectedRanges = [];
  const selectedFiles = new Set();

  for (const item of prioritizedRanges) {
    if (selectedFiles.size >= RETRIEVAL_LIMITS.MAX_FILES && !selectedFiles.has(item.filePath)) {
      continue;
    }
    selectedFiles.add(item.filePath);
    selectedRanges.push(item);

    if (selectedRanges.length >= RETRIEVAL_LIMITS.MAX_SNIPPETS) {
      break;
    }
  }

  // 8. Extract authoritatively bounded snippets from actual files on disk
  const evidence = [];
  const fileCache = new Map();
  let totalContextChars = 0;
  let evidenceCounter = 1;

  for (const item of selectedRanges) {
    const snippetResult = await extractSafeSnippet(
      extractedDir,
      item.filePath,
      item.startLine,
      item.endLine,
      RETRIEVAL_LIMITS.CONTEXT_PADDING_LINES,
      fileCache
    );

    if (snippetResult && snippetResult.snippet.trim().length > 0) {
      const charCount = snippetResult.snippet.length;

      // Check context budget
      if (totalContextChars + charCount > RETRIEVAL_LIMITS.MAX_CONTEXT_CHARS && evidence.length > 0) {
        break;
      }

      evidence.push({
        id: `ev_${evidenceCounter++}`,
        filePath: item.filePath.replace(/\\/g, '/'),
        startLine: snippetResult.startLine,
        endLine: snippetResult.endLine,
        evidenceType: item.evidenceType || 'source_excerpt',
        symbolName: item.symbolName || null,
        snippet: snippetResult.snippet,
        retrievalMethod: item.retrievalMethod || 'context_match',
        score: item.score,
        verification: 'source_verified',
      });

      totalContextChars += charCount;
    }
  }

  // Determine if evidence is sufficient
  const hasSufficientEvidence = evidence.length > 0 && evidence[0].score >= 40;

  return {
    evidence,
    hasSufficientEvidence,
    intent: {
      tokens,
      methods,
      paths,
      categories: Array.from(categories),
    },
  };
};

export default {
  RETRIEVAL_LIMITS,
  analyzeQueryIntent,
  extractSafeSnippet,
  retrieveCodeEvidence,
};
