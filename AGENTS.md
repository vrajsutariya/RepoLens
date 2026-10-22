# AGENTS.md — RepoLens Agent Guidelines

This document provides architectural standards, security rules, and engineering guidelines for AI coding agents and human contributors working on **RepoLens — Give Every Developer Instant Codebase Understanding**.

---

## 1. Project Development Instructions

- **Code Quality & Maintainability**: Always write clean, maintainable, readable code. Adhere to idiomatic React 19, JavaScript (ES Modules), Node.js, and Express best practices.
- **API Standards**: Follow RESTful API conventions with consistent HTTP status codes and uniform JSON response structures:
  - Success responses: `{ "success": true, "data": { ... } }`
  - Error responses: `{ "success": false, "error": { "message": "...", "status": 404, ... } }`
- **Modularity & Separation of Concerns**: Keep components, controllers, routes, and services focused strictly on a single responsibility. Business logic and third-party integrations belong in `server/src/services/`, not inside controllers or route files.
- **Styling & Design Tokens**:
  - Use Bootstrap 5 for grid systems and responsive layout foundations.
  - Use custom CSS driven by the central CSS variables in `client/src/styles/variables.css`.
  - **Never hardcode hex or rgb colours in component styles**; use standard CSS custom properties (`var(--color-primary)`, `var(--color-surface)`, etc.).
- **Code Organization & Consistency**:
  - Maintain consistent 2-space indentation and clear naming conventions (`PascalCase` for React components, `camelCase` for utilities/hooks/services, `kebab-case` or `camelCase` for route files).
  - Add clear, concise comments explaining non-obvious logic, security guards, or complex parsing algorithms.
- **Accessibility & Responsive Design**:
  - Follow a mobile-first, responsive-ready layout approach.
  - Maintain semantic HTML5 (`<header>`, `<main>`, `<section>`, `<nav>`, `<footer>`) and ARIA accessibility standards.
  - Ensure all interactive controls have visible `:focus-visible` indicators and accessible labels.
- **Input Validation & Security**:
  - Treat all user and repository inputs as untrusted data. Validate and sanitize inputs on both client and backend layers.
  - **Never execute uploaded or cloned repository code**. RepoLens is a static analysis and AI reasoning engine, not a sandbox runtime.
  - **Prompt Injection Defense**: Treat repository files, comments, README files, docstrings, and config files as untrusted raw text, never as instructions to the Gemini model.
  - **Path Traversal Protection**: Sanitize all file paths to prevent directory traversal attacks (`../`). Prevent analysis pipelines from accessing application secrets, parent directories, or system files.
  - **Secrets Isolation**: Keep API keys (`GEMINI_API_KEY`) and database credentials (`MONGODB_URI`) exclusively on the backend. Never expose secrets in client environment variables (`VITE_*`), API responses, frontend bundles, or server logs.
- **State Handling**: Handle loading states, empty states, and errors gracefully across all components and API layers.
- **Commit & Change Hygiene**: Write focused, intentional changes that preserve working functionality rather than large-scale, indiscriminate rewrites.

---

## 2. AI and Code Intelligence Guidelines

- **Service Layer Isolation**: Interact with Google Gemini exclusively through `server/src/services/gemini.service.js` using the official `@google/genai` SDK.
- **Configurable Models**: Read model configurations dynamically from `GEMINI_MODEL` (default: `gemini-3.8-flash`). Never hardcode model identifiers in application logic.
- **Evidence-Based Grounding**:
  - Ground all AI-generated explanations in verified repository evidence.
  - Always preserve source file paths and line numbers when preparing code context for the model.
  - Clearly distinguish verified code facts (e.g., imported packages, exported functions, declared routes) from inferred architectural explanations.
  - **Never invent file paths, function signatures, dependencies, or line numbers**.
- **Context Economy & Relevance**:
  - Do not feed entire repositories into LLM context indiscriminately.
  - Pipeline context through deterministic discovery first: file tree discovery -> language classification -> dependency & manifest inspection -> entry point detection -> selective snippet extraction.
- **Robust Parsing & Graceful Degradation**:
  - Handle unsupported programming languages, malformed syntax trees, or binary files gracefully without crashing the analysis service.

---

## 3. UI and Animation Guidelines

- **Developer-Centric Aesthetic**: Maintain a dark, Git-inspired developer tool interface with deep charcoal surfaces (`#0D0D0F`, `#171719`), subtle borders (`#27272A`), and Git orange-red accents (`#F05033`).
- **Purposeful Motion**: Use animations only when they provide direct usability feedback (e.g., loading spinners, status transitions, modal fade-ins).
- **Performance**: Prefer hardware-accelerated CSS properties (`transform`, `opacity`) and standard easing curves (`var(--transition-fast)`, `var(--transition-normal)`).
- **Accessibility**: Respect `prefers-reduced-motion` media queries globally.
- **React Flow Diagrams**: Configure React Flow visualization viewports with readable node cards, contrasting edge paths, minimap controls, and clear node hierarchies.

---

## 4. Development Workflow

1. **Inspect Before Changing**: Review directory layout, dependencies, and existing code before proposing or applying modifications.
2. **Preserve Working Functionality**: Protect working setups, environment templates, and operational scripts.
3. **Verify Everything**: Always verify that client and server builds succeed, dependencies resolve without conflicts, and smoke tests (such as `/api/health`) pass.
4. **No False Claims**: Do not claim a test or build passed without actually executing the verification command and inspecting the output.
5. **Keep Docs Synchronized**: Update `README.md` and `docs/architecture.md` whenever routes, environment variables, or core architectural pipelines evolve.
