# RepoLens — Give Every Developer Instant Codebase Understanding

> **Track:** Code Intelligence  
> **Theme:** Git-inspired Dark Orange-Red & Black  
> **Status:** Stage 4: Gemini-Powered Codebase Q&A & Evidence-Based Answers Complete

---

## 1. Project Overview

**RepoLens** is an intelligent developer tool designed to eliminate onboarding friction and help software engineers understand unfamiliar code repositories instantly. By combining deterministic static code analysis, AST parsing, and Google Gemini AI reasoning, RepoLens reveals:

- Overall project architecture and layered component hierarchy
- Primary languages, frameworks, and build systems
- Core entry points and API route maps
- Extracted symbols (functions, classes, methods, parameters, line numbers)
- Dependency graphs, circular dependency detection, and external package usage
- Database models, schemas, and query operations
- Evidence-backed code context for Gemini AI with verified file and line citations

---

## 2. Technology Stack

- **Frontend:** React 19, Vite 8, React Router DOM v7, Motion (`motion/react` v12), Bootstrap 5, custom CSS design system with CSS custom properties, React Icons, React Hot Toast
- **Visualization Engine:** React Flow (`@xyflow/react`)
- **Backend:** Node.js (v24+), Express.js 5, Mongoose 9, Multer 2, Adm-Zip, `@babel/parser`
- **Database:** MongoDB (persists repository metadata, file trees, and `AnalysisResult` knowledge bases)
- **AI Engine:** Google Gemini API via official `@google/genai` SDK
- **Dev & Test Tooling:** Concurrently, Nodemon, ESLint

---

## 3. Project Directory Structure

```text
RepoLens/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── intelligence/
│   │   │   │   ├── OverviewTab.jsx     # High-level architecture & metrics
│   │   │   │   ├── AiAssistantTab.jsx  # Grounded Gemini Codebase Q&A with inspectable citations (Phase 4)
│   │   │   │   ├── SymbolsTab.jsx      # Searchable & filterable AST symbols
│   │   │   │   ├── DependenciesTab.jsx # Internal imports & declared packages
│   │   │   │   ├── EndpointsTab.jsx    # Express API routes & handlers
│   │   │   │   ├── DatabaseTab.jsx     # Database models, schemas, & queries
│   │   │   │   └── AiContextTab.jsx    # Grounded Gemini AI prompt context
│   │   │   ├── DashboardHeader.jsx     # Hero header with quick actions
│   │   │   ├── FileExplorer.jsx        # Recursive directory tree & file search
│   │   │   ├── FileViewer.jsx          # Monospace code viewer with line numbers & citation highlighting
│   │   │   ├── RepositoryImportPanel.jsx# ZIP upload & Git URL import panel
│   │   │   ├── RepositoryResultsView.jsx# Tabbed intelligence workspace
│   │   │   ├── Sidebar.jsx             # Repositories list & system status
│   │   │   └── StatusBanner.jsx        # Reusable notification banner
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx          # App shell with toast container
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # Primary interactive workspace
│   │   │   └── NotFound.jsx            # 404 route view
│   │   ├── services/
│   │   │   └── api.js                  # Axios client with code intelligence endpoints
│   │   ├── styles/
│   │   │   └── variables.css           # Central design tokens & CSS custom properties
│   │   ├── App.jsx                     # Main routing & health provider
│   │   ├── index.css                   # Global resets, accessibility rules & code styles
│   │   └── main.jsx                    # Client entry point
│   ├── .env.example                    # Client environment template
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js                  # Environment parser & validation
│   │   │   ├── db.js                   # Mongoose connection & status tracker
│   │   │   └── storage.js              # Sandboxed filesystem storage configuration
│   │   ├── controllers/
│   │   │   └── repository.controller.js# Ingestion, file, and code intelligence controllers
│   │   ├── models/
│   │   │   ├── Repository.js           # Repository metadata & raw file index
│   │   │   └── AnalysisResult.js       # Persistent code intelligence results
│   │   ├── routes/
│   │   │   ├── health.routes.js        # GET /api/health endpoint
│   │   │   └── repository.routes.js    # Repository & intelligence endpoints
│   │   ├── services/
│   │   │   ├── code-intelligence/
│   │   │   │   ├── repositoryAnalyzer.js # Analysis pipeline coordinator
│   │   │   │   ├── languageDetector.js   # Language stats, LOC, source classifier
│   │   │   │   ├── frameworkDetector.js  # Manifest & heuristic framework identifier
│   │   │   │   ├── entryPointDetector.js # Server & frontend mount detector
│   │   │   │   ├── symbolExtractor.js    # AST symbol & method extractor (@babel/parser)
│   │   │   │   ├── apiAnalyzer.js        # Express route & handler scanner
│   │   │   │   ├── databaseAnalyzer.js   # Mongoose, Prisma, Sequelize detector
│   │   │   │   ├── dependencyAnalyzer.js # Import mapper & package usage counter
│   │   │   │   ├── relationshipBuilder.js# Dependency graph & cycle detector
│   │   │   │   ├── contextBuilder.js     # Structured Markdown evidence builder for Gemini
│   │   │   │   ├── qaRetrieval.service.js# Hybrid AST & metadata evidence retrieval (Phase 4)
│   │   │   │   ├── qaValidator.js        # Authoritative claim and citation verification (Phase 4)
│   │   │   │   ├── qaService.js          # Grounded prompt construction & Gemini orchestrator (Phase 4)
│   │   │   │   └── suggestedQuestions.service.js # Feature-grounded question generator (Phase 4)
│   │   │   ├── zipIngestion.service.js   # ZIP Slip defense & archive decompression
│   │   │   ├── gitIngestion.service.js   # SSRF validation & depth-1 public Git clone
│   │   │   ├── fileIndexer.service.js    # File walker & hierarchical tree builder
│   │   │   └── gemini.service.js         # Official @google/genai service layer with safety guards
│   │   ├── app.js                      # Express application initialization & middleware
│   │   └── server.js                   # Server startup listener & shutdown hooks
│   ├── test/
│   │   ├── ingestion.test.js           # Automated ingestion verification test suite
│   │   ├── analysis.test.js            # Automated code intelligence test suite
│   │   ├── qa.test.js                  # Automated Gemini codebase Q&A test suite (Phase 4)
│   │   └── run_all.js                  # Unified test runner (59 verified tests)
│   ├── .env.example                    # Server environment template
│   └── package.json
├── docs/
│   └── architecture.md                 # In-depth architectural specification & pipeline
├── .gitignore                          # Multi-tier gitignore protecting secrets & storage
├── AGENTS.md                           # Guidelines & development rules for coding agents
├── README.md                           # Master project documentation
└── package.json                        # Monorepo development scripts via concurrently
```

---

## 4. Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
```bash
# Frontend
cp client/.env.example client/.env

# Backend
cp server/.env.example server/.env
```
Default `server/.env`:
```dotenv
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/repolens
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Run Development Servers
```bash
npm run dev
```
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

### 4. Run Automated Test Suite (59 Test Cases Across 3 Suites)
```bash
npm test
```

---

## 5. API Endpoints

### System Health
- `GET /api/health` — System status, uptime, database state, and Gemini configuration.

### Repository Ingestion
- `POST /api/repositories/upload` — Ingest a repository ZIP archive (multipart/form-data, max 25MB).
- `POST /api/repositories/import` — Ingest a public Git repository (`{ "url": "https://github.com/owner/repo" }`).

### Repository Inspection
- `GET /api/repositories` — List recent ingested repositories.
- `GET /api/repositories/:id` — Retrieve repository metadata.
- `GET /api/repositories/:id/tree` — Retrieve hierarchical file tree.
- `GET /api/repositories/:id/files` — Retrieve flat file listing (supports `?query=` and `?language=`).
- `GET /api/repositories/:id/file?path=...` — Retrieve safe text content with line numbers.

### Code Intelligence (Phase 3)
- `POST /api/repositories/:id/analyze` — Start or rerun static analysis.
- `GET /api/repositories/:id/analysis` — Retrieve complete analysis knowledge base and metrics.
- `GET /api/repositories/:id/languages` — Retrieve detailed language composition and LOC.
- `GET /api/repositories/:id/symbols` — Retrieve functions, classes, and methods (`?query=&type=&file=&page=&limit=`).
- `GET /api/repositories/:id/dependencies` — Retrieve file-to-file and external package dependencies.
- `GET /api/repositories/:id/endpoints` — Retrieve discovered Express routes and handlers.
- `GET /api/repositories/:id/database-interactions` — Retrieve database models, schemas, and queries.
- `GET /api/repositories/:id/context` — Retrieve verified Markdown context prepared for Gemini AI.

### Gemini-Powered Codebase Q&A (Phase 4)
- `POST /api/repositories/:id/ask` — Ask natural-language codebase questions grounded in verified repository evidence. Rate-limited (60 requests / 15m), with structured schema validation and authoritative line citation verification.
- `GET /api/repositories/:id/suggested-questions` — Dynamic questions tailored strictly to detected repository features (authentication, endpoints, database models, startup).

---

## 6. Implementation Status & Roadmap

| Phase | Feature | Status |
| :---: | :--- | :---: |
| **Phase 1** | MERN Foundation, Design System, Health Checks | **Completed** |
| **Phase 2** | Interactive UI, ZIP & Git Repository Ingestion | **Completed** |
| **Phase 3** | **AST Symbol Extraction (@babel/parser)** | **Completed** |
| Phase 3 | **Express API Route & Handler Detection** | **Completed** |
| Phase 3 | **Database Schema, Model & Query Detection** | **Completed** |
| Phase 3 | **Import Dependency Graph & Cycle Detection** | **Completed** |
| Phase 3 | **Intelligence Dashboard (Overview, Symbols, Endpoints, Database)** | **Completed** |
| Phase 3 | **Grounded Gemini AI Context Builder** | **Completed** |
| **Phase 4** | **Gemini-Powered Codebase Q&A Engine (`/ask`)** | **Completed** |
| Phase 4 | **Hybrid Retrieval without Vector DB (AST + Endpoints + Models + Imports)** | **Completed** |
| Phase 4 | **Authoritative Citation & Claim Validation Pipeline** | **Completed** |
| Phase 4 | **Distinction Between Verified Source Facts & Inferences** | **Completed** |
| Phase 4 | **Interactive Code Citation Viewer with Exact Line Highlighting** | **Completed** |
| Phase 4 | **Feature-Grounded Suggested Questions Generator** | **Completed** |
| Phase 4 | **59 Automated Verification Tests Across All Suites** | **Completed** |
