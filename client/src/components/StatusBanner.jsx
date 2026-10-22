import { VscWarning, VscInfo, VscRefresh } from 'react-icons/vsc';

export default function StatusBanner({ type = 'info', message, onRetry }) {
  if (!message) return null;

  const isError = type === 'error';
  const isWarning = type === 'warning';

  const bgColor = isError
    ? 'rgba(239, 68, 68, 0.1)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.1)'
    : 'rgba(240, 80, 51, 0.1)';

  const borderColor = isError
    ? 'var(--color-error)'
    : isWarning
    ? 'var(--color-warning)'
    : 'var(--color-primary)';

  const textColor = isError
    ? 'var(--color-error)'
    : isWarning
    ? 'var(--color-warning)'
    : 'var(--color-text-primary)';

  return (
    <div
      className="p-3 mb-4 rounded d-flex align-items-center justify-content-between gap-3"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
      }}
      role="alert"
    >
      <div className="d-flex align-items-center gap-2">
        {isError || isWarning ? (
          <VscWarning size={18} style={{ color: borderColor, flexShrink: 0 }} />
        ) : (
          <VscInfo size={18} style={{ color: borderColor, flexShrink: 0 }} />
        )}
        <span style={{ color: textColor, fontSize: '0.9rem' }}>{message}</span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-sm btn-repolens-outline d-flex align-items-center gap-1"
          style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
        >
          <VscRefresh size={14} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
