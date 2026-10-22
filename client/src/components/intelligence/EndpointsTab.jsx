import { useState, useMemo } from 'react';
import { VscServerProcess, VscSearch, VscArrowRight } from 'react-icons/vsc';

const getMethodBadgeClass = (method) => {
  switch (method) {
    case 'GET':
      return { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' };
    case 'POST':
      return { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
    case 'PUT':
      return { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.4)', color: '#fb923c' };
    case 'DELETE':
      return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#f87171' };
    case 'PATCH':
      return { bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.4)', color: '#c084fc' };
    default:
      return { bg: 'rgba(255, 255, 255, 0.1)', border: 'var(--color-border)', color: 'var(--color-text-secondary)' };
  }
};

export default function EndpointsTab({ endpoints = [], onNavigateToFile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchesMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
      const q = searchQuery.toLowerCase().trim();
      const pathStr = (ep?.path || '').toLowerCase();
      const fileStr = (ep?.file || '').toLowerCase();
      const handlerStr = (ep?.handlerName || '').toLowerCase();

      const matchesQuery =
        !q ||
        pathStr.includes(q) ||
        fileStr.includes(q) ||
        handlerStr.includes(q);

      return matchesMethod && matchesQuery;
    });
  }, [endpoints, searchQuery, selectedMethod]);

  const uniqueMethods = useMemo(() => {
    const s = new Set(endpoints.map((e) => e.method));
    return ['ALL', ...Array.from(s)];
  }, [endpoints]);

  return (
    <div className="d-flex flex-column h-100 p-4 overflow-hidden">
      {/* Search and Method Filter */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom border-repolens">
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: '280px' }}>
            <span className="input-group-text bg-repolens-bg border-repolens text-repolens-secondary">
              <VscSearch size={14} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter routes, paths, or handlers..."
              className="form-control bg-repolens-bg text-white border-repolens"
              style={{ fontSize: '0.8rem' }}
            />
          </div>

          {/* Method filters */}
          <div className="btn-group btn-group-sm">
            {uniqueMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMethod(m)}
                className={`btn btn-sm ${
                  selectedMethod === m ? 'btn-repolens-primary' : 'btn-repolens-outline'
                }`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <span className="code-badge" style={{ fontSize: '0.75rem' }}>
          {filteredEndpoints.length} endpoints discovered
        </span>
      </div>

      {/* Endpoints List */}
      <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
        {filteredEndpoints.length === 0 ? (
          <div className="p-5 text-center text-repolens-secondary small">
            <VscServerProcess size={32} className="mb-2 opacity-50" />
            <p className="mb-0">No API routes found matching criteria.</p>
          </div>
        ) : (
          filteredEndpoints.map((ep, idx) => {
            const badgeStyle = getMethodBadgeClass(ep.method);
            return (
              <div
                key={`${ep.method}-${ep.path}-${ep.file}-${idx}`}
                className="p-3 rounded d-flex flex-wrap align-items-center justify-content-between gap-3 border border-repolens"
                style={{ backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="d-flex align-items-center gap-3 overflow-hidden">
                  <span
                    className="fw-bold small px-2 py-1 rounded"
                    style={{
                      backgroundColor: badgeStyle.bg,
                      border: `1px solid ${badgeStyle.border}`,
                      color: badgeStyle.color,
                      fontSize: '0.75rem',
                      fontFamily: 'ui-monospace, monospace',
                      minWidth: '58px',
                      textAlign: 'center',
                    }}
                  >
                    {ep.method}
                  </span>

                  <div className="overflow-hidden">
                    <span className="text-white fw-bold small" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {ep.path}
                    </span>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                        Handler: <strong className="text-white">{ep.handlerName}</strong>
                      </span>
                      {ep.middlewares && ep.middlewares.length > 0 && (
                        <span className="code-badge" style={{ fontSize: '0.65rem' }}>
                          middleware: {ep.middlewares.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                    {ep.file}:L{ep.startLine}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigateToFile(ep.file)}
                    className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                    title="View route definition"
                  >
                    <span>View Route</span>
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
