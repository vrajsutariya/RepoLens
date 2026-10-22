import { motion } from 'motion/react';
import {
  VscBook,
  VscSparkle,
  VscChecklist,
  VscServerProcess,
  VscTerminal,
  VscLayers,
  VscWarning,
} from 'react-icons/vsc';

export default function OnboardingEmptyState({
  onGenerate,
  isGenerating = false,
  error = null,
}) {
  const features = [
    {
      icon: <VscLayers size={18} />,
      title: 'Project & Architecture Overview',
      desc: 'Explains project purpose, primary tech stack, entry points, and component hierarchy.',
    },
    {
      icon: <VscTerminal size={18} />,
      title: 'Local Setup & Run Guide',
      desc: 'Step-by-step verified dependency installation, development, and production commands.',
    },
    {
      icon: <VscChecklist size={18} />,
      title: 'Environment Configuration',
      desc: 'Checklist of required environment variables with safe, redacted placeholders.',
    },
    {
      icon: <VscBook size={18} />,
      title: 'Recommended Reading Order',
      desc: 'Prioritized list of files and line ranges new developers should read first.',
    },
    {
      icon: <VscServerProcess size={18} />,
      title: 'Request & Data Flow',
      desc: 'Lifecycle of API requests from route mounts to controllers and database operations.',
    },
    {
      icon: <VscSparkle size={18} />,
      title: 'Testing & Troubleshooting',
      desc: 'Verified test commands and evidence-backed solutions to common local setup problems.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 p-md-5 rounded border text-center shadow-sm"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="mx-auto mb-3 p-3 rounded-circle d-flex align-items-center justify-content-center"
        style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(240, 80, 51, 0.15)',
          color: 'var(--color-primary)',
        }}
      >
        <VscBook size={32} />
      </div>

      <h2 className="h4 fw-bold text-white mb-2">Repository Onboarding & Setup Assistant</h2>
      <p
        className="text-repolens-secondary mx-auto mb-4"
        style={{ maxWidth: '620px', fontSize: '0.9rem', lineHeight: 1.6 }}
      >
        Generate an intelligent, repository-specific onboarding guide synthesized from actual code evidence,
        manifest scripts, entry points, and static analysis results.
      </p>

      {/* Feature Grid */}
      <div className="row g-3 text-start mb-4 justify-content-center" style={{ maxWidth: '850px', margin: '0 auto' }}>
        {features.map((item, idx) => (
          <div key={idx} className="col-12 col-md-6 col-lg-4">
            <div
              className="p-3 rounded border h-100"
              style={{
                backgroundColor: 'var(--color-background)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div style={{ color: 'var(--color-primary)' }} className="mb-2">
                {item.icon}
              </div>
              <div className="fw-semibold text-white small mb-1">{item.title}</div>
              <div className="text-repolens-secondary small" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-center gap-2 mx-auto mb-4 py-2 px-3 small"
          style={{ maxWidth: '600px', fontSize: '0.825rem' }}
        >
          <VscWarning size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow"
        style={{
          backgroundColor: 'var(--color-primary)',
          borderColor: 'var(--color-primary)',
        }}
      >
        {isGenerating ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            <span>Analyzing Repository & Generating Guide...</span>
          </>
        ) : (
          <>
            <VscSparkle size={18} />
            <span>Generate Onboarding Guide</span>
          </>
        )}
      </button>

      <div className="text-repolens-secondary small mt-3" style={{ fontSize: '0.75rem' }}>
        RepoLens never runs repository code. Guides are generated via static analysis and verified disk excerpts.
      </div>
    </motion.div>
  );
}
