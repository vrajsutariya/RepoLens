import { motion } from 'motion/react';
import {
  VscClose,
  VscFileCode,
  VscLinkExternal,
  VscCheck,
  VscSparkle,
  VscArrowRight,
  VscDatabase,
  VscSymbolMethod,
} from 'react-icons/vsc';

export default function GraphDetailsPanel({
  selectedItem,
  onClose,
  onNavigateToFile,
  onAskAiAboutComponent,
}) {
  if (!selectedItem) return null;

  const isEdge = selectedItem.type === 'edge' || Boolean(selectedItem.source);
  const data = selectedItem.data || {};

  const handleInspectInViewer = () => {
    if (data.filePath && onNavigateToFile) {
      onNavigateToFile(data.filePath, {
        startLine: data.startLine || 1,
        endLine: data.endLine || data.startLine || 1,
      });
    }
  };

  const handleAskAi = () => {
    if (!onAskAiAboutComponent) return;

    let question;
    if (isEdge) {
      question = `How is the relationship between \`${data.sourceFile || selectedItem.source}\` and \`${data.targetFile || selectedItem.target}\` implemented?`;
    } else if (data.apiPath) {
      question = `What happens when \`${data.httpMethod} ${data.apiPath}\` is requested and how does it process data?`;
    } else if (data.symbolName) {
      question = `How does the \`${data.symbolName}\` function in \`${data.filePath}\` work and what calls it?`;
    } else if (data.modelName) {
      question = `Where is the \`${data.modelName}\` model defined and how are database operations executed against it?`;
    } else if (data.filePath) {
      question = `What is the architectural role of \`${data.filePath}\` in this codebase?`;
    } else {
      question = `Explain the component \`${data.label}\`.`;
    }

    onAskAiAboutComponent(question);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      aria-label="Component inspection details"
      className="position-absolute top-0 end-0 h-100 p-3 p-md-4 border-start border-repolens d-flex flex-column shadow-lg"
      style={{
        width: '360px',
        maxWidth: '90vw',
        backgroundColor: 'rgba(23, 23, 25, 0.96)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-repolens flex-shrink-0">
        <div>
          <span
            className="badge mb-1"
            style={{
              backgroundColor: isEdge ? 'rgba(240, 80, 51, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              color: isEdge ? 'var(--color-primary)' : '#38bdf8',
              fontSize: '0.65rem',
            }}
          >
            {isEdge ? 'RELATIONSHIP EDGE' : (data.nodeCategory || 'COMPONENT NODE').toUpperCase()}
          </span>
          <h2 className="h6 text-white fw-bold mb-0 text-truncate" title={data.label || selectedItem.id}>
            {data.label || selectedItem.id}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-sm text-repolens-secondary p-1 border-0"
          title="Close details panel"
        >
          <VscClose size={18} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-grow-1 d-flex flex-column gap-3 small">
        {/* Verification Status Banner */}
        <div
          className="p-2 px-3 rounded d-flex align-items-center gap-2"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            fontSize: '0.72rem',
          }}
        >
          <VscCheck size={14} className="flex-shrink-0" />
          <span>
            {data.verification === 'inferred'
              ? 'Architecturally inferred from static analysis'
              : 'Statically verified from AST & route manifests'}
          </span>
        </div>

        {/* Source File Location */}
        {data.filePath && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              SOURCE LOCATION:
            </span>
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <VscFileCode size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span className="text-white text-truncate font-monospace" style={{ fontSize: '0.75rem' }} title={data.filePath}>
                {data.filePath}
              </span>
            </div>
            {data.startLine && (
              <span className="text-repolens-secondary d-block mt-1" style={{ fontSize: '0.7rem' }}>
                Lines {data.startLine}{data.endLine && data.endLine !== data.startLine ? `–${data.endLine}` : ''}
              </span>
            )}
          </div>
        )}

        {/* API Route Attributes */}
        {data.apiPath && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              HTTP SPECIFICATION:
            </span>
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge fw-bold"
                style={{
                  backgroundColor: data.httpMethod === 'GET' ? '#10b981' : data.httpMethod === 'POST' ? '#3b82f6' : '#f59e0b',
                  fontSize: '0.7rem',
                }}
              >
                {data.httpMethod}
              </span>
              <span className="text-white font-monospace" style={{ fontSize: '0.8rem' }}>
                {data.apiPath}
              </span>
            </div>
          </div>
        )}

        {/* Database Interaction Attributes */}
        {data.modelName && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              DATABASE INTERACTION:
            </span>
            <div className="d-flex align-items-center gap-2 mb-1">
              <VscDatabase size={14} style={{ color: '#f43f5e' }} />
              <strong className="text-white">{data.modelName}</strong>
              {data.technology && (
                <span className="code-badge" style={{ fontSize: '0.65rem' }}>
                  {data.technology}
                </span>
              )}
            </div>
            {data.operationType && (
              <span className="repolens-badge" style={{ fontSize: '0.68rem' }}>
                Op: {data.operationType}
              </span>
            )}
          </div>
        )}

        {/* Symbol Details */}
        {data.symbolName && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              SYMBOL SIGNATURE:
            </span>
            <div className="d-flex align-items-center gap-2 mb-1">
              <VscSymbolMethod size={14} style={{ color: '#38bdf8' }} />
              <span className="text-white font-monospace">{data.symbolName}()</span>
              {data.isAsync && <span className="badge bg-info-subtle text-info">async</span>}
              {data.isExported && <span className="badge bg-success-subtle text-success">exported</span>}
            </div>
            {data.params && data.params.length > 0 && (
              <div className="text-repolens-secondary" style={{ fontSize: '0.72rem' }}>
                Parameters: ({data.params.join(', ')})
              </div>
            )}
          </div>
        )}

        {/* Edge Specific Information */}
        {isEdge && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              RELATIONSHIP:
            </span>
            <div className="d-flex align-items-center gap-2 text-white font-monospace mb-2" style={{ fontSize: '0.75rem' }}>
              <span className="text-truncate">{selectedItem.source}</span>
              <VscArrowRight size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span className="text-truncate">{selectedItem.target}</span>
            </div>
            {data.symbols && data.symbols.length > 0 && (
              <div className="text-repolens-secondary" style={{ fontSize: '0.72rem' }}>
                Imported Symbols: {data.symbols.join(', ')}
              </div>
            )}
            {data.isCircular && (
              <span className="badge bg-warning text-dark mt-2 d-inline-block">
                Part of a Circular Dependency Cycle
              </span>
            )}
          </div>
        )}

        {/* Code Evidence Snippet */}
        {data.evidence && (
          <div className="p-2 rounded border border-repolens" style={{ backgroundColor: '#09090b' }}>
            <span className="text-repolens-secondary d-block mb-1" style={{ fontSize: '0.68rem' }}>
              SUPPORTING EVIDENCE:
            </span>
            <pre
              className="m-0 text-white p-2 rounded"
              style={{
                backgroundColor: '#171719',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              <code>{data.evidence}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 mt-3 border-top border-repolens d-flex flex-column gap-2 flex-shrink-0">
        {data.filePath && onNavigateToFile && (
          <button
            type="button"
            onClick={handleInspectInViewer}
            className="btn btn-sm btn-repolens-primary w-100 d-flex align-items-center justify-content-center gap-2"
            style={{ fontSize: '0.8rem' }}
          >
            <VscLinkExternal size={14} />
            <span>View in Code Viewer</span>
          </button>
        )}

        {onAskAiAboutComponent && (
          <button
            type="button"
            onClick={handleAskAi}
            className="btn btn-sm btn-repolens-outline w-100 d-flex align-items-center justify-content-center gap-2"
            style={{ fontSize: '0.8rem' }}
          >
            <VscSparkle size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Ask AI About This Component</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
}
