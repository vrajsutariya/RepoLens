import {
  VscGitMerge,
  VscServerProcess,
  VscSymbolMethod,
  VscDatabase,
  VscSearch,
  VscScreenFull,
  VscMap,
  VscFilter,
} from 'react-icons/vsc';

const GRAPH_TABS = [
  { id: 'modules', label: 'Module Dependencies', icon: <VscGitMerge size={14} /> },
  { id: 'api-flow', label: 'API Request Flow', icon: <VscServerProcess size={14} /> },
  { id: 'call-graph', label: 'Function Call Graph', icon: <VscSymbolMethod size={14} /> },
  { id: 'database', label: 'Database Interactions', icon: <VscDatabase size={14} /> },
];

export default function GraphToolbar({
  activeGraphType,
  onChangeGraphType,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  categories = [],
  onFitView,
  showMiniMap,
  onToggleMiniMap,
  metadata,
}) {
  return (
    <div
      className="p-2 px-3 border-bottom border-repolens bg-repolens-surface d-flex flex-wrap align-items-center justify-content-between gap-2 flex-shrink-0"
      style={{ zIndex: 4 }}
    >
      {/* Graph Type Selector Tabs */}
      <div className="btn-group btn-group-sm flex-wrap">
        {GRAPH_TABS.map((tab) => {
          const isActive = activeGraphType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeGraphType(tab.id)}
              className={`btn btn-sm d-flex align-items-center gap-1 ${
                isActive ? 'btn-repolens-primary' : 'btn-repolens-outline'
              }`}
              style={{ fontSize: '0.78rem' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search, Filter & View Controls */}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="position-relative" style={{ width: '180px' }}>
          <VscSearch
            size={13}
            className="position-absolute text-repolens-secondary"
            style={{ top: '8px', left: '8px' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className="form-control form-control-sm text-white"
            style={{
              backgroundColor: '#09090b',
              borderColor: 'var(--color-border)',
              paddingLeft: '26px',
              fontSize: '0.75rem',
              height: '28px',
            }}
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="d-flex align-items-center gap-1">
            <VscFilter size={13} className="text-repolens-secondary" />
            <select
              value={filterCategory}
              onChange={(e) => onFilterCategoryChange(e.target.value)}
              className="form-select form-select-sm text-white"
              style={{
                backgroundColor: '#09090b',
                borderColor: 'var(--color-border)',
                fontSize: '0.75rem',
                height: '28px',
                width: '130px',
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Graph Metrics Pill */}
        {metadata && (
          <div
            className="px-2 py-1 rounded d-flex align-items-center gap-2 text-repolens-secondary"
            style={{
              backgroundColor: '#09090b',
              border: '1px solid var(--color-border)',
              fontSize: '0.72rem',
            }}
          >
            <span>
              <strong className="text-white">{metadata.totalNodes || 0}</strong> nodes
            </span>
            <span>&middot;</span>
            <span>
              <strong className="text-white">{metadata.totalEdges || 0}</strong> edges
            </span>
          </div>
        )}

        {/* Fit View Button */}
        <button
          type="button"
          onClick={onFitView}
          className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
          style={{ fontSize: '0.75rem', height: '28px' }}
          title="Fit graph to view"
        >
          <VscScreenFull size={13} />
          <span className="d-none d-md-inline">Fit</span>
        </button>

        {/* Toggle MiniMap Button */}
        <button
          type="button"
          onClick={onToggleMiniMap}
          className={`btn btn-sm py-1 px-2 d-flex align-items-center gap-1 ${
            showMiniMap ? 'btn-repolens-primary' : 'btn-repolens-outline'
          }`}
          style={{ fontSize: '0.75rem', height: '28px' }}
          title="Toggle MiniMap"
        >
          <VscMap size={13} />
        </button>
      </div>
    </div>
  );
}
