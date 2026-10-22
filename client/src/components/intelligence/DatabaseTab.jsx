import { VscDatabase, VscArrowRight } from 'react-icons/vsc';

const getOperationBadge = (op) => {
  switch (op) {
    case 'define-schema':
    case 'define-model':
      return { label: 'Model Definition', color: '#38bdf8' };
    case 'create':
      return { label: 'Create', color: '#4ade80' };
    case 'update':
      return { label: 'Update', color: '#fb923c' };
    case 'delete':
      return { label: 'Delete', color: '#f87171' };
    default:
      return { label: 'Query', color: '#a78bfa' };
  }
};

export default function DatabaseTab({ databaseInteractions = [], onNavigateToFile }) {
  return (
    <div className="d-flex flex-column h-100 p-4 overflow-hidden">
      <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom border-repolens">
        <div>
          <h2 className="h6 fw-bold text-white mb-0">Database Interactions & Data Models</h2>
          <span className="text-repolens-secondary small">
            Statically verified schemas, models, and query patterns.
          </span>
        </div>
        <span className="code-badge" style={{ fontSize: '0.75rem' }}>
          {databaseInteractions.length} database interactions discovered
        </span>
      </div>

      <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
        {databaseInteractions.length === 0 ? (
          <div className="p-5 text-center text-repolens-secondary small">
            <VscDatabase size={32} className="mb-2 opacity-50" />
            <p className="mb-0">No recognizable database schemas or ORM interactions detected.</p>
          </div>
        ) : (
          databaseInteractions.map((item, idx) => {
            const badge = getOperationBadge(item.operationType);
            return (
              <div
                key={`${item.technology}-${item.modelName}-${item.file}-${idx}`}
                className="p-3 rounded d-flex flex-wrap align-items-center justify-content-between gap-3 border border-repolens"
                style={{ backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="d-flex align-items-center gap-3 overflow-hidden">
                  <div
                    className="p-2 rounded d-flex align-items-center justify-content-center"
                    style={{
                      backgroundColor: 'rgba(240, 80, 51, 0.1)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <VscDatabase size={18} />
                  </div>

                  <div className="overflow-hidden">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-white fw-bold small" style={{ fontFamily: 'ui-monospace, monospace' }}>
                        {item.modelName}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${badge.color}`,
                          color: badge.color,
                          fontSize: '0.65rem',
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="code-badge" style={{ fontSize: '0.65rem' }}>
                        {item.technology}
                      </span>
                    </div>

                    <div className="text-repolens-secondary small text-truncate mt-1" style={{ fontSize: '0.75rem', maxWidth: '520px', fontFamily: 'monospace' }}>
                      {item.evidence}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                    {item.file}:L{item.startLine}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigateToFile(item.file)}
                    className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                    title="View source"
                  >
                    <span>View</span>
                    <VscArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
