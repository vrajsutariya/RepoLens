/**
 * RepoLens Predefined FAQ Knowledge Base & Fallback System
 *
 * Provides authoritative, predefined answers to frequently asked questions about RepoLens,
 * static code analysis, architecture visualization, and system operations.
 * Used as an offline fallback when Google Gemini is unconfigured, rate-limited, timing out, or unavailable.
 */

export const FAQ_ENTRIES = [
  {
    id: 'what-is-repolens',
    question: 'What is RepoLens?',
    category: 'General & Overview',
    aliases: [
      'what is repolens',
      'what does repolens do',
      'tell me about repolens',
      'repolens overview',
      'about repolens',
    ],
    keywords: ['repolens', 'about', 'overview', 'purpose', 'platform', 'concept', 'what'],
    summary: 'RepoLens is an AI-powered code intelligence platform built with the MERN stack and Google Gemini for instant codebase understanding.',
    answer: `### What is RepoLens?

**RepoLens** is an AI-powered code intelligence and architecture exploration platform built with MongoDB, Express.js, React 19, Node.js, and the Google Gemini API.

Key capabilities include:
- **Instant Repository Ingestion**: Upload a \`.zip\` archive or provide a public Git remote URL.
- **Deep Static Code Intelligence**: Extracts Abstract Syntax Trees (ASTs), exported functions, TypeScript interfaces, React components, and Express routes without executing untrusted code.
- **Interactive Architecture Graphs**: Visualizes module imports, circular dependencies, API execution flows, and database interactions using React Flow.
- **AI-Powered Onboarding Guides**: Synthesizes verified repository facts, setup instructions, entry points, reading orders, and redacted environment configurations.
- **Evidence-Grounded Codebase Q&A**: Answers architectural and implementation questions with strict source code line citations and anti-hallucination guarantees.`,
  },
  {
    id: 'how-to-import',
    question: 'How do I import a repository?',
    category: 'Ingestion',
    aliases: [
      'how do i import a repository',
      'how to import repo',
      'how do i upload a repo',
      'upload zip',
      'import git repo',
      'how to upload a repository',
      'clone github repo',
    ],
    keywords: ['import', 'upload', 'zip', 'git', 'github', 'clone', 'ingest', 'repository', 'url'],
    summary: 'You can import repositories by dragging and dropping a .zip file (up to 25MB) or entering a public Git HTTPS URL.',
    answer: `### How to Import a Repository

RepoLens supports two ingestion workflows from the Ingestion Dashboard:

1. **ZIP Archive Upload**:
   - Drag and drop or browse to select a \`.zip\` file from your local machine.
   - Safety limit: Maximum archive size is **25MB** (up to 100MB uncompressed).
   - RepoLens validates the archive structure, guards against ZIP Slip path traversal, and safely extracts files into isolated storage.

2. **Public Git HTTPS Import**:
   - Enter a public Git repository URL (e.g. \`https://github.com/owner/repository\`).
   - RepoLens performs SSRF verification to block private or loopback IP ranges, executes a shallow clone (\`--depth 1\`), and indexes all source files.

Once ingested, the static analysis pipeline runs automatically to detect languages, frameworks, entry points, and code symbols.`,
  },
  {
    id: 'how-analysis-works',
    question: 'How does repository analysis work?',
    category: 'Code Intelligence',
    aliases: [
      'how does repository analysis work',
      'how does code analysis work',
      'how does repolens analyze code',
      'static analysis pipeline',
      'code intelligence pipeline',
    ],
    keywords: ['analysis', 'analyze', 'pipeline', 'ast', 'babel', 'symbols', 'parsing', 'static'],
    summary: 'RepoLens uses deterministic static analysis (Babel AST parsing and heuristic scanners) to discover symbols, endpoints, and dependencies.',
    answer: `### How Repository Analysis Works

RepoLens analyzes codebases through a multi-stage static analysis pipeline:

1. **File Indexing & Language Detection**: Scans repository files, filters binary assets and vendor directories (\`node_modules\`, \`.git\`, \`dist\`), and calculates language percentages.
2. **Framework & Manifest Discovery**: Inspects \`package.json\`, \`requirements.txt\`, and config files to identify frameworks (Express, React, Mongoose, etc.) and entry points.
3. **AST Symbol Extraction**: Uses Babel parser (\`@babel/parser\`) for JavaScript/TypeScript and regex heuristics for Python to extract exported functions, classes, React components, and methods with precise line ranges.
4. **API Route Mapping**: Analyzes Express route declarations (\`app.get\`, \`router.post\`) to locate HTTP methods, path strings, and controller handler bindings.
5. **Database Interaction Mapping**: Identifies Mongoose models, schemas, and query operations (\`find\`, \`create\`, \`updateOne\`, \`deleteMany\`).
6. **Dependency Graph Construction**: Traces internal import/export paths to build a directed graph and detect circular dependency cycles.`,
  },
  {
    id: 'dashboard-metrics',
    question: 'What information does the dashboard display?',
    category: 'User Interface',
    aliases: [
      'what information does the dashboard display',
      'what does the dashboard show',
      'dashboard metrics',
      'dashboard overview',
      'what is on the dashboard',
    ],
    keywords: ['dashboard', 'information', 'metrics', 'display', 'show', 'stats', 'overview'],
    summary: 'The dashboard displays repository summary stats, detected languages, framework tags, entry points, and access to all code intelligence tabs.',
    answer: `### What the Dashboard Displays

The RepoLens repository dashboard provides high-level metrics and deep-dive workspaces:

- **Summary Header**: Displays repository name, source type (ZIP or Git remote), total file count, total size, and detected programming languages breakdown.
- **Framework & Runtime Badges**: Highlights identified technologies such as Express.js, React, Mongoose, or Python.
- **Entry Points**: Surfaces detected application servers (e.g., \`server.js\`, \`index.js\`) and manifest start scripts.
- **Navigation Tabs**:
  - **Overview**: Summary metrics, file distribution, and analysis status.
  - **Onboarding Guide**: AI-generated setup and reading order guides.
  - **Architecture Graphs**: Interactive React Flow visual diagrams.
  - **AI Assistant**: Grounded Q&A with evidence citations.
  - **Files**: Complete directory tree browser with syntax-highlighted code viewer.
  - **Symbols**: Filterable index of functions, classes, and components.
  - **Dependencies**: Internal import relationships, external packages, and circular dependency flags.
  - **API Endpoints**: Catalog of all detected HTTP routes and handlers.
  - **Database**: Mongoose models and query operations.`,
  },
  {
    id: 'architecture-understanding',
    question: 'How do I understand the project architecture?',
    category: 'Architecture',
    aliases: [
      'how do i understand the project architecture',
      'project architecture',
      'explore architecture',
      'view architecture graph',
      'how to see architecture',
    ],
    keywords: ['architecture', 'graph', 'flow', 'diagram', 'visualize', 'react flow', 'system'],
    summary: 'Navigate to the Architecture Graphs tab to explore interactive React Flow diagrams of module imports, API flows, and database interactions.',
    answer: `### How to Understand Project Architecture

RepoLens visualizes software architecture through three interactive React Flow graph views in the **Architecture Graphs** tab:

1. **Module Dependency Graph**:
   - Visualizes file-to-file import relationships.
   - Flags entry points with distinctive icons and highlights circular dependency cycles in red.
   - Grouping filters allow isolating controllers, routes, models, or services.

2. **API Execution Flow**:
   - Traces execution pipelines: **HTTP Route** \`->\` **Controller Handler** \`->\` **Database Operation**.
   - Helps developers understand how incoming client requests map to business logic and data persistence.

3. **Database Interactions**:
   - Maps database models (e.g., \`User\`, \`Order\`) to the controller files and service modules that query or mutate them.

Interactive controls include zoom, pan, fit-to-view, minimap navigation, and clicking any node to inspect its source location.`,
  },
  {
    id: 'explore-dependencies',
    question: 'How do I explore file dependencies?',
    category: 'Code Intelligence',
    aliases: [
      'how do i explore file dependencies',
      'file dependencies',
      'view dependencies',
      'circular dependencies',
      'explore imports',
    ],
    keywords: ['dependencies', 'imports', 'external', 'circular', 'modules', 'relationships'],
    summary: 'Use the Dependencies tab or the Module Dependency Graph to view internal file imports, external npm packages, and circular dependency cycles.',
    answer: `### How to Explore File Dependencies

RepoLens provides two ways to inspect dependencies:

1. **Dependencies Tab**:
   - **Internal File Imports**: Shows which files import from other local modules with resolved relative paths.
   - **External Packages**: Lists third-party dependencies extracted from \`package.json\` or import statements (e.g., \`express\`, \`mongoose\`, \`cors\`).
   - **Circular Dependencies**: Statically identifies cyclic import chains (e.g., \`A.js -> B.js -> A.js\`) that can cause runtime initialization bugs.

2. **Module Graph View**:
   - In the **Architecture Graphs** tab, select **Module Dependencies** to visually explore dependencies as a connected node graph with directional edges.`,
  },
  {
    id: 'understand-api-routes',
    question: 'How can I understand API routes?',
    category: 'Code Intelligence',
    aliases: [
      'how can i understand api routes',
      'api routes',
      'api endpoints',
      'view endpoints',
      'how to find api routes',
    ],
    keywords: ['api', 'routes', 'endpoints', 'express', 'http', 'get', 'post', 'handlers'],
    summary: 'Open the API Endpoints tab to see all statically detected HTTP routes, methods, handler functions, and source line numbers.',
    answer: `### How to Understand API Routes

To explore the application's RESTful API:

1. **API Endpoints Tab**:
   - Displays a filterable catalog of all detected HTTP endpoints.
   - For each route, you will see the **HTTP Method** (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`), the **Route Path** (\`/api/users\`), the **Controller Handler Name** (\`getUsers\`), and the exact file and line number where it is declared.
   - Search by method, route prefix, or handler name.

2. **API Execution Flow Graph**:
   - In **Architecture Graphs**, toggle to **API Flow** to trace how an endpoint routes into controllers and calls database queries.
   - Click any route or handler node to jump directly to that source file in the built-in code viewer.`,
  },
  {
    id: 'use-ai-qa',
    question: 'How do I use the AI Q&A feature?',
    category: 'AI Assistant',
    aliases: [
      'how do i use the ai q&a feature',
      'how to use ai assistant',
      'ask question',
      'ai assistant',
      'how does codebase qa work',
    ],
    keywords: ['ai', 'qa', 'assistant', 'ask', 'question', 'chat', 'gemini', 'evidence', 'citations'],
    summary: 'In the AI Assistant tab, enter questions about the codebase to receive answers grounded in verified code snippets with source line citations.',
    answer: `### How to Use the AI Q&A Feature

1. Navigate to the **AI Assistant** tab in the repository workspace.
2. Enter a natural language question about the codebase (e.g., *"Where is authentication handled?"*, *"How does user registration work?"*, or *"Which endpoints interact with the database?"*).
3. Alternatively, click any of the **Suggested Questions** tailored dynamically to the repository's detected architecture.
4. RepoLens retrieves matching code snippets via hybrid search, feeds them to Google Gemini with strict grounding constraints, and returns:
   - An executive summary and technical answer.
   - Distinctions between verified code facts and architectural inferences.
   - Clickable source code citations referencing exact files and line ranges.
   - Recommended repository files for further inspection.
5. If generation takes too long, you can click the red **Stop** button at any time to cancel the request.`,
  },
  {
    id: 'gemini-unavailable',
    question: 'What happens when the Gemini API is unavailable?',
    category: 'System & Reliability',
    aliases: [
      'what happens when the gemini api is unavailable',
      'gemini down',
      'gemini unavailable',
      'ai offline',
      'what if gemini fails',
      'faq fallback',
    ],
    keywords: ['unavailable', 'gemini', 'fallback', 'offline', 'error', 'timeout', 'quota', 'faq'],
    summary: 'When Gemini is unconfigured, rate-limited, timing out, or unavailable, RepoLens activates the Predefined FAQ Fallback System without crashing.',
    answer: `### What Happens When Gemini Is Unavailable

RepoLens is built with graceful offline degradation:

1. **Predefined FAQ Fallback**: If the Gemini API key is missing, or if Gemini returns a rate-limit error (HTTP 429), authentication error (HTTP 401), gateway timeout (HTTP 504), or server error (HTTP 503), RepoLens automatically serves answers from this Predefined FAQ Knowledge Base.
2. **Clear Attribution**: Fallback answers are clearly badged as **FAQ Answer / Offline Help** so developers never mistake static help for live AI generation.
3. **No Fabricated Citations**: Fallback responses do not invent fake file paths or line numbers.
4. **Deterministic Core Functions**: All static analysis, AST symbol exploration, dependency graphs, file viewers, and architecture diagrams continue to function completely independently of the Gemini API.`,
  },
  {
    id: 'onboarding-guide',
    question: 'How does the onboarding guide help developers?',
    category: 'Onboarding',
    aliases: [
      'how does the onboarding guide help developers',
      'onboarding guide',
      'setup assistant',
      'how to onboard',
      'developer setup guide',
    ],
    keywords: ['onboarding', 'guide', 'setup', 'developers', 'readme', 'environment', 'reading order'],
    summary: 'The Onboarding Guide tab synthesizes repository facts, setup commands, redacted .env variables, and recommended reading order for new developers.',
    answer: `### How the Onboarding Guide Helps Developers

The **Onboarding Guide** tab reduces developer onboarding time from days to minutes:

- **Executive Architecture Overview**: Explains the core purpose, technologies, and high-level structure of the repository.
- **Quickstart Setup Commands**: Gathers installation and development scripts directly from \`package.json\` and \`README.md\`.
- **Sanitized Environment Variables**: Parses \`.env.example\` templates and provides descriptions for all required configuration variables, with real secrets (like \`JWT_SECRET\`) automatically redacted to safe placeholders.
- **Recommended Reading Order**: Suggests a sequential path through key files (e.g., config -> server entry point -> routes -> models) so new engineers know where to start reading.
- **Stale State Invalidation**: If the repository is re-analyzed with new files, the guide is automatically flagged as stale and can be regenerated with one click.`,
  },
  {
    id: 'find-file-or-symbol',
    question: 'How can I find a file or symbol?',
    category: 'Code Intelligence',
    aliases: [
      'how can i find a file or symbol',
      'find file',
      'search symbols',
      'search function',
      'browse files',
    ],
    keywords: ['find', 'search', 'file', 'symbol', 'function', 'class', 'component', 'lookup'],
    summary: 'Use the Files tab to explore the directory tree and code viewer, or use the Symbols tab to search and filter functions and classes.',
    answer: `### How to Find a File or Symbol

1. **Finding Files**:
   - Open the **Files** tab. The left sidebar displays an interactive file tree with folder expansion and search filtering.
   - Click any text file (JavaScript, TypeScript, Python, JSON, Markdown, etc.) to view its formatted source code with syntax highlighting and line numbers.

2. **Finding Symbols (Functions, Classes, Methods)**:
   - Open the **Symbols** tab.
   - Filter by symbol type (**Function**, **Async Function**, **Class**, **Method**, **React Component**).
   - Use the real-time search bar to search by function or class name.
   - Click the source citation link on any symbol card to immediately jump to that exact file and line in the file viewer.`,
  },
  {
    id: 'delete-repository',
    question: 'How do I delete a repository?',
    category: 'Ingestion & Management',
    aliases: [
      'how do i delete a repository',
      'delete repo',
      'remove repository',
      'how to delete a repo',
      'delete project',
    ],
    keywords: ['delete', 'remove', 'trash', 'purge', 'destroy', 'clean'],
    summary: 'Click the trash icon in the repository sidebar or the Delete Repo button in the header bar, then confirm in the dialog.',
    answer: `### How to Delete a Repository

To permanently delete an imported repository:

1. Locate the repository in the **Repositories sidebar** on the left and click the **trash icon**, or click the **Delete Repo** button in the top repository header bar.
2. A confirmation modal will appear: *"Are you sure you want to delete [Repository Name]? This will permanently remove this repository and its stored RepoLens analysis. This action cannot be undone."*
3. Click **Delete Repository** to confirm.
4. RepoLens will safely delete:
   - The repository record from the database.
   - All associated static analysis results, symbol records, and dependency graphs.
   - Any generated onboarding guides.
   - The extracted files and archive stored on disk.
5. If the deleted repository was currently open, you will be redirected back to the Ingestion Dashboard.`,
  },
  {
    id: 'why-analysis-fails',
    question: 'Why might repository analysis fail?',
    category: 'System & Troubleshooting',
    aliases: [
      'why might repository analysis fail',
      'analysis failed',
      'analysis error',
      'why does analysis fail',
      'troubleshoot analysis',
    ],
    keywords: ['fail', 'error', 'troubleshoot', 'broken', 'corrupt', 'timeout', 'limits', 'why'],
    summary: 'Analysis can fail due to oversized archives (>25MB), corrupt ZIP files, missing package manifests, or temporary database disconnection.',
    answer: `### Why Repository Analysis Might Fail

Common reasons for analysis failures and how to resolve them:

1. **Archive Size Limits**:
   - The uploaded ZIP archive exceeds the **25MB** upload limit or **100MB** uncompressed size limit.
   - *Fix*: Exclude large binary assets, video files, or heavy documentation folders before compressing.

2. **Corrupted or Malformed ZIP File**:
   - The archive is truncated, password-protected, or not in valid PKZIP format.
   - *Fix*: Ensure the ZIP file is created with standard zip compression without encryption.

3. **Unsupported Language Dialects**:
   - While RepoLens supports JS, TS, JSX, TSX, Python, and generic text files, highly customized or invalid syntax can trip AST parsers.
   - *Fix*: RepoLens uses robust graceful degradation, but ensure files contain valid syntax.

4. **Database Connection Issues**:
   - MongoDB is not running or temporarily unreachable at \`127.0.0.1:27017\`.
   - *Fix*: Ensure MongoDB is active and verify \`MONGODB_URI\` in \`server/.env\`. Click **Retry Analysis** once connected.`,
  },
  {
    id: 'troubleshoot-gemini-key',
    question: 'How can I troubleshoot a missing or invalid Gemini API key?',
    category: 'System & Configuration',
    aliases: [
      'how can i troubleshoot a missing or invalid gemini api key',
      'fix gemini api key',
      'missing gemini key',
      'gemini auth error',
      'how to set gemini key',
      'gemini config',
    ],
    keywords: ['gemini_api_key', 'api key', 'google ai studio', 'configuration', 'troubleshoot', 'invalid', 'missing'],
    summary: 'Add GEMINI_API_KEY=your_key in server/.env, ensure no leading/trailing spaces, and restart the backend server.',
    answer: `### How to Troubleshoot Gemini API Configuration

To configure or fix your Google Gemini API key:

1. **Get an API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com) and create an API key.

2. **Configure Backend Environment**:
   - Open \`server/.env\` in your project root.
   - Set:
     \`\`\`env
     GEMINI_API_KEY=your_actual_api_key_here
     GEMINI_MODEL=gemini-3.8-flash
     \`\`\`
   - Ensure there are no surrounding quotes, spaces, or newline characters.

3. **Secrets Isolation**:
   - **Never** add \`GEMINI_API_KEY\` to \`client/.env\` or client-side files (\`VITE_*\`). The key must remain exclusively on the backend server.

4. **Restart the Server**:
   - Restart the Node backend server to reload environment variables.
   - Check the terminal logs to verify successful startup.`,
  },
  {
    id: 'code-execution-safety',
    question: 'Does RepoLens execute the uploaded repository\'s code?',
    category: 'Security',
    aliases: [
      'does repolens execute the uploaded repository\'s code',
      'does repolens run code',
      'is uploaded code executed',
      'code execution',
      'security sandbox',
    ],
    keywords: ['execute', 'run', 'sandbox', 'security', 'safe', 'untrusted', 'script', 'malware'],
    summary: 'No. RepoLens is strictly a static analysis and AI reasoning engine. It never executes or compiles uploaded code.',
    answer: `### Does RepoLens Execute Uploaded Code?

**No, absolutely not.**

Security is a foundational design principle of RepoLens:
- **Pure Static Analysis**: RepoLens inspects source code purely as raw text and Abstract Syntax Trees.
- **No Runtime Execution**: RepoLens never invokes \`node\`, \`npm install\`, \`python\`, \`sh\`, \`eval()\`, or any build scripts inside ingested repositories.
- **Path Traversal Defense**: All archive extraction rigorously checks against ZIP Slip attacks and path traversal sequences (\`../\`).
- **SSRF Protection**: Remote Git imports validate IP destinations to block loopback and cloud metadata endpoints.
- **Prompt Injection Defense**: Repository content, README files, and code comments are treated strictly as untrusted raw text, never as instructions to the AI model.`,
  },
];

/**
 * Normalizes input text for deterministic matching (lowercase, strip punctuation, collapse whitespace).
 *
 * @param {string} text - Raw input string
 * @returns {string} Normalized string
 */
export const normalizeText = (text = '') => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Common query token replacements and synonyms
 */
const SYNONYMS = {
  repo: 'repository',
  repos: 'repository',
  upload: 'import',
  uploaded: 'import',
  cloning: 'import',
  clone: 'import',
  remove: 'delete',
  erasing: 'delete',
  erase: 'delete',
  trash: 'delete',
  destroy: 'delete',
  docs: 'onboarding',
  setup: 'onboarding',
  endpoints: 'routes',
  endpoint: 'routes',
  api: 'routes',
  calls: 'routes',
  dependencies: 'imports',
  modules: 'architecture',
  graphs: 'architecture',
  diagrams: 'architecture',
  executing: 'execute',
  running: 'execute',
};

/**
 * Matches a user question against the FAQ Knowledge Base.
 *
 * @param {string} question - Developer question string
 * @returns {{ matched: object|null, confidence: number, suggestedFaqs: Array<object> }}
 */
export const matchFaqQuestion = (question = '') => {
  if (!question || typeof question !== 'string') {
    return {
      matched: null,
      confidence: 0,
      suggestedFaqs: FAQ_ENTRIES.slice(0, 3).map((f) => ({ id: f.id, question: f.question })),
    };
  }

  const normalizedInput = normalizeText(question);
  if (!normalizedInput) {
    return {
      matched: null,
      confidence: 0,
      suggestedFaqs: FAQ_ENTRIES.slice(0, 3).map((f) => ({ id: f.id, question: f.question })),
    };
  }

  // Tokenize and expand synonyms
  const rawTokens = normalizedInput.split(' ').filter((t) => t.length > 2);
  const expandedTokens = new Set();
  for (const token of rawTokens) {
    expandedTokens.add(token);
    if (SYNONYMS[token]) {
      expandedTokens.add(SYNONYMS[token]);
    }
  }

  let bestMatch = null;
  let highestScore = 0;

  const scoredFaqs = FAQ_ENTRIES.map((faq) => {
    // 1. Direct Alias Match (exact normalized phrase match)
    for (const alias of faq.aliases) {
      const normAlias = normalizeText(alias);
      if (normalizedInput === normAlias) {
        return { faq, score: 1.0 };
      }
      if (normalizedInput.includes(normAlias) || normAlias.includes(normalizedInput)) {
        return { faq, score: 0.95 };
      }
    }

    // 2. Keyword & Token Overlap Scoring
    let tokenMatches = 0;
    for (const keyword of faq.keywords) {
      if (expandedTokens.has(keyword)) {
        tokenMatches += 1;
      }
    }

    const keywordScore = faq.keywords.length > 0 ? tokenMatches / faq.keywords.length : 0;
    const tokenScore = expandedTokens.size > 0 ? (tokenMatches * 1.5) / expandedTokens.size : 0;
    const combinedScore = Math.min(0.9, (keywordScore * 0.5) + (tokenScore * 0.5));

    return { faq, score: combinedScore };
  });

  // Sort by score descending
  scoredFaqs.sort((a, b) => b.score - a.score);

  if (scoredFaqs.length > 0 && scoredFaqs[0].score >= 0.5) {
    bestMatch = scoredFaqs[0].faq;
    highestScore = scoredFaqs[0].score;
  }

  // Top 3 suggested questions
  const suggestedFaqs = scoredFaqs.slice(0, 3).map((item) => ({
    id: item.faq.id,
    question: item.faq.question,
    category: item.faq.category,
  }));

  return {
    matched: bestMatch,
    confidence: highestScore,
    suggestedFaqs,
  };
};

export default {
  FAQ_ENTRIES,
  normalizeText,
  matchFaqQuestion,
};
