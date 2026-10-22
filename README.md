# RepoLens — Give Every Developer Instant Codebase Understanding

> **Track:** Code Intelligence  
> **Theme:** Git-inspired Dark Orange-Red & Black  
> **Status:** Stage 1 Foundation Complete

---

## 1. Project Overview

**RepoLens** is an intelligent developer tool designed to eliminate onboarding friction and help software engineers understand unfamiliar code repositories instantly. By combining deterministic static code analysis with Google Gemini AI reasoning and interactive React Flow visualization, RepoLens reveals:

- Overall project architecture and layered component hierarchy
- Primary languages, frameworks, and build systems
- Core entry points and API route maps
- Dependency graphs and external service connections
- Dynamic execution flows and request lifecycles
- Evidence-backed answers to developer queries with file and line citations

---

## 2. Technology Stack

- **Frontend:** React 19, Vite 8, React Router DOM v7, Bootstrap 5, custom CSS design system with CSS custom properties, React Icons, React Hot Toast
- **Visualization Engine:** React Flow (`@xyflow/react`)
- **Backend:** Node.js (v24+), Express.js 5, Helmet, CORS, Morgan, Express Rate Limit
- **Database:** MongoDB with Mongoose (gracefully optional in standalone mode)
- **AI Engine:** Google Gemini API via official `@google/genai` SDK
- **Dev Tooling:** Concurrently, Nodemon, ESLint

---

## 3. Project Directory Structure

```text
RepoLens/
├── client/
│   ├── public/
│   │   ├── favicon.svg          # Git-inspired RepoLens branding icon
│   │   └── ...
│   ├── src/
│   │   ├── assets/              # Static media assets
│   │   ├── components/          # Reusable UI components (Header, Footer, StatusBanner)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Application layouts (MainLayout)
│   │   ├── pages/               # Views (WorkspacePlaceholder, NotFound)
│   │   ├── services/            # Axios API client (api.js)
│   │   ├── styles/
│   │   │   └── variables.css    # Central design tokens & CSS custom properties
│   │   ├── utils/               # Client-side helper functions
│   │   ├── App.jsx              # Main routing & global status provider
│   │   ├── index.css            # Global resets, accessibility rules, Bootstrap overrides
│   │   └── main.jsx             # React DOM root entry point
│   ├── .env.example             # Client environment template
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js           # Environment parser & validation
│   │   │   └── db.js            # Mongoose connection & status reporter
│   │   ├── controllers/         # Express route handlers
│   │   ├── middleware/
│   │   │   ├── errorHandler.js  # Centralized error formatting middleware
│   │   │   └── notFoundHandler.js # 404 handler for unknown routes
│   │   ├── models/              # Mongoose data models
│   │   ├── routes/
│   │   │   └── health.routes.js # /api/health endpoint
│   │   ├── services/
│   │   │   └── gemini.service.js# Gemini API integration boundary (@google/genai)
│   │   ├── utils/               # Sanitizers & path utilities
│   │   ├── app.js               # Express application initialization & middleware
│   │   └── server.js            # Server startup listener & shutdown hooks
│   ├── .env.example             # Server environment template
│   └── package.json
├── docs/
│   └── architecture.md          # In-depth architectural specification & pipeline stages
├── .gitignore                   # Multi-tier gitignore protecting secrets & build artifacts
├── AGENTS.md                    # Guidelines & development rules for coding agents
├── README.md                    # Project overview and setup documentation
└── package.json                 # Monorepo development scripts via concurrently
```

---

## 4. Prerequisites

- **Node.js**: `v20.x` or higher (developed on `v24.x`)
- **npm**: `v8.x` or higher
- **MongoDB** *(Optional for Stage 1)*: Local MongoDB instance or MongoDB Atlas URI
- **Google Gemini API Key** *(Optional for initial setup, required for AI analysis in future stages)*

---

## 5. Installation

Install all dependencies across the root, client, and server workspaces in one command:

```bash
npm run install:all
```

Or install individually:

```bash
# Root dependencies
npm install

# Client dependencies
cd client && npm install

# Server dependencies
cd server && npm install
```

---

## 6. Environment Configuration

### Client Environment (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```bash
cp client/.env.example client/.env
```

Default configuration:
```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

> **Security Rule:** Never put backend secrets or `GEMINI_API_KEY` into any client `.env` or `VITE_` variable.

### Server Environment (`server/.env`)

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

Configuration variables:
```dotenv
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

- `MONGODB_URI`: Leave empty for standalone development; the server will start cleanly and report database status as `not_configured`.
- `GEMINI_API_KEY`: Google AI Studio API key. Stored exclusively on the backend.
- `GEMINI_MODEL`: Model identifier (e.g., `gemini-2.5-flash`, `gemini-1.5-pro`).

---

## 7. Starting the Application

### Start Both Frontend and Backend Concurrently

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend:** [http://localhost:5000](http://localhost:5000)

### Start Services Individually

```bash
# Frontend only
npm run client

# Backend only (with nodemon hot-reload)
npm run server
```

### Build Frontend for Production

```bash
npm run build
```

---

## 8. Health Endpoint Usage

Verify backend status and service health:

```bash
curl http://localhost:5000/api/health
```

Example JSON response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "RepoLens API",
    "timestamp": "2026-10-22T02:35:12.067Z",
    "uptime": 45.2,
    "environment": "development",
    "services": {
      "database": "not_configured",
      "gemini": {
        "configured": false,
        "model": "gemini-2.5-flash"
      }
    }
  }
}
```

---

## 9. Google Gemini AI Service Architecture

Gemini capabilities are abstracted in `server/src/services/gemini.service.js`.

- Initialized through the official `@google/genai` SDK.
- The backend never dumps whole repositories into the AI context.
- Instead, the planned pipeline extracts deterministic file structures, entry points, and curated snippets with verified file paths and line ranges.
- If `GEMINI_API_KEY` is omitted, the application runs normally; invoking an AI feature triggers a descriptive configuration error rather than an unhandled crash.

---

## 10. Implementation Status & Next Stages

| Phase | Feature | Status |
| :---: | :--- | :---: |
| **Phase 1** | **MERN Clean Up & Foundation** |  **Completed** |
| Phase 1 | Design System (CSS variables & Git theme) |  **Completed** |
| Phase 1 | Health Check & Centralized Middleware |  **Completed** |
| Phase 1 | Gemini Service Boundary & Config Isolation |  **Completed** |
| Phase 1 | Root Orchestration (`concurrently`) |  **Completed** |
| **Phase 2** | **Repository Ingestion Engine** (Zip upload + Git URL clone) | *Next Phase* |
| Phase 2 | Path Sandboxing & AST Manifest Parsing | *Next Phase* |
| **Phase 3** | **Interactive React Flow Visualization** | *Upcoming* |
| Phase 3 | Architecture Diagram & Dependency Graphs | *Upcoming* |
| **Phase 4** | **Gemini AI Grounded Codebase Q&A** | *Upcoming* |
| Phase 4 | File & Line Citations with In-Browser Code Inspector | *Upcoming* |
