import { VscGitMerge, VscHubot, VscFileCode, VscLayers, VscCheck, VscLoading } from 'react-icons/vsc';
import StatusBanner from '../components/StatusBanner';

export default function WorkspacePlaceholder({ backendStatus, onRetryHealth }) {
  const { loading, error, data } = backendStatus;

  return (
    <div className="container py-4 flex-grow-1 d-flex flex-column justify-content-center">
      {/* Dedicated Area for Displaying Application Errors or Loading States */}
      {loading && (
        <div className="d-flex align-items-center justify-content-center p-3 mb-4 rounded bg-repolens-surface border border-repolens text-repolens-secondary small">
          <VscLoading className="spin me-2" size={16} />
          <span>Connecting to RepoLens backend service...</span>
        </div>
      )}

      {error && (
        <StatusBanner
          type="error"
          message={`Backend connection failure: ${error}. Ensure the Express API is running on port 5000.`}
          onRetry={onRetryHealth}
        />
      )}

      {!loading && !error && data && (
        <div
          className="p-3 mb-4 rounded d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <VscCheck style={{ color: 'var(--color-success)' }} size={16} />
            <span className="text-white">Backend API Connected:</span>
            <span className="code-badge">Status: {data.status}</span>
            <span className="code-badge">Env: {data.environment}</span>
            <span className="code-badge">DB: {data.services?.database || 'not_configured'}</span>
          </div>
          <button
            type="button"
            onClick={onRetryHealth}
            className="btn btn-sm btn-repolens-outline py-0 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Recheck API
          </button>
        </div>
      )}

      {/* Main Workspace Placeholder */}
      <section
        className="p-5 rounded text-center mx-auto w-100"
        style={{
          maxWidth: '860px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label="Repository Workspace Foundation"
      >
        <div
          className="d-inline-flex align-items-center justify-content-center p-3 mb-3 rounded-circle"
          style={{
            backgroundColor: 'rgba(240, 80, 51, 0.1)',
            border: '1px solid rgba(240, 80, 51, 0.25)',
            color: 'var(--color-primary)',
          }}
        >
          <VscGitMerge size={32} />
        </div>

        <h1 className="h3 fw-bold text-white mb-2">Repository Workspace</h1>
        <p className="text-repolens-secondary mx-auto mb-4" style={{ maxWidth: '620px' }}>
          RepoLens provides instant, evidence-backed codebase understanding for unfamiliar
          repositories. Upload a repository or provide a public Git URL to extract architecture,
          detect entry points, trace execution flows, and query with Google Gemini AI.
        </p>

        {/* Foundation Architecture Highlights */}
        <div className="row g-3 text-start mt-2 mb-4">
          <div className="col-12 col-md-4">
            <div
              className="p-3 h-100 rounded"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2 text-white">
                <VscLayers style={{ color: 'var(--color-primary)' }} size={18} />
                <span className="fw-semibold small">Architecture Visualizer</span>
              </div>
              <p className="text-repolens-secondary small mb-0">
                Interactive component graphs powered by React Flow for architecture and execution flow diagrams.
              </p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div
              className="p-3 h-100 rounded"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2 text-white">
                <VscHubot style={{ color: 'var(--color-primary)' }} size={18} />
                <span className="fw-semibold small">Gemini Code Intelligence</span>
              </div>
              <p className="text-repolens-secondary small mb-0">
                Backend-isolated Gemini API integration with structured context extraction and verified line citations.
              </p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div
              className="p-3 h-100 rounded"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2 text-white">
                <VscFileCode style={{ color: 'var(--color-primary)' }} size={18} />
                <span className="fw-semibold small">Repository Extraction</span>
              </div>
              <p className="text-repolens-secondary small mb-0">
                Safe analysis pipeline for entry points, language discovery, API routes, and dependency mapping.
              </p>
            </div>
          </div>
        </div>

        <div className="text-repolens-secondary small d-flex align-items-center justify-content-center gap-2">
          <span className="badge rounded-pill bg-dark border border-secondary text-secondary">
            Foundation Ready
          </span>
          <span>&middot;</span>
          <span>Repository ingestion and interactive analysis pipeline scheduled for next phase</span>
        </div>
      </section>
    </div>
  );
}
