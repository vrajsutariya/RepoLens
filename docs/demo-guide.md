# RepoLens — Hackathon Live Demonstration Guide

> **RepoLens: Give Every Developer Instant Codebase Understanding**  
> AI-powered code intelligence platform built with MongoDB, Express.js, React 19, Node.js, and Google Gemini API.

---

## 1. Quick Setup & Environment Preparation

### Prerequisites

- **Node.js**: v20+ or v24+
- **MongoDB**: Local instance running on `127.0.0.1:27017`
- **Git**: Installed and available in PATH
- **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com)

### Step 1: Configure Backend Environment

In `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/repolens
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

### Step 2: Configure Client Environment

In `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 3: Start the Application

From the repository root:

```bash
npm run dev
```

_(Runs backend server on `http://localhost:5000` and Vite dev server on `http://localhost:5173` concurrently)._

Alternatively, start services individually in two terminals:

```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

Verify backend health in browser or terminal:

```bash
curl http://localhost:5000/api/health
# Response: { "success": true, "data": { "status": "ok", "services": { "database": "connected" } } }
```

Open frontend in browser: `http://localhost:5173`.

---

## 2. Recommended Demonstration Repositories

| Repository Source                                         | Type           | Description                                  | Best Used For                                                       |
| :-------------------------------------------------------- | :------------- | :------------------------------------------- | :------------------------------------------------------------------ |
| **`https://github.com/octocat/Hello-World`**              | Public Git URL | Minimal GitHub repository with README        | Ultra-fast Git ingestion demo (clones in <2s)                       |
| **`fixture-repo.zip`** _(or any small Express/React app)_ | ZIP Archive    | Express routes, controllers, Mongoose models | Demonstrating full AST symbols, API flow, DB models, and onboarding |

> [!TIP]
> **Offline / Conference Wi-Fi Strategy**:
> If conference Wi-Fi is unreliable or GitHub is throttled, prepare a small ZIP archive of any Express project (or create one using the test fixtures). Uploading a ZIP bypasses network external dependencies and executes deterministically.

---

## 3. Step-by-Step 5-Minute Live Demo Script

### Act 1: The Problem & Ingestion (0:00 – 1:00)

1. **Explain the Pain Point**:
   > _"When a developer joins a new team or investigates an open-source library, they waste hours deciphering directory trees, figuring out setup steps, and tracing execution flows. RepoLens gives every developer instant codebase understanding."_
2. **Ingest Repository**:
   - Paste a public Git URL (`https://github.com/octocat/Hello-World`) or drag-and-drop a ZIP archive into the dropzone.
   - Point out the real-time stage progression: _Upload -> Security Verification -> Archive Extraction -> File Indexing & AST Analysis_.
   - Mention the built-in defenses: **Zip Slip protection**, **SSRF validation**, and **zero code execution**.

### Act 2: Code Intelligence & Architecture Overview (1:00 – 2:00)

1. **Repository Summary Bar**:
   - Show the detected language breakdown (e.g., JavaScript 65%, TypeScript 25%, CSS 10%).
   - Show total indexed files and disk size.
2. **Overview Tab**:
   - Highlight detected frameworks (Express, Mongoose, React).
   - Point out identified entry points (e.g., `server.js` or `package.json`).
3. **Symbols & API Endpoints Tabs**:
   - Click the **API Endpoints** tab to show detected HTTP routes (`GET /api/users`, `POST /api/auth/login`).
   - Click the **Symbols** tab to show AST-extracted functions, classes, and exported handlers with exact line ranges.
   - Click any symbol's file link to jump directly to the code viewer with cited lines highlighted.

### Act 3: Evidence-Grounded Gemini Codebase Q&A (2:00 – 3:15)

1. **Open "AI Assistant" Tab**:
   - Show the dynamic suggested questions tailored specifically to detected repository features (e.g., _"Where is user authentication handled?"_).
2. **Ask a Codebase Question**:
   - Click a suggestion or type: _"What happens when an API endpoint is requested?"_ or _"Where is the database connected?"_.
3. **Showcase Grounding & Verification**:
   - **Executive Summary**: Direct 1-2 sentence answer.
   - **Grounded Claims**: Point out the badge distinction between `Verified Fact` (backed by cited AST code) vs `Architectural Inference`.
   - **Inspect Citations**: Click an evidence citation pill (`[ev_1] server.js:L1-L25`) to expand the verified code snippet and click "Inspect in Code Viewer" to navigate directly to the line range.
   - Highlight that RepoLens **never invents filenames or lines** — all citations are verified on the backend against disk files before rendering.

### Act 4: Interactive Architecture Visualization (3:15 – 4:15)

1. **Open "Architecture Graphs" Tab**:
   - The React Flow canvas visualizes the repository structure using dark Git-styled nodes.
2. **Graph Types**:
   - **Module Dependency Graph**: Shows internal file import relationships with entry points highlighted in orange (`#F05033`).
   - **API Execution Flow**: Traces incoming HTTP route -> controller handler -> database query.
   - **Database Graph**: Connects controllers and services to Mongoose schemas and models.
3. **Interactivity**:
   - Use Zoom controls, Pan, and Fit View.
   - Search for a specific file or symbol using the toolbar search filter.
   - Click any node to open the **Graph Details Panel**: inspect symbol lines, jump to code viewer, or click _"Ask AI about this component"_.

### Act 5: AI Onboarding Guide & Setup Assistant (4:15 – 5:00)

1. **Open "Onboarding Guide" Tab**:
   - Click **Generate Onboarding Guide**.
   - Show the comprehensive onboarding workspace:
     - **Purpose & Architecture**: Core application objectives and high-level structure.
     - **Verified Setup Commands**: Install and development commands derived from package scripts with safety warnings for install commands.
     - **Environment Variable Checklist**: Shows discovered `.env.example` keys with **sensitive secrets redacted** and a one-click _"Export .env Template"_ button.
     - **Recommended Reading Order**: Prioritized stepper guiding a new engineer through the most important files first with start/end lines.
     - **Request Flow Lifecycle**: Step-by-step execution path from HTTP request to response.

---

## 4. Key Talking Points for Judges & Technical Evaluation

| Category                              | RepoLens Implementation & Defense                                                                                                                                                                                                                                                                                      |
| :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sandboxed Security**                | RepoLens is a static analysis and AI reasoning engine — **it never executes uploaded code**. Cloned repositories and extracted ZIPs are strictly contained inside isolated storage directories. Path traversal (`../`) and ZIP Slip attacks are rejected immediately via canonical path resolution (`assertSafePath`). |
| **SSRF Defense**                      | Public Git imports are restricted to verified hosts (`github.com`, `gitlab.com`, `bitbucket.org`). URLs undergo DNS resolution prior to cloning to reject loopback (`127.0.0.1`), private RFC1918 subnets, and cloud metadata endpoints (`169.254.169.254`).                                                           |
| **Grounding & Hallucination Defense** | Gemini prompts are strictly structured with retrieved AST symbols, routes, and disk excerpts. A server-side authoritative validator (`qaValidator.js`) strips any fabricated evidence IDs, downgrades unevidenced claims from facts to inferences, and verifies line numbers against disk before returning responses.  |
| **Secrets & Privacy**                 | The Gemini API key and MongoDB credentials reside strictly on the backend. In the Onboarding guide, credentials detected in `.env` templates (like `JWT_SECRET` or AWS keys) are redacted to safe placeholders (`<your_jwt_secret_here>`).                                                                             |
| **Performance & Context Economy**     | Rather than dumping raw files into LLM context, RepoLens extracts targeted AST slices (`@babel/parser`), filters stop words, expands dependencies via graph adjacency, and applies a strict 20,000-character context budget.                                                                                           |

---

## 5. Live Demo Failure Recovery & Contingencies

### Scenario A: Gemini API Quota or Rate Limit (HTTP 429)

- **Symptom**: Red error toast: _"Gemini API rate limit or quota exceeded."_
- **Recovery**:
  1. Explain to judges: _"RepoLens includes structured rate-limit and quota detection."_
  2. The static intelligence features (Overview, Symbols, Dependencies, API Endpoints, Database, Architecture Graphs, and File Explorer) **continue to work 100% offline** without calling Gemini! Switch to the **Architecture Graphs** or **Symbols** tabs to demonstrate static intelligence.

### Scenario B: Missing Gemini API Key (HTTP 503)

- **Symptom**: Error notification: _"Gemini API key is not configured."_
- **Recovery**:
  1. Add `GEMINI_API_KEY=...` to `server/.env`.
  2. Nodemon automatically restarts the backend server in 1 second.
  3. Refresh the page or click retry.

### Scenario C: Unreliable Public Wi-Fi for Git Clone

- **Symptom**: Git clone times out or fails to resolve DNS.
- **Recovery**:
  1. Switch immediately to the **Upload ZIP** tab.
  2. Drag and drop any local repository archive or fixture ZIP. Ingestion will proceed locally in under 2 seconds.
