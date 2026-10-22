import { useState } from 'react';
import { VscChevronDown, VscChevronRight, VscFileCode, VscCode } from 'react-icons/vsc';

export default function EvidenceCitation({
  evidence = [],
  onNavigateToFile = null,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="d-flex flex-column gap-2">
      {evidence.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <div
            key={item.id}
            className="rounded border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="p-2 px-3 d-flex align-items-center justify-content-between cursor-pointer"
              style={{
                backgroundColor: isExpanded ? 'var(--color-surface-hover)' : 'transparent',
                transition: 'background-color var(--transition-fast)',
              }}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="d-flex align-items-center gap-2 text-truncate">
                {isExpanded ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(240, 80, 51, 0.15)',
                    color: 'var(--color-primary)',
                    fontSize: '0.65rem',
                  }}
                >
                  {item.id}
                </span>
                <span className="font-monospace small text-white text-truncate" style={{ fontSize: '0.8rem' }}>
                  {item.filePath}
                </span>
                <span className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
                  (Lines {item.startLine}–{item.endLine})
                </span>
              </div>

              {onNavigateToFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToFile(item.filePath, {
                      startLine: item.startLine,
                      endLine: item.endLine,
                    });
                  }}
                  className="btn btn-sm btn-repolens-outline py-0 px-2 d-flex align-items-center gap-1"
                  style={{ fontSize: '0.7rem' }}
                  title="Inspect snippet in Code Viewer"
                >
                  <VscFileCode size={12} />
                  <span>Inspect</span>
                </button>
              )}
            </div>

            {isExpanded && item.snippet && (
              <div
                className="p-3 border-top font-monospace"
                style={{
                  backgroundColor: 'var(--color-background)',
                  borderColor: 'var(--color-border)',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                }}
              >
                <pre className="mb-0 text-white" style={{ whiteSpace: 'pre-wrap' }}>
                  {item.snippet}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
