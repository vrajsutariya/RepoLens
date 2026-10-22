import { Link, useLocation } from 'react-router-dom';
import { VscRepo, VscPulse, VscBook } from 'react-icons/vsc';

export default function Header({ backendStatus }) {
  const location = useLocation();

  const isHealthy = backendStatus?.data?.status === 'ok';
  const isChecking = backendStatus?.loading;

  return (
    <header className="border-bottom border-repolens bg-repolens-surface py-3 px-4">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
        {/* Brand */}
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(240, 80, 51, 0.15)',
              border: '1px solid rgba(240, 80, 51, 0.3)',
              color: 'var(--color-primary)',
            }}
          >
            <VscRepo size={20} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold fs-5 text-white tracking-tight">RepoLens</span>
              <span className="repolens-badge">Code Intelligence</span>
            </div>
            <div className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
              Instant Codebase Understanding
            </div>
          </div>
        </Link>

        {/* Navigation & Status */}
        <div className="d-flex align-items-center gap-4">
          <nav className="d-flex align-items-center gap-3">
            <Link
              to="/"
              className={`small fw-medium ${
                location.pathname === '/' ? 'text-repolens-primary' : 'text-repolens-secondary'
              }`}
            >
              Workspace
            </Link>
            <a
              href="#docs"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://github.com', '_blank', 'noopener,noreferrer');
              }}
              className="small fw-medium text-repolens-secondary d-flex align-items-center gap-1"
            >
              <VscBook size={14} />
              <span>Docs</span>
            </a>
          </nav>

          <div
            className="d-flex align-items-center gap-2 px-2 py-1 rounded small"
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              fontSize: '0.75rem',
            }}
            title={
              isChecking
                ? 'Checking backend connection...'
                : isHealthy
                ? 'Backend connected and healthy'
                : 'Backend unreachable'
            }
          >
            <VscPulse
              size={14}
              style={{
                color: isChecking
                  ? 'var(--color-warning)'
                  : isHealthy
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
              }}
            />
            <span className="text-repolens-secondary">
              {isChecking ? 'Connecting API...' : isHealthy ? 'API Active' : 'API Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
