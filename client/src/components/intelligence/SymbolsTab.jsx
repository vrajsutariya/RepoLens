import { useState, useMemo } from 'react';
import {
  VscSymbolMethod,
  VscSymbolClass,
  VscSymbolVariable,
  VscSearch,
  VscArrowRight,
} from 'react-icons/vsc';

const getSymbolIcon = (type) => {
  switch (type) {
    case 'class':
      return <VscSymbolClass size={15} style={{ color: '#fb923c' }} />;
    case 'method':
      return <VscSymbolMethod size={15} style={{ color: '#facc15' }} />;
    case 'function':
    case 'arrow-function':
      return <VscSymbolMethod size={15} style={{ color: '#38bdf8' }} />;
    default:
      return <VscSymbolVariable size={15} style={{ color: '#a1a1aa' }} />;
  }
};

export default function SymbolsTab({ symbols = [], onNavigateToFile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredSymbols = useMemo(() => {
    return symbols.filter((sym) => {
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'function' && (sym.type === 'function' || sym.type === 'arrow-function')) ||
        sym.type === selectedType;

      const q = searchQuery.toLowerCase().trim();
      const name = (sym?.name || '').toLowerCase();
      const file = (sym?.file || '').toLowerCase();
      const parent = (sym?.parentClass || '').toLowerCase();

      const matchesQuery =
        !q ||
        name.includes(q) ||
        file.includes(q) ||
        parent.includes(q);

      return matchesType && matchesQuery;
    });
  }, [symbols, searchQuery, selectedType]);

  return (
    <div className="d-flex flex-column h-100 p-4 overflow-hidden">
      {/* Top Filter and Search Bar */}
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
              placeholder="Search symbols or files..."
              className="form-control bg-repolens-bg text-white border-repolens"
              style={{ fontSize: '0.8rem' }}
            />
          </div>

          {/* Type filters */}
          <div className="btn-group btn-group-sm">
            {[
              { id: 'all', label: 'All' },
              { id: 'function', label: 'Functions' },
              { id: 'class', label: 'Classes' },
              { id: 'method', label: 'Methods' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                className={`btn btn-sm ${
                  selectedType === t.id ? 'btn-repolens-primary' : 'btn-repolens-outline'
                }`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <span className="code-badge" style={{ fontSize: '0.75rem' }}>
          Showing {filteredSymbols.length} of {symbols.length} symbols
        </span>
      </div>

      {/* Symbols List */}
      <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
        {filteredSymbols.length === 0 ? (
          <div className="p-5 text-center text-repolens-secondary small">
            No symbols found matching the current search criteria.
          </div>
        ) : (
          filteredSymbols.map((sym, idx) => (
            <div
              key={`${sym.file}-${sym.name}-${idx}`}
              className="p-2 px-3 rounded d-flex align-items-center justify-content-between gap-3 border border-repolens"
              style={{
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--radius-sm)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                {getSymbolIcon(sym.type)}
                <span className="text-white fw-semibold small text-truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {sym.name}
                </span>

                {sym.params && sym.params.length > 0 && (
                  <span className="text-repolens-secondary small d-none d-md-inline" style={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace' }}>
                    ({sym.params.join(', ')})
                  </span>
                )}

                {sym.isExported && (
                  <span className="repolens-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                    export
                  </span>
                )}
                {sym.isAsync && (
                  <span className="code-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                    async
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-3 flex-shrink-0">
                <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                  {sym.file}:L{sym.startLine}-{sym.endLine}
                </span>

                <button
                  type="button"
                  onClick={() => onNavigateToFile(sym.file)}
                  className="btn btn-sm btn-repolens-outline py-0 px-2 d-flex align-items-center gap-1"
                  style={{ fontSize: '0.75rem' }}
                  title="View file"
                >
                  <span>View</span>
                  <VscArrowRight size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
