import { useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { VscCopy, VscCheck, VscWarning, VscVerified, VscInfo } from 'react-icons/vsc';

export default function SetupCommand({
  command,
  description,
  isVerified = false,
  warning = null,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success(`Copied command to clipboard: ${command}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <div
      className="p-3 rounded border mb-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: warning ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border)',
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-1 gap-2 flex-wrap">
        <div className="d-flex align-items-center gap-2">
          {description && (
            <span className="small fw-semibold text-white">{description}</span>
          )}
          {isVerified ? (
            <span
              className="badge d-flex align-items-center gap-1"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--color-success)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '0.65rem',
              }}
              title="Verified: Matches a script declared in package manifests"
            >
              <VscVerified size={12} />
              Verified Script
            </span>
          ) : (
            <span
              className="badge d-flex align-items-center gap-1"
              style={{
                backgroundColor: 'rgba(161, 161, 170, 0.15)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                fontSize: '0.65rem',
              }}
              title="Inferred or standard manual setup instruction"
            >
              <VscInfo size={12} />
              Manual Step
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
          style={{
            backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface-hover)',
            borderColor: copied ? 'var(--color-success)' : 'var(--color-border)',
            color: copied ? 'var(--color-success)' : 'var(--color-text-primary)',
            fontSize: '0.75rem',
            transition: 'all var(--transition-fast)',
          }}
          title="Copy command to clipboard"
          aria-label={`Copy command: ${command}`}
        >
          {copied ? <VscCheck size={14} /> : <VscCopy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Terminal Command Display */}
      <div
        className="d-flex align-items-center justify-content-between p-2 rounded mt-1 font-monospace"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          fontSize: '0.825rem',
          userSelect: 'all',
        }}
      >
        <span className="text-white text-truncate">
          <span style={{ color: 'var(--color-primary)' }} className="me-2 fw-bold select-none">
            $
          </span>
          {command}
        </span>
      </div>

      {/* Safety Warning */}
      {warning && (
        <div
          className="mt-2 p-2 rounded d-flex align-items-center gap-2 small"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--color-warning)',
            fontSize: '0.75rem',
          }}
        >
          <VscWarning size={15} className="flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
