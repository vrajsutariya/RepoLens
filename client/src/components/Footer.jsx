export default function Footer() {
  return (
    <footer className="border-top border-repolens bg-repolens-surface py-3 px-4 mt-auto">
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-2 small text-repolens-secondary">
        <div>
          <span>RepoLens</span> &copy; {new Date().getFullYear()} &middot; Built on MERN + Google Gemini API
        </div>
        <div className="d-flex align-items-center gap-3">
          <span>React Flow Visualization</span>
          <span>&middot;</span>
          <span>Code Intelligence Foundation</span>
        </div>
      </div>
    </footer>
  );
}
