import { useState } from 'react';
import { VscPackage, VscArrowRight, VscWarning, VscCheck, VscGitMerge } from 'react-icons/vsc';

export default function DependenciesTab({ dependencies = {}, onNavigateToFile }) {
  const [activeSubTab, setActiveSubTab] = useState('internal'); // 'internal' | 'declared'

  const {
    declared = [],
    internalImports = [],
    unresolvedImports = [],
    circularDependencies = [],
  } = dependencies;

  return (
    <div className="d-flex flex-column h-100 p-4 overflow-hidden">
      {/* Sub Tabs */}
      <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom border-repolens">
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            onClick={() => setActiveSubTab('internal')}
            className={`btn btn-sm ${activeSubTab === 'internal' ? 'btn-repolens-primary' : 'btn-repolens-outline'}`}
          >
            <VscGitMerge className="me-1" size={14} />
            <span>Internal File Imports ({internalImports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('declared')}
            className={`btn btn-sm ${activeSubTab === 'declared' ? 'btn-repolens-primary' : 'btn-repolens-outline'}`}
          >
            <VscPackage className="me-1" size={14} />
            <span>Declared Packages ({declared.length})</span>
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          {circularDependencies.length > 0 ? (
            <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
              <VscWarning size={14} />
              <span>{circularDependencies.length} Circular Cycles Detected</span>
            </span>
          ) : (
            <span className="badge bg-dark border border-secondary text-secondary d-flex align-items-center gap-1">
              <VscCheck size={14} style={{ color: 'var(--color-success)' }} />
              <span>No Circular Dependencies</span>
            </span>
          )}
        </div>
      </div>

      {/* Circular Dependencies Alert if any */}
      {circularDependencies.length > 0 && (
        <div
          className="p-3 mb-3 rounded border border-warning"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-sm)' }}
        >
          <div className="d-flex align-items-center gap-2 mb-2 text-warning fw-semibold small">
            <VscWarning size={16} />
            <span>Circular Dependency Cycles</span>
          </div>
          <div className="d-flex flex-column gap-1">
            {circularDependencies.map((c, idx) => (
              <div key={idx} className="small text-white" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                Cycle #{idx + 1}: {c.cycle.join(' -> ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-grow-1 overflow-auto">
        {activeSubTab === 'internal' ? (
          <div className="d-flex flex-column gap-2">
            {internalImports.length === 0 ? (
              <div className="p-5 text-center text-repolens-secondary small">
                No internal relative module imports discovered.
              </div>
            ) : (
              internalImports.map((imp, idx) => (
                <div
                  key={`${imp.sourceFile}-${imp.targetFile}-${idx}`}
                  className="p-2 px-3 rounded d-flex align-items-center justify-content-between gap-3 border border-repolens"
                  style={{ backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onNavigateToFile(imp.sourceFile)}
                      className="btn btn-link p-0 text-white small fw-medium text-decoration-none text-truncate"
                    >
                      {imp.sourceFile}
                    </button>
                    <VscArrowRight size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <button
                      type="button"
                      onClick={() => onNavigateToFile(imp.targetFile)}
                      className="btn btn-link p-0 text-white small fw-medium text-decoration-none text-truncate"
                    >
                      {imp.targetFile}
                    </button>
                  </div>

                  {imp.importedSymbols && imp.importedSymbols.length > 0 && (
                    <div className="d-flex align-items-center gap-1 flex-wrap flex-shrink-0">
                      {imp.importedSymbols.slice(0, 3).map((sym) => (
                        <span key={sym} className="code-badge" style={{ fontSize: '0.65rem' }}>
                          {sym}
                        </span>
                      ))}
                      {imp.importedSymbols.length > 3 && (
                        <span className="text-repolens-secondary small" style={{ fontSize: '0.65rem' }}>
                          +{imp.importedSymbols.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {unresolvedImports.length > 0 && (
              <div className="mt-3">
                <span className="text-warning small fw-semibold mb-2 d-block">
                  Unresolved Internal Imports ({unresolvedImports.length}):
                </span>
                <div className="d-flex flex-column gap-1">
                  {unresolvedImports.map((u, i) => (
                    <div
                      key={i}
                      className="p-2 rounded small text-repolens-secondary border border-warning"
                      style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
                    >
                      In <span className="text-white">{u.sourceFile}</span>: raw import path{' '}
                      <span className="text-warning">"{u.rawPath}"</span> could not be resolved to an existing file.
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Declared Packages List */
          <div className="d-flex flex-column gap-2">
            {declared.length === 0 ? (
              <div className="p-5 text-center text-repolens-secondary small">
                No package manifest dependencies found.
              </div>
            ) : (
              declared.map((pkg) => (
                <div
                  key={pkg.name}
                  className="p-2 px-3 rounded d-flex align-items-center justify-content-between gap-3 border border-repolens"
                  style={{ backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <VscPackage size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-white fw-semibold small">{pkg.name}</span>
                    <span className="code-badge" style={{ fontSize: '0.7rem' }}>{pkg.version}</span>
                    {pkg.isDev && <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>dev</span>}
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                      Usage in source code: <strong className="text-white">{pkg.usageCount}</strong> imports
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
