import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  VscRepo,
  VscAdd,
  VscFolder,
  VscPulse,
  VscCheck,
  VscWarning,
  VscChevronDown,
  VscChevronUp,
} from 'react-icons/vsc';

export default function Sidebar({
  repositories = [],
  activeRepoId = null,
  onSelectRepo,
  onNewIngestion,
  backendStatus,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isHealthy = backendStatus?.data?.status === 'ok';
  const isDBConnected = backendStatus?.data?.services?.database === 'connected';

  return (
    <aside
      className="d-flex flex-column border-end border-repolens bg-repolens-surface flex-shrink-0"
      style={{
        width: '280px',
        minHeight: 'calc(100vh - 65px)',
      }}
    >
      {/* Action: New Ingestion */}
      <div className="p-3 border-bottom border-repolens">
        <button
          type="button"
          onClick={onNewIngestion}
          className="btn-repolens-primary w-100 py-2"
          style={{ fontSize: '0.85rem' }}
        >
          <VscAdd size={16} />
          <span>Ingest Repository</span>
        </button>
      </div>

      {/* Repositories List Section */}
      <div className="flex-grow-1 overflow-auto p-2">
        <div className="d-flex align-items-center justify-content-between px-2 py-2 text-repolens-secondary small fw-semibold">
          <span className="text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
            Repositories ({repositories.length})
          </span>
          {repositories.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-sm text-repolens-secondary p-0 border-0"
              style={{ fontSize: '0.75rem' }}
              title={isCollapsed ? 'Expand list' : 'Collapse list'}
            >
              {isCollapsed ? <VscChevronDown size={14} /> : <VscChevronUp size={14} />}
            </button>
          )}
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {repositories.length === 0 ? (
                <div className="p-3 text-center text-repolens-secondary small">
                  <VscFolder size={24} className="mb-2 opacity-50" />
                  <p className="mb-0" style={{ fontSize: '0.8rem' }}>
                    No repositories ingested yet. Upload a ZIP or import a Git URL.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {repositories.map((repo) => {
                    const isActive = repo._id === activeRepoId;
                    return (
                      <motion.button
                        key={repo._id}
                        type="button"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectRepo(repo._id)}
                        className={`btn text-start p-2 rounded d-flex align-items-start gap-2 border-0 w-100 ${
                          isActive ? 'bg-repolens-hover text-white' : 'text-repolens-secondary'
                        }`}
                        style={{
                          backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                          borderLeft: isActive
                            ? '3px solid var(--color-primary)'
                            : '3px solid transparent',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                      >
                        <VscRepo
                          size={16}
                          style={{
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            marginTop: '2px',
                            flexShrink: 0,
                          }}
                        />
                        <div className="overflow-hidden w-100">
                          <div
                            className="text-truncate fw-medium small"
                            style={{ color: isActive ? '#ffffff' : 'inherit' }}
                          >
                            {repo.name}
                          </div>
                          <div
                            className="d-flex align-items-center gap-2 text-repolens-secondary mt-1"
                            style={{ fontSize: '0.7rem' }}
                          >
                            <span className="text-uppercase">{repo.sourceType}</span>
                            <span>&middot;</span>
                            <span>{repo.totalFiles || 0} files</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backend & DB Health Indicator */}
      <div className="p-3 border-top border-repolens bg-repolens-bg small">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span className="text-repolens-secondary" style={{ fontSize: '0.75rem' }}>
            System Environment
          </span>
          <span className="code-badge" style={{ fontSize: '0.65rem' }}>
            {backendStatus?.data?.environment || 'dev'}
          </span>
        </div>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-1">
            {isHealthy ? (
              <VscCheck size={12} style={{ color: 'var(--color-success)' }} />
            ) : (
              <VscPulse size={12} style={{ color: 'var(--color-error)' }} />
            )}
            <span style={{ fontSize: '0.75rem', color: isHealthy ? 'var(--color-text-primary)' : 'var(--color-error)' }}>
              API: {isHealthy ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="d-flex align-items-center gap-1">
            {isDBConnected ? (
              <VscCheck size={12} style={{ color: 'var(--color-success)' }} />
            ) : (
              <VscWarning size={12} style={{ color: 'var(--color-warning)' }} />
            )}
            <span style={{ fontSize: '0.75rem', color: isDBConnected ? 'var(--color-text-primary)' : 'var(--color-warning)' }}>
              DB: {isDBConnected ? 'Connected' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
