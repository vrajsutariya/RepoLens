import fs from 'fs';
import path from 'path';
import { assertSafePath } from '../../utils/pathSafety.js';

/**
 * Formats byte count to human-readable string (B, KB, MB)
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Deterministically checks if a user question is asking for core extracted repository facts.
 *
 * @param {string} question - Developer query
 * @returns {{ matched: boolean, type: string|null }}
 */
export const matchRepositoryFactQuestion = (question) => {
  if (!question || typeof question !== 'string') {
    return { matched: false, type: null };
  }

  const q = question.toLowerCase().trim();

  // 1. File Count & Project Structure
  if (
    /\b(how many (file|files)|total (file|files)|file count|number of files|how big is (this|the) (repo|repository|codebase))\b/i.test(q) ||
    /\b(project structure|directory structure|folder structure|file structure|what is the structure of this)\b/i.test(q)
  ) {
    return { matched: true, type: 'file_count' };
  }

  // 2. Major Technologies & Frameworks
  if (
    /\b((which|what)\s+(major\s+)?(technolog(y|ies)|frameworks?|tech stack|stack|libraries))\b/i.test(q) ||
    /\b(what (is|are) (the\s+)?(technolog(y|ies)|frameworks?|tech stack)|what is this (project|repo|codebase) built with)\b/i.test(q) ||
    /\b(which technology used|which major technology)\b/i.test(q)
  ) {
    return { matched: true, type: 'major_technologies' };
  }

  // 3. Starting Point / Entry Point
  if (
    /\b((starting point|entry point|main entry|start file|which is starting point))\b/i.test(q) ||
    /\b(where does (the|this) (app|application|code|project) start|where do i start reading)\b/i.test(q) ||
    /\b(how (do i|to) (run|start|launch) (the|this)|how does (the app|it) (boot|initialize|start))\b/i.test(q)
  ) {
    return { matched: true, type: 'starting_point' };
  }

  // 4. Dependencies & Packages
  if (
    /\b((what|which)\s+(dependencies|packages|libraries|modules)\s+(does|are|is))\b/i.test(q) ||
    /\b(installed packages|dependency list|npm packages|pip packages|external libraries)\b/i.test(q)
  ) {
    return { matched: true, type: 'dependencies' };
  }

  // 5. API Endpoints & Routes
  if (
    /\b((what|which)\s+(api\s+)?(endpoints|routes))\b/i.test(q) ||
    /\b((what|which)\s+apis?\s+(are|exist|is|available|defined))\b/i.test(q) ||
    /\b(list of (api\s+)?(routes|endpoints|apis)|available (api\s+)?(routes|endpoints|apis)|defined (api\s+)?(routes|endpoints))\b/i.test(q) ||
    /\b(what api routes|which api routes|api routes defined|show me the endpoints)\b/i.test(q)
  ) {
    return { matched: true, type: 'api_endpoints' };
  }

  return { matched: false, type: null };
};

/**
 * Safely reads a file snippet from the extracted repository directory.
 */
const safeReadSnippet = async (extractedDir, relativePath, maxLines = 30) => {
  if (!extractedDir || !relativePath) return null;
  try {
    const fullPath = assertSafePath(extractedDir, relativePath);
    if (!fs.existsSync(fullPath)) return null;

    const content = await fs.promises.readFile(fullPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const slice = lines.slice(0, maxLines);
    return {
      snippet: slice.join('\n'),
      startLine: 1,
      endLine: Math.min(lines.length, maxLines),
    };
  } catch {
    return null;
  }
};

/**
 * Answers a core repository fact question strictly using verified extracted static analysis data.
 *
 * @param {object} repository - Repository document
 * @param {object} analysis - AnalysisResult document
 * @param {string} questionType - Matched question type
 * @param {string} extractedDir - Path to extracted files on disk
 * @returns {Promise<object>} Complete validated Q&A result object
 */
export const answerRepositoryFactQuestion = async (
  repository,
  analysis,
  questionType,
  extractedDir
) => {
  const fileList = repository.fileList || [];
  const detectedLanguages = repository.detectedLanguages || [];
  const frameworks = analysis?.frameworks || [];
  const entryPoints = analysis?.entryPoints || [];
  const declaredDeps = analysis?.dependencies?.declared || [];
  const apiEndpoints = analysis?.apiEndpoints || [];
  const dbInteractions = analysis?.databaseInteractions || [];

  const evidence = [];
  const claims = [];
  let answer = '';
  let summary = '';
  const suggestedFiles = [];

  // Helper to add snippet evidence
  const attachEvidence = async (relPath, type, symbolName) => {
    const fileData = await safeReadSnippet(extractedDir, relPath);
    if (fileData) {
      const evId = `ev_fact_${evidence.length + 1}`;
      evidence.push({
        id: evId,
        filePath: relPath,
        startLine: fileData.startLine,
        endLine: fileData.endLine,
        evidenceType: type,
        symbolName: symbolName || relPath,
        snippet: fileData.snippet,
      });
      return evId;
    }
    return null;
  };

  if (questionType === 'file_count') {
    summary = `Repository "${repository.name}" contains ${repository.totalFiles} indexed files (${formatBytes(repository.totalSize)}).`;

    // Discover top-level directories
    const topDirs = new Set();
    for (const f of fileList) {
      const parts = f.path.split('/');
      if (parts.length > 1) {
        topDirs.add(parts[0]);
      }
    }
    const topDirsList = Array.from(topDirs).sort().slice(0, 10);

    const langLines = detectedLanguages.length > 0
      ? detectedLanguages.map((l) => `- **${l.language}:** ${l.count} files (${l.percentage}%)`).join('\n')
      : '- Language statistics pending indexing.';

    const dirLines = topDirsList.length > 0
      ? topDirsList.map((d) => `- \`${d}/\` — Component / module directory`).join('\n')
      : '- Flat root directory layout.';

    answer = `### 📁 Repository Structure & File Overview

- **Repository Name:** \`${repository.name}\`
- **Source Type:** ${repository.sourceType === 'git' ? `Public Git Remote (\`${repository.sourceUrl || 'Git'}\`)` : 'Uploaded ZIP Archive'}
- **Total Indexed Files:** **${repository.totalFiles} source files**
- **Total Uncompressed Size:** **${formatBytes(repository.totalSize)}**

#### 📊 Language Distribution:
${langLines}

#### 📂 Primary Directory Layout:
${dirLines}

#### 🔑 Key Project Files:
${fileList.filter((f) => /^(readme|package\.json|server|index|app|\.env)/i.test(path.basename(f.path))).slice(0, 6).map((f) => `- \`${f.path}\` (${formatBytes(f.size)})`).join('\n') || '- No special manifest files identified.'}`;

    // Attach manifest or readme as evidence
    const manifestFile = fileList.find((f) => f.path === 'package.json' || f.path.endsWith('/package.json') || f.path === 'README.md');
    if (manifestFile) {
      const evId = await attachEvidence(manifestFile.path, 'manifest', manifestFile.path);
      claims.push({
        text: `Repository "${repository.name}" contains ${repository.totalFiles} files across ${detectedLanguages.length} detected languages.`,
        type: evId ? 'source_fact' : 'architectural_inference',
        evidenceIds: evId ? [evId] : [],
      });
      suggestedFiles.push(manifestFile.path);
    }
  } else if (questionType === 'major_technologies') {
    summary = `Major technologies: ${frameworks.map((f) => f.name).join(', ') || detectedLanguages.map((l) => l.language).join(', ') || 'Standard Web Stack'}.`;

    const fwLines = frameworks.length > 0
      ? frameworks.map((f) => `- **${f.name}** (${f.category.toUpperCase()}): Detected via \`${f.evidence}\` with ${f.confidence} confidence.`).join('\n')
      : '- No specialized frameworks flagged; standard vanilla library composition.';

    const depLines = declaredDeps.slice(0, 12).map((d) => `- \`${d.name}\`${d.version ? ` (${d.version})` : ''}`).join('\n') || '- No external dependencies declared.';

    const langNames = detectedLanguages.map((l) => `${l.language} (${l.percentage}%)`).join(', ');

    answer = `### ⚡ Major Technologies & Tech Stack

This codebase is built using the following core languages and verified frameworks:

#### 💻 Programming Languages:
- **Primary Languages:** ${langNames || 'General Source Code'}

#### 🛠️ Detected Frameworks & Libraries:
${fwLines}

#### 📦 Key Runtime Dependencies:
${depLines}

#### 🏗️ Architecture Assessment:
${frameworks.some((f) => f.name.toLowerCase() === 'express') ? '- **Backend:** Express.js REST API server with structured routing.' : ''}
${frameworks.some((f) => f.name.toLowerCase() === 'react') ? '- **Frontend:** React interactive user interface component tree.' : ''}
${frameworks.some((f) => f.name.toLowerCase() === 'mongoose') ? '- **Database Persistence:** MongoDB document storage via Mongoose schemas.' : ''}
- **Code Organization:** Modular file architecture with static ES module / CommonJS imports.`;

    const manifest = fileList.find((f) => f.path === 'package.json' || f.path.endsWith('/package.json') || f.path.endsWith('requirements.txt'));
    if (manifest) {
      const evId = await attachEvidence(manifest.path, 'manifest', 'dependencies');
      claims.push({
        text: `Detected frameworks include ${frameworks.map((f) => f.name).join(', ') || 'core web libraries'}.`,
        type: evId ? 'source_fact' : 'architectural_inference',
        evidenceIds: evId ? [evId] : [],
      });
      suggestedFiles.push(manifest.path);
    }
  } else if (questionType === 'starting_point') {
    const mainEntry = entryPoints[0] || fileList.find((f) => /^(server|index|app|main)\.(js|ts|jsx|py)$/i.test(path.basename(f.path)));
    const entryPath = mainEntry?.path || 'index.js';
    summary = `The application starting point is \`${entryPath}\`.`;

    const entryPointsList = entryPoints.length > 0
      ? entryPoints.map((ep) => `- \`${ep.path}\` (**${ep.type}**): ${ep.description}`).join('\n')
      : `- \`${entryPath}\`: Primary application entry file.`;

    answer = `### 🚀 Application Starting Point

The primary execution entry point for this repository is **\`${entryPath}\`**.

#### 🏁 Detected Entry Points:
${entryPointsList}

#### 📋 How to Boot and Run:
1. Ensure dependencies are installed:
\`\`\`bash
npm install # or pip install -r requirements.txt
\`\`\`
2. Launch development / application server:
\`\`\`bash
npm run dev # or npm start / node ${entryPath}
\`\`\`

#### 🔍 Boot Sequence Summary:
- Application bootstrapping begins in \`${entryPath}\`.
- Route registrations, environment setup, and service listeners are configured here.`;

    const evId = await attachEvidence(entryPath, 'entry_point', entryPath);
    claims.push({
      text: `Application execution boots through primary entry point "${entryPath}".`,
      type: evId ? 'source_fact' : 'architectural_inference',
      evidenceIds: evId ? [evId] : [],
    });
    suggestedFiles.push(entryPath);
  } else if (questionType === 'dependencies') {
    summary = `Repository declares ${declaredDeps.length} external package dependencies.`;

    const depList = declaredDeps.length > 0
      ? declaredDeps.map((d) => `- **\`${d.name}\`**: ${d.version || 'latest'} (${d.type || 'production'})`).join('\n')
      : 'No external package dependencies declared.';

    answer = `### 📦 Project Dependencies & External Packages

This repository declares **${declaredDeps.length}** external package dependencies:

${depList}

- **Package Manifest:** \`${fileList.find((f) => f.path.includes('package.json'))?.path || 'package.json'}\``;

    const manifest = fileList.find((f) => f.path === 'package.json' || f.path.endsWith('/package.json'));
    if (manifest) {
      const evId = await attachEvidence(manifest.path, 'manifest', 'dependencies');
      claims.push({
        text: `Declared dependencies total ${declaredDeps.length} external packages.`,
        type: evId ? 'source_fact' : 'architectural_inference',
        evidenceIds: evId ? [evId] : [],
      });
      suggestedFiles.push(manifest.path);
    }
  } else if (questionType === 'api_endpoints') {
    summary = `Discovered ${apiEndpoints.length} declared API endpoints.`;

    const epRows = apiEndpoints.slice(0, 15).map((ep) =>
      `| \`${ep.method}\` | \`${ep.path}\` | \`${ep.handlerName || 'anonymous'}\` | \`${ep.file}\` |`
    ).join('\n');

    answer = `### 🌐 Discovered API Routes & Endpoints

Static code analysis discovered **${apiEndpoints.length}** API route declarations:

| Method | Endpoint Path | Handler | File |
| :--- | :--- | :--- | :--- |
${epRows || '| N/A | No endpoints detected | N/A | N/A |'}

${apiEndpoints.length > 15 ? `\n*Showing top 15 of ${apiEndpoints.length} discovered endpoints.*` : ''}`;

    if (apiEndpoints.length > 0) {
      const firstEp = apiEndpoints[0];
      const evId = await attachEvidence(firstEp.file, 'route_declaration', firstEp.path);
      claims.push({
        text: `Repository declares ${apiEndpoints.length} API endpoints across router files.`,
        type: evId ? 'source_fact' : 'architectural_inference',
        evidenceIds: evId ? [evId] : [],
      });
      suggestedFiles.push(firstEp.file);
    }
  }

  // Fallback suggested files from repository
  if (suggestedFiles.length === 0) {
    for (const f of fileList.slice(0, 3)) {
      if (!f.isBinary) suggestedFiles.push(f.path);
    }
  }

  return {
    answer,
    summary,
    claims,
    evidence,
    inferences: [
      'Grounded directly in authoritative static repository extraction and code intelligence indexing.',
    ],
    limitations: [
      'Static analysis inspects declared code and manifest files without executing repository runtime code.',
    ],
    suggestedFiles: Array.from(new Set(suggestedFiles)),
    isFactAnswer: true,
    source: 'static_code_intelligence',
  };
};

export default {
  matchRepositoryFactQuestion,
  answerRepositoryFactQuestion,
};
