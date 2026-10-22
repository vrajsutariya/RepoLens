import { motion } from 'motion/react';
import {
  VscLayers,
  VscSymbolMethod,
  VscServerProcess,
  VscDatabase,
  VscGitMerge,
  VscCode,
  VscRocket,
  VscRefresh,
  VscWarning,
  VscCheck,
  VscLoading,
  VscHubot,
  VscSparkle,
} from 'react-icons/vsc';

export default function OverviewTab({ analysis, onNavigateToFile, onRerunAnalysis, isAnalyzing, onAskAi }) {
  if (!analysis) {
    return (
      <div className="p-5 text-center text-repolens-secondary">
        <VscLayers size={36} className="mb-2 opacity-50" />
        <h6 className="text-white">Analysis Pending</h6>
        <p className="small">Trigger static code intelligence to analyze symbols, frameworks, and architecture.</p>
        <button
          type="button"
          onClick={onRerunAnalysis}
          disabled={isAnalyzing}
          className="btn btn-sm btn-repolens-primary"
        >
          {isAnalyzing ? <VscLoading className="spin me-1" size={14} /> : <VscRocket className="me-1" size={14} />}
          <span>Run Analysis Now</span>
        </button>
      </div>
    );
  }

  const { metrics, frameworks = [], entryPoints = [], languages = [], warnings = [] } = analysis;

  const statCards = [
    { label: 'Analyzed Files', value: metrics?.totalFilesAnalyzed || 0, icon: <VscCode size={20} />, color: '#38bdf8' },
    { label: 'Lines of Code', value: (metrics?.totalLOC || 0).toLocaleString(), icon: <VscLayers size={20} />, color: '#a78bfa' },
    { label: 'Extracted Symbols', value: metrics?.symbolsCount || 0, icon: <VscSymbolMethod size={20} />, color: '#facc15' },
    { label: 'API Endpoints', value: metrics?.apiEndpointsCount || 0, icon: <VscServerProcess size={20} />, color: '#4ade80' },
    { label: 'Database Models', value: metrics?.databaseModelsCount || 0, icon: <VscDatabase size={20} />, color: '#f87171' },
    { label: 'Module Imports', value: metrics?.relationshipsCount || 0, icon: <VscGitMerge size={20} />, color: 'var(--color-primary)' },
  ];

  return (
    <div className="d-flex flex-column gap-4 p-4 overflow-auto h-100">
      {/* Top Header Actions */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h6 fw-bold text-white mb-1">Architecture & Code Intelligence Overview</h2>
          <p className="text-repolens-secondary small mb-0">
            Deterministic static analysis results and AST extraction.
          </p>
        </div>
        <button
          type="button"
          onClick={onRerunAnalysis}
          disabled={isAnalyzing}
          className="btn btn-sm btn-repolens-outline d-flex align-items-center gap-1"
          style={{ fontSize: '0.8rem' }}
        >
          <VscRefresh className={isAnalyzing ? 'spin' : ''} size={14} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Rerun Analysis'}</span>
        </button>
      </div>

      {/* AI Q&A Action Banner */}
      {onAskAi && (
        <div
          className="p-3 rounded border d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm"
          style={{
            backgroundColor: 'rgba(240, 80, 51, 0.08)',
            borderColor: 'rgba(240, 80, 51, 0.3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="p-2 rounded d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.2)',
                color: 'var(--color-primary)',
              }}
            >
              <VscHubot size={22} />
            </div>
            <div>
              <h3 className="h6 fw-bold text-white mb-1">Instant Codebase Understanding with Gemini</h3>
              <p className="text-repolens-secondary small mb-0">
                Ask questions about authentication, endpoints, database schemas, and data flow with verifiable citations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAskAi}
            className="btn btn-sm btn-repolens-primary py-1 px-3 d-flex align-items-center gap-2"
          >
            <VscSparkle size={15} />
            <span>Open AI Assistant</span>
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="row g-3">
        {statCards.map((card, idx) => (
          <div key={card.label} className="col-6 col-md-4 col-lg-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="p-3 rounded border border-repolens bg-repolens-bg h-100 d-flex flex-column justify-content-between"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                  {card.label}
                </span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="h4 fw-bold text-white mb-0">{card.value}</div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Frameworks & Languages Row */}
      <div className="row g-3">
        {/* Detected Frameworks */}
        <div className="col-12 col-lg-7">
          <div
            className="p-3 rounded border border-repolens bg-repolens-bg h-100"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="fw-semibold text-white small">Detected Frameworks & Libraries</span>
              <span className="code-badge">{frameworks.length} detected</span>
            </div>

            {frameworks.length === 0 ? (
              <p className="text-repolens-secondary small mb-0">No recognizable frameworks detected in manifest declarations.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {frameworks.map((fw) => (
                  <div
                    key={fw.name}
                    className="p-2 rounded d-flex align-items-center justify-content-between gap-2"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      <VscCheck size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                      <span className="text-white fw-medium small text-truncate">{fw.name}</span>
                      {fw.version && <span className="code-badge" style={{ fontSize: '0.65rem' }}>{fw.version}</span>}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>{fw.category}</span>
                      <span className="text-repolens-secondary text-truncate d-none d-md-inline" style={{ fontSize: '0.7rem', maxWidth: '240px' }} title={fw.evidence}>
                        {fw.evidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Source Language Composition */}
        <div className="col-12 col-lg-5">
          <div
            className="p-3 rounded border border-repolens bg-repolens-bg h-100"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="fw-semibold text-white small">Source Code Breakdown</span>
              <span className="code-badge">{languages.filter((l) => l.isSourceCode).length} languages</span>
            </div>

            <div className="d-flex flex-column gap-2">
              {languages.slice(0, 6).map((lang) => (
                <div key={lang.language}>
                  <div className="d-flex align-items-center justify-content-between small mb-1">
                    <span className="text-white" style={{ fontSize: '0.75rem' }}>{lang.language}</span>
                    <span className="text-repolens-secondary" style={{ fontSize: '0.7rem' }}>
                      {lang.loc.toLocaleString()} lines ({lang.percentage}%)
                    </span>
                  </div>
                  <div className="w-100 rounded" style={{ height: '4px', backgroundColor: 'var(--color-surface)' }}>
                    <div
                      className="rounded"
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(2, lang.percentage))}%`,
                        backgroundColor: lang.isSourceCode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Entry Points Section */}
      <div
        className="p-3 rounded border border-repolens bg-repolens-bg"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className="fw-semibold text-white small">Identified Entry Points & Startup Hooks</span>
          <span className="code-badge">{entryPoints.length} entry points</span>
        </div>

        {entryPoints.length === 0 ? (
          <p className="text-repolens-secondary small mb-0">No application entry points recognized from conventions.</p>
        ) : (
          <div className="row g-2">
            {entryPoints.map((ep) => (
              <div key={ep.path} className="col-12 col-md-6">
                <div
                  className="p-2 rounded d-flex align-items-start justify-content-between gap-2 h-100"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => onNavigateToFile(ep.path)}
                        className="btn btn-link p-0 text-white fw-semibold small text-decoration-none text-truncate"
                        title="Open file in viewer"
                      >
                        {ep.path}
                      </button>
                      <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>{ep.type}</span>
                    </div>
                    <p className="text-repolens-secondary mb-1" style={{ fontSize: '0.75rem' }}>
                      {ep.description}
                    </p>
                    {ep.command && (
                      <span className="code-badge text-truncate d-inline-block" style={{ fontSize: '0.65rem' }}>
                        {ep.command}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warnings & Diagnostics */}
      {warnings.length > 0 && (
        <div
          className="p-3 rounded border border-warning"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-2 text-warning fw-semibold small">
            <VscWarning size={16} />
            <span>Analysis Diagnostics ({warnings.length})</span>
          </div>
          <div className="d-flex flex-column gap-1" style={{ maxHeight: '140px', overflowY: 'auto' }}>
            {warnings.map((w, i) => (
              <div key={i} className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                <span className="text-white fw-medium">{w.file}:</span> {w.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
