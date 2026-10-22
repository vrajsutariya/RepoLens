import { motion } from 'motion/react';
import { VscGitMerge, VscRocket } from 'react-icons/vsc';

export default function DashboardHeader({ onAnalyzeClick, isAnalyzing }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 mb-4 rounded border border-repolens bg-repolens-surface d-flex flex-wrap align-items-center justify-content-between gap-3"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <div>
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="repolens-badge">
            <VscGitMerge size={14} />
            <span>Code Intelligence Pipeline</span>
          </span>
        </div>
        <h1 className="h3 fw-bold text-white mb-1">Understand any codebase.</h1>
        <p className="text-repolens-secondary small mb-0" style={{ maxWidth: '620px' }}>
          RepoLens extracts architecture, parses directory hierarchies, detects languages, and prepares
          verified context for AI-guided exploration.
        </p>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAnalyzeClick}
        className="btn-repolens-primary py-2 px-3"
      >
        <VscRocket size={16} />
        <span>{isAnalyzing ? 'Import in Progress...' : 'Analyze Repository'}</span>
      </motion.button>
    </motion.header>
  );
}
