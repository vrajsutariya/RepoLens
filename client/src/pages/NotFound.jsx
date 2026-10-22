import { Link } from 'react-router-dom';
import { VscSearch } from 'react-icons/vsc';

export default function NotFound() {
  return (
    <div className="container py-5 text-center flex-grow-1 d-flex flex-column justify-content-center align-items-center">
      <div
        className="d-inline-flex p-3 mb-3 rounded-circle"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
        }}
      >
        <VscSearch size={32} />
      </div>
      <h1 className="h3 fw-bold text-white mb-2">404 — Page Not Found</h1>
      <p className="text-repolens-secondary mb-4">
        The requested URL was not found in the RepoLens workspace.
      </p>
      <Link to="/" className="btn btn-repolens-primary">
        Return to Workspace
      </Link>
    </div>
  );
}
