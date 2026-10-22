import { useState } from 'react';
import { VscChevronDown, VscChevronUp, VscInfo } from 'react-icons/vsc';

const LEGEND_ITEMS = [
  { label: 'Entry Point', color: '#F05033' },
  { label: 'API Route', color: '#10b981' },
  { label: 'Controller', color: '#06b6d4' },
  { label: 'Middleware', color: '#f59e0b' },
  { label: 'Database Model', color: '#f43f5e' },
  { label: 'Function / Class', color: '#3b82f6' },
  { label: 'Circular Cycle', color: '#facc15', isDashed: true },
];

export default function GraphLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="position-absolute bottom-0 start-0 m-3 rounded border shadow-sm"
      style={{
        backgroundColor: 'rgba(23, 23, 25, 0.92)',
        borderColor: 'var(--color-border)',
        backdropFilter: 'blur(6px)',
        zIndex: 5,
        maxWidth: '280px',
        fontSize: '0.75rem',
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn-sm w-100 p-2 d-flex align-items-center justify-content-between text-repolens-secondary border-0"
        style={{ fontSize: '0.75rem' }}
      >
        <div className="d-flex align-items-center gap-1">
          <VscInfo size={13} style={{ color: 'var(--color-primary)' }} />
          <span className="fw-semibold text-white">Graph Legend</span>
        </div>
        {isExpanded ? <VscChevronDown size={14} /> : <VscChevronUp size={14} />}
      </button>

      {isExpanded && (
        <div className="p-2 pt-0 border-top border-repolens d-flex flex-column gap-1">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: '12px',
                  height: item.isDashed ? '2px' : '10px',
                  borderRadius: item.isDashed ? '0' : '2px',
                  backgroundColor: item.color,
                  borderTop: item.isDashed ? `2px dashed ${item.color}` : 'none',
                  flexShrink: 0,
                }}
              />
              <span className="text-repolens-secondary" style={{ fontSize: '0.72rem' }}>
                {item.label}
              </span>
            </div>
          ))}
          <div className="mt-1 pt-1 border-top border-repolens text-repolens-secondary" style={{ fontSize: '0.68rem' }}>
            All edges derived from verified AST imports, route mounts, and database queries.
          </div>
        </div>
      )}
    </div>
  );
}
