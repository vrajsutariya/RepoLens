import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';

export default function OnboardingSection({
  title,
  icon = null,
  badge = null,
  defaultOpen = true,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded border mb-3 overflow-hidden shadow-sm"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-100 p-3 border-0 d-flex align-items-center justify-content-between text-start cursor-pointer"
        style={{
          backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
          color: 'var(--color-text-primary)',
          transition: 'background-color var(--transition-fast)',
        }}
        aria-expanded={isOpen}
      >
        <div className="d-flex align-items-center gap-2">
          {icon && (
            <span style={{ color: 'var(--color-primary)' }} className="d-flex align-items-center">
              {icon}
            </span>
          )}
          <h2 className="h6 mb-0 fw-bold text-white" style={{ fontSize: '0.925rem' }}>
            {title}
          </h2>
          {badge && (
            <span
              className="badge ms-1"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.15)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(240, 80, 51, 0.3)',
                fontSize: '0.675rem',
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="text-repolens-secondary">
          {isOpen ? <VscChevronDown size={16} /> : <VscChevronRight size={16} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-top"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
