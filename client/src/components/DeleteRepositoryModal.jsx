import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VscTrash, VscWarning, VscLoading } from 'react-icons/vsc';

/**
 * Accessible confirmation modal for permanently deleting an ingested repository.
 */
export default function DeleteRepositoryModal({
  isOpen,
  repository,
  isDeleting,
  onConfirm,
  onCancel,
}) {
  // Close on Escape key when not actively deleting
  useEffect(() => {
    if (!isOpen || isDeleting) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !repository) return null;

  return (
    <AnimatePresence>
      <div
        className="modal show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-repo-modal-title"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 1050,
        }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document" style={{ maxWidth: '480px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="modal-content text-white"
            style={{
              backgroundColor: 'var(--color-surface, #171719)',
              borderColor: 'var(--color-border, #27272a)',
              borderRadius: 'var(--radius-md, 8px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Modal Header */}
            <div className="modal-header border-bottom border-repolens pb-3 pt-3 px-4 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2 text-danger">
                <div
                  className="p-2 rounded d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                  }}
                >
                  <VscTrash size={18} />
                </div>
                <h2 className="modal-title h6 fw-bold mb-0 text-white" id="delete-repo-modal-title">
                  Delete Repository
                </h2>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={onCancel}
                disabled={isDeleting}
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            {/* Modal Body */}
            <div className="modal-body px-4 py-3">
              <div
                className="p-3 mb-3 rounded d-flex align-items-start gap-2"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.825rem',
                  color: '#fca5a5',
                }}
              >
                <VscWarning size={18} className="flex-shrink-0 mt-1" style={{ color: '#ef4444' }} />
                <div>
                  Are you sure you want to delete <strong className="text-white fw-bold">{repository.name}</strong>?
                  This will permanently remove this repository and its stored RepoLens analysis. This action cannot be undone.
                </div>
              </div>

              <p className="text-repolens-secondary small mb-0" style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                All indexed files, extracted Abstract Syntax Tree (AST) symbols, API endpoints, dependency graphs,
                and generated onboarding guides will be completely erased from disk and database storage.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-top border-repolens pt-3 pb-3 px-4 d-flex align-items-center justify-content-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="btn btn-sm btn-repolens-outline py-2 px-3 fw-medium"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="btn btn-sm btn-danger py-2 px-3 fw-medium d-flex align-items-center gap-2"
                style={{
                  backgroundColor: '#ef4444',
                  borderColor: '#dc2626',
                  fontSize: '0.85rem',
                }}
              >
                {isDeleting ? (
                  <>
                    <VscLoading className="spin" size={16} />
                    <span>Deleting Repository...</span>
                  </>
                ) : (
                  <>
                    <VscTrash size={16} />
                    <span>Delete Repository</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
