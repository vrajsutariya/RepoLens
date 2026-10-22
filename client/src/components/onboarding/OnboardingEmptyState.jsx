import { useState } from 'react';
import { motion } from 'motion/react';
import {
  VscBook,
  VscSparkle,
  VscChecklist,
  VscServerProcess,
  VscTerminal,
  VscLayers,
  VscWarning,
  VscFiles,
  VscFileCode,
  VscGraph,
  VscHubot,
  VscCheck,
  VscInfo,
  VscLinkExternal,
  VscSymbolMethod,
  VscArrowRight,
} from 'react-icons/vsc';
import SetupCommand from './SetupCommand';

/**
 * Formats byte size into human readable string (KB, MB)
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Derives a recommended initial reading order from extracted fileList and entry points.
 */
const deriveInitialReadingOrder = (fileList = [], entryPoints = []) => {
  const readingList = [];
  const seenPaths = new Set();

  // 1. Documentation
  const readme = fileList.find((f) => /^(readme|readme\.md|readme\.txt|readme\.rst)$/i.test(f.path));
  if (readme) {
    seenPaths.add(readme.path);
    readingList.push({
      order: 1,
      path: readme.path,
      category: 'Documentation',
      purpose: 'Project documentation, setup instructions, and high-level architectural overview.',
      size: readme.size,
    });
  }

  // 2. Project Manifest
  const manifest = fileList.find(
    (f) => /^(package\.json|requirements\.txt|pipfile|cargo\.toml|pom\.xml|go\.mod)$/i.test(f.path)
  );
  if (manifest && !seenPaths.has(manifest.path)) {
    seenPaths.add(manifest.path);
    readingList.push({
      order: readingList.length + 1,
      path: manifest.path,
      category: 'Project Manifest',
      purpose: 'Declares external package dependencies, runtime configuration, and build/run scripts.',
      size: manifest.size,
    });
  }

  // 3. Primary Application Entry Point
  const primaryEntry =
    entryPoints.find((ep) => ep.type === 'application-server' || ep.type === 'frontend-mount') ||
    entryPoints[0];

  if (primaryEntry && !seenPaths.has(primaryEntry.path)) {
    seenPaths.add(primaryEntry.path);
    readingList.push({
      order: readingList.length + 1,
      path: primaryEntry.path,
      category: 'Application Entry Point',
      purpose: primaryEntry.description || 'Main application bootstrapping and initialization entry point.',
      startLine: primaryEntry.startLine,
      endLine: primaryEntry.endLine,
    });
  } else {
    const fallbackEntry = fileList.find(
      (f) => /^(server|index|app|main)\.(js|ts|jsx|py)$/i.test(f.path)
    );
    if (fallbackEntry && !seenPaths.has(fallbackEntry.path)) {
      seenPaths.add(fallbackEntry.path);
      readingList.push({
        order: readingList.length + 1,
        path: fallbackEntry.path,
        category: 'Application Entry Point',
        purpose: 'Primary execution entry point for server or application startup.',
        size: fallbackEntry.size,
      });
    }
  }

  // 4. Configuration & Environment
  const config = fileList.find(
    (f) => !seenPaths.has(f.path) && /(\.env\.example|config\.js|vite\.config|docker-compose)/i.test(f.path)
  );
  if (config) {
    seenPaths.add(config.path);
    readingList.push({
      order: readingList.length + 1,
      path: config.path,
      category: 'Configuration',
      purpose: 'Defines environment variable bindings, ports, and build configuration.',
      size: config.size,
    });
  }

  // 5. Core Routing / UI Component
  const coreModule = fileList.find(
    (f) =>
      !seenPaths.has(f.path) &&
      /(routes|router|src\/app|app\.routes|controllers)/i.test(f.path) &&
      !f.isBinary
  );
  if (coreModule) {
    seenPaths.add(coreModule.path);
    readingList.push({
      order: readingList.length + 1,
      path: coreModule.path,
      category: 'Core Router / Controller',
      purpose: 'Coordinates API endpoint dispatching and core application logic.',
      size: coreModule.size,
    });
  }

  return readingList;
};

/**
 * Derives standard quick start commands from manifests and entry points.
 */
const deriveQuickStartCommands = (fileList = [], entryPoints = [], frameworks = []) => {
  const commands = [];
  const hasPackageJson = fileList.some((f) => f.path.includes('package.json'));
  const hasRequirements = fileList.some((f) => f.path.includes('requirements.txt'));

  // Installation Command
  if (hasPackageJson) {
    commands.push({
      command: 'npm install',
      description: 'Install declared project dependencies',
      isVerified: true,
    });
  } else if (hasRequirements) {
    commands.push({
      command: 'pip install -r requirements.txt',
      description: 'Install Python requirements',
      isVerified: true,
    });
  }

  // Start / Dev Commands from entryPoints
  const scriptEntry = entryPoints.find((ep) => ep.command);
  if (scriptEntry && scriptEntry.command) {
    commands.push({
      command: scriptEntry.command,
      description: `Run startup script (${scriptEntry.path})`,
      isVerified: true,
    });
  } else if (hasPackageJson) {
    const isReact = frameworks.some((f) => f.name.toLowerCase() === 'react');
    commands.push({
      command: isReact ? 'npm run dev' : 'npm start',
      description: 'Launch application in local development mode',
      isVerified: false,
    });
  }

  return commands;
};

/**
 * Rich Default Onboarding Screen displayed instantly from extracted repository data,
 * before the full AI onboarding guide has been generated.
 */
export default function OnboardingEmptyState({
  repository,
  analysis,
  onGenerate,
  isGenerating = false,
  error = null,
  onNavigateToFile = null,
  onNavigateToGraph = null,
  onAskAi = null,
}) {
  const fileList = repository?.fileList || [];
  const detectedLanguages = repository?.detectedLanguages || [];
  const frameworks = analysis?.frameworks || [];
  const entryPoints = analysis?.entryPoints || [];
  const declaredDeps = analysis?.dependencies?.declared || [];
  const apiEndpoints = analysis?.apiEndpoints || [];
  const dbInteractions = analysis?.databaseInteractions || [];

  const readingList = deriveInitialReadingOrder(fileList, entryPoints);
  const quickStartCmds = deriveQuickStartCommands(fileList, entryPoints, frameworks);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Banner & Generation CTA */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-4 rounded border shadow-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span
                className="badge d-flex align-items-center gap-1"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '0.75rem',
                }}
              >
                <VscBook size={13} />
                Instant Static Overview
              </span>
              <span className="text-repolens-secondary small">&middot;</span>
              <span className="text-repolens-secondary small">Grounded in Extracted File Data</span>
            </div>
            <h2 className="h4 fw-bold text-white mb-1">
              {repository?.name || 'Repository'} — Default Onboarding Guide
            </h2>
            <p className="text-repolens-secondary small mb-0" style={{ maxWidth: '720px', lineHeight: 1.5 }}>
              Immediate architecture summary synthesized directly from verified file manifests, detected AST symbols,
              entry points, and package dependencies.
            </p>
          </div>

          {/* Generate Full AI Guide Button */}
          <div className="d-flex flex-column align-items-end gap-1">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="btn btn-primary px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow"
              style={{
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                fontSize: '0.85rem',
              }}
            >
              {isGenerating ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Synthesizing Deep AI Guide...</span>
                </>
              ) : (
                <>
                  <VscSparkle size={16} />
                  <span>Generate Full AI Guide</span>
                </>
              )}
            </button>
            <span className="text-repolens-secondary" style={{ fontSize: '0.7rem' }}>
              Enriches with deep execution flows & troubleshooting
            </span>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-danger d-flex align-items-center gap-2 mb-0 py-2 px-3 small"
            style={{ fontSize: '0.8rem' }}
          >
            <VscWarning size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </motion.div>

      {/* Project Metrics / Quick Facts Row */}
      <div className="row g-3">
        {/* Metric 1: Total Files */}
        <div className="col-6 col-md-3">
          <div
            className="p-3 rounded border h-100 d-flex flex-column justify-content-between"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                Total Files
              </span>
              <VscFiles size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="h4 fw-bold text-white mb-0">{repository?.totalFiles || 0}</div>
            <div className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
              Indexed in File Tree
            </div>
          </div>
        </div>

        {/* Metric 2: Code Size */}
        <div className="col-6 col-md-3">
          <div
            className="p-3 rounded border h-100 d-flex flex-column justify-content-between"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                Codebase Size
              </span>
              <VscLayers size={18} style={{ color: '#60A5FA' }} />
            </div>
            <div className="h4 fw-bold text-white mb-0">{formatBytes(repository?.totalSize || 0)}</div>
            <div className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
              Uncompressed Source Size
            </div>
          </div>
        </div>

        {/* Metric 3: Source Ingestion */}
        <div className="col-6 col-md-3">
          <div
            className="p-3 rounded border h-100 d-flex flex-column justify-content-between"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                Ingestion Source
              </span>
              <VscServerProcess size={18} style={{ color: 'var(--color-success)' }} />
            </div>
            <div className="h5 fw-bold text-white mb-0 text-uppercase">
              {repository?.sourceType || 'ZIP'}
            </div>
            <div className="text-repolens-secondary small text-truncate" style={{ fontSize: '0.7rem' }}>
              {repository?.sourceUrl || 'Local Archive Archive'}
            </div>
          </div>
        </div>

        {/* Metric 4: Entry Points */}
        <div className="col-6 col-md-3">
          <div
            className="p-3 rounded border h-100 d-flex flex-column justify-content-between"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                Entry Points
              </span>
              <VscTerminal size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div className="h4 fw-bold text-white mb-0">{entryPoints.length || (readingList.length > 0 ? 1 : 0)}</div>
            <div className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
              Bootstrapping Files
            </div>
          </div>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {detectedLanguages.length > 0 && (
        <div
          className="p-3 rounded border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="small fw-semibold text-white">Detected Programming Languages:</span>
            <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
              {detectedLanguages.length} Languages Identified
            </span>
          </div>

          <div className="d-flex flex-wrap gap-2">
            {detectedLanguages.map((lang, idx) => (
              <span
                key={idx}
                className="code-badge d-flex align-items-center gap-2 py-1 px-2"
                style={{ fontSize: '0.75rem' }}
                title={`${lang.language}: ${lang.count} files (${lang.percentage}%)`}
              >
                <span className="fw-semibold text-white">{lang.language}</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(240, 80, 51, 0.2)',
                    color: 'var(--color-primary)',
                    fontSize: '0.7rem',
                  }}
                >
                  {lang.percentage}%
                </span>
                <span className="text-repolens-secondary small">({lang.count} files)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Detected Tech Stack & Frameworks */}
      <div
        className="p-4 rounded border shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="d-flex align-items-center gap-2 mb-3">
          <span style={{ color: 'var(--color-primary)' }}>
            <VscLayers size={20} />
          </span>
          <h3 className="h6 fw-bold text-white mb-0">1. Detected Frameworks & Technology Stack</h3>
          <span
            className="badge ms-1"
            style={{
              backgroundColor: 'rgba(240, 80, 51, 0.15)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(240, 80, 51, 0.3)',
              fontSize: '0.675rem',
            }}
          >
            {frameworks.length} Frameworks Detected
          </span>
        </div>

        {frameworks.length > 0 ? (
          <div className="row g-3 mb-3">
            {frameworks.map((fw, idx) => (
              <div key={idx} className="col-12 col-md-4">
                <div
                  className="p-3 rounded border h-100"
                  style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-bold text-white small">{fw.name}</span>
                    <span
                      className="badge text-uppercase"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60A5FA',
                        fontSize: '0.65rem',
                      }}
                    >
                      {fw.category}
                    </span>
                  </div>
                  {fw.version && (
                    <div className="text-repolens-secondary small mb-1" style={{ fontSize: '0.725rem' }}>
                      Version: <span className="text-light">{fw.version}</span>
                    </div>
                  )}
                  <div className="text-repolens-secondary small" style={{ fontSize: '0.725rem' }}>
                    Evidence: <code className="text-primary small">{fw.evidence}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-repolens-secondary small mb-3">
            No specialized frameworks flagged; standard vanilla library composition.
          </div>
        )}

        {/* Declared Package Dependencies */}
        {declaredDeps.length > 0 && (
          <div className="pt-3 border-top" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-repolens-secondary small fw-semibold d-block mb-2" style={{ fontSize: '0.75rem' }}>
              Key Declared Dependencies ({declaredDeps.length} packages):
            </span>
            <div className="d-flex flex-wrap gap-2">
              {declaredDeps.slice(0, 15).map((dep, idx) => (
                <span
                  key={idx}
                  className="code-badge"
                  style={{ fontSize: '0.725rem' }}
                  title={`${dep.name} (${dep.type || 'production'})`}
                >
                  <strong className="text-white">{dep.name}</strong>
                  {dep.version && <span className="text-repolens-secondary ms-1">v{dep.version}</span>}
                </span>
              ))}
              {declaredDeps.length > 15 && (
                <span className="text-repolens-secondary small align-self-center" style={{ fontSize: '0.725rem' }}>
                  +{declaredDeps.length - 15} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Application Starting Points / Entry Points */}
      <div
        className="p-4 rounded border shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="d-flex align-items-center gap-2 mb-3">
          <span style={{ color: 'var(--color-primary)' }}>
            <VscTerminal size={20} />
          </span>
          <h3 className="h6 fw-bold text-white mb-0">2. Discovered Starting Points & Entry Points</h3>
          <span
            className="badge ms-1"
            style={{
              backgroundColor: 'rgba(240, 80, 51, 0.15)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(240, 80, 51, 0.3)',
              fontSize: '0.675rem',
            }}
          >
            Verified by AST
          </span>
        </div>

        <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
          These files bootstrap the server listener, mount the frontend UI, or declare root configuration.
        </p>

        {entryPoints.length > 0 ? (
          <div className="d-flex flex-column gap-2 mb-3">
            {entryPoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-2 px-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <VscFileCode size={16} style={{ color: 'var(--color-primary)' }} />
                  <span className="font-monospace small text-white fw-bold">{ep.path}</span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: '#60A5FA',
                      fontSize: '0.65rem',
                    }}
                  >
                    {ep.type}
                  </span>
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.775rem' }}>
                    {ep.description}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {onNavigateToFile && (
                    <button
                      type="button"
                      onClick={() => onNavigateToFile(ep.path, { startLine: ep.startLine, endLine: ep.endLine })}
                      className="btn btn-sm btn-repolens-outline py-1 px-2 small"
                      style={{ fontSize: '0.725rem' }}
                    >
                      <span>Inspect Code</span>
                    </button>
                  )}
                  {onAskAi && (
                    <button
                      type="button"
                      onClick={() => onAskAi(`How does ${ep.path} boot and initialize this application?`)}
                      className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
                      style={{
                        backgroundColor: 'rgba(240, 80, 51, 0.1)',
                        borderColor: 'rgba(240, 80, 51, 0.3)',
                        color: 'var(--color-primary)',
                        fontSize: '0.725rem',
                      }}
                      title="Ask AI about this entry point"
                    >
                      <VscHubot size={13} />
                      <span>Ask AI</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded border text-repolens-secondary small" style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
            No explicit entry point flagged. Inspect the main files in the Reading Order below.
          </div>
        )}
      </div>

      {/* Section 3: Recommended Reading Order */}
      <div
        className="p-4 rounded border shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="d-flex align-items-center gap-2 mb-3">
          <span style={{ color: 'var(--color-primary)' }}>
            <VscBook size={20} />
          </span>
          <h3 className="h6 fw-bold text-white mb-0">3. Recommended Initial Reading Order</h3>
          <span
            className="badge ms-1"
            style={{
              backgroundColor: 'rgba(240, 80, 51, 0.15)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(240, 80, 51, 0.3)',
              fontSize: '0.675rem',
            }}
          >
            {readingList.length} Key Files
          </span>
        </div>

        <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
          New to this codebase? Read these verified files in sequence to understand project goals, routing, and persistence.
        </p>

        <div className="d-flex flex-column gap-2 mb-3">
          {readingList.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded border"
              style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: '22px',
                      height: '22px',
                      backgroundColor: 'rgba(240, 80, 51, 0.15)',
                      color: 'var(--color-primary)',
                      fontSize: '0.7rem',
                      border: '1px solid rgba(240, 80, 51, 0.3)',
                    }}
                  >
                    {item.order}
                  </span>
                  <span className="font-monospace fw-bold text-white small">{item.path}</span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'rgba(161, 161, 170, 0.12)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.65rem',
                    }}
                  >
                    {item.category}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {onNavigateToFile && (
                    <button
                      type="button"
                      onClick={() => onNavigateToFile(item.path)}
                      className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
                      style={{ fontSize: '0.725rem' }}
                    >
                      <VscFileCode size={13} />
                      <span>View File</span>
                    </button>
                  )}
                  {onAskAi && (
                    <button
                      type="button"
                      onClick={() => onAskAi(`Explain the role of ${item.path} in this repository.`)}
                      className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
                      style={{
                        backgroundColor: 'rgba(240, 80, 51, 0.1)',
                        borderColor: 'rgba(240, 80, 51, 0.3)',
                        color: 'var(--color-primary)',
                        fontSize: '0.725rem',
                      }}
                    >
                      <VscHubot size={13} />
                      <span>Ask AI</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-repolens-secondary small" style={{ fontSize: '0.78rem' }}>
                {item.purpose}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Quick Start Setup Commands */}
      {quickStartCmds.length > 0 && (
        <div
          className="p-4 rounded border shadow-sm"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <span style={{ color: 'var(--color-primary)' }}>
              <VscTerminal size={20} />
            </span>
            <h3 className="h6 fw-bold text-white mb-0">4. Quick Start Commands</h3>
            <span
              className="badge ms-1"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--color-success)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '0.675rem',
              }}
            >
              Ready to Run
            </span>
          </div>

          <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
            Run these commands in your local terminal to install dependencies and start the project.
          </p>

          <div className="d-flex flex-column gap-2">
            {quickStartCmds.map((cmd, idx) => (
              <SetupCommand key={idx} {...cmd} />
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Discovered API Endpoints (if present) */}
      {apiEndpoints.length > 0 && (
        <div
          className="p-4 rounded border shadow-sm"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: 'var(--color-primary)' }}>
                <VscServerProcess size={20} />
              </span>
              <h3 className="h6 fw-bold text-white mb-0">5. Discovered API Endpoints & Routes</h3>
              <span
                className="badge ms-1"
                style={{
                  backgroundColor: 'rgba(240, 80, 51, 0.15)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(240, 80, 51, 0.3)',
                  fontSize: '0.675rem',
                }}
              >
                {apiEndpoints.length} Routes Discovered
              </span>
            </div>
          </div>

          <div className="d-flex flex-column gap-2 mb-2">
            {apiEndpoints.slice(0, 8).map((ep, idx) => (
              <div
                key={idx}
                className="p-2 px-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="badge fw-bold"
                    style={{
                      backgroundColor:
                        ep.method === 'GET'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : ep.method === 'POST'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : ep.method === 'DELETE'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        ep.method === 'GET'
                          ? 'var(--color-success)'
                          : ep.method === 'POST'
                          ? '#60A5FA'
                          : ep.method === 'DELETE'
                          ? '#ef4444'
                          : 'var(--color-warning)',
                      fontSize: '0.65rem',
                    }}
                  >
                    {ep.method}
                  </span>
                  <span className="font-monospace small text-white">{ep.path}</span>
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                    &rarr; {ep.handlerName}
                  </span>
                </div>

                {onNavigateToFile && (
                  <button
                    type="button"
                    onClick={() => onNavigateToFile(ep.file, { startLine: ep.startLine, endLine: ep.endLine })}
                    className="btn btn-sm btn-repolens-outline py-0 px-2 small"
                    style={{ fontSize: '0.7rem' }}
                  >
                    View Route
                  </button>
                )}
              </div>
            ))}
          </div>

          {apiEndpoints.length > 8 && (
            <div className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
              Showing 8 of {apiEndpoints.length} endpoints. Use the <strong>Endpoints</strong> tab to explore all.
            </div>
          )}
        </div>
      )}

      {/* Section 6: Interactive Architecture Graph CTA */}
      {onNavigateToGraph && (
        <div
          className="p-3 px-4 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{
            backgroundColor: 'rgba(240, 80, 51, 0.08)',
            borderColor: 'rgba(240, 80, 51, 0.3)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <VscGraph size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <span className="small fw-bold text-white d-block">Explore Interactive Architecture Graph</span>
              <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                Visualize modules, API execution flows, and file dependencies rendered with React Flow.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToGraph('modules')}
            className="btn btn-sm py-1 px-3 fw-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary)', fontSize: '0.75rem' }}
          >
            Open Architecture Graph
          </button>
        </div>
      )}

      {/* Bottom AI Synthesis Prompt */}
      <div
        className="p-4 rounded border text-center shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <VscSparkle size={24} style={{ color: 'var(--color-primary)' }} className="mb-2" />
        <h4 className="h6 fw-bold text-white mb-1">Need Deep Architectural Narratives & Request Traces?</h4>
        <p className="text-repolens-secondary small mx-auto mb-3" style={{ maxWidth: '580px', fontSize: '0.8rem', lineHeight: 1.5 }}>
          Click below to generate a comprehensive AI onboarding guide with Gemini. It synthesizes request life cycles,
          detailed component responsibilities, and step-by-step setup guides grounded in static code intelligence.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow"
          style={{
            backgroundColor: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            fontSize: '0.85rem',
          }}
        >
          {isGenerating ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span>Synthesizing Deep AI Guide...</span>
            </>
          ) : (
            <>
              <VscSparkle size={16} />
              <span>Generate Full AI Onboarding Guide</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
