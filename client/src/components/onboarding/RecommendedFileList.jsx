import { VscArrowRight, VscFileCode, VscHubot, VscSymbolMethod } from 'react-icons/vsc';

export default function RecommendedFileList({
  files = [],
  onNavigateToFile = null,
  onAskAi = null,
}) {
  if (!files || files.length === 0) {
    return (
      <div
        className="p-3 text-center text-repolens-secondary rounded border"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          fontSize: '0.8rem',
        }}
      >
        No specific reading order recommendations available for this repository.
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {files.map((item, index) => {
        return (
          <div
            key={item.filePath || index}
            className="p-3 rounded border position-relative"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Step Number Badge */}
            <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: 'rgba(240, 80, 51, 0.15)',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    border: '1px solid rgba(240, 80, 51, 0.3)',
                  }}
                >
                  {item.order || index + 1}
                </span>

                <span className="font-monospace fw-bold text-white" style={{ fontSize: '0.875rem' }}>
                  {item.filePath}
                </span>

                {item.startLine && item.endLine && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.65rem',
                    }}
                  >
                    Lines {item.startLine}–{item.endLine}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="d-flex align-items-center gap-2">
                {onNavigateToFile && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToFile(item.filePath, {
                        startLine: item.startLine,
                        endLine: item.endLine,
                      })
                    }
                    className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                    title={`Open ${item.filePath} in Code Viewer`}
                  >
                    <VscFileCode size={13} />
                    <span>View Code</span>
                  </button>
                )}

                {onAskAi && (
                  <button
                    type="button"
                    onClick={() =>
                      onAskAi(
                        `Explain the role and architecture of ${item.filePath} in this project.`
                      )
                    }
                    className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
                    style={{
                      backgroundColor: 'rgba(240, 80, 51, 0.1)',
                      borderColor: 'rgba(240, 80, 51, 0.3)',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem',
                    }}
                    title="Ask AI about this file"
                  >
                    <VscHubot size={13} />
                    <span>Ask AI</span>
                  </button>
                )}
              </div>
            </div>

            {/* Purpose & Why It Matters */}
            <div className="text-repolens-secondary small mb-2" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
              <div>
                <strong className="text-white">Purpose:</strong> {item.purpose}
              </div>
              {item.whyItMatters && (
                <div className="mt-1">
                  <strong className="text-white">Why it matters:</strong> {item.whyItMatters}
                </div>
              )}
            </div>

            {/* Key Symbols */}
            {item.keySymbols && item.keySymbols.length > 0 && (
              <div className="d-flex align-items-center gap-1 flex-wrap mt-2">
                <span className="text-repolens-secondary small me-1" style={{ fontSize: '0.7rem' }}>
                  Key Symbols:
                </span>
                {item.keySymbols.map((sym) => (
                  <span
                    key={sym}
                    className="code-badge d-flex align-items-center gap-1"
                    style={{ fontSize: '0.675rem' }}
                  >
                    <VscSymbolMethod size={11} style={{ color: 'var(--color-primary)' }} />
                    {sym}
                  </span>
                ))}
              </div>
            )}

            {/* Next File Indicator */}
            {item.nextFile && (
              <div
                className="mt-2 pt-2 border-top d-flex align-items-center gap-1 small"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.725rem',
                }}
              >
                <span>Read next:</span>
                <span className="font-monospace text-white">{item.nextFile}</span>
                <VscArrowRight size={12} style={{ color: 'var(--color-primary)' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
