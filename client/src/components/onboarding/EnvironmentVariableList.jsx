import { useState } from 'react';
import toast from 'react-hot-toast';
import { VscCopy, VscCheck, VscShield, VscFileCode, VscChecklist } from 'react-icons/vsc';

export default function EnvironmentVariableList({
  variables = [],
  exampleFilePath = null,
  setupInstructions = null,
  onNavigateToFile = null,
}) {
  const [copiedVar, setCopiedVar] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopySingle = async (varName, placeholder) => {
    try {
      await navigator.clipboard.writeText(`${varName}=${placeholder}`);
      setCopiedVar(varName);
      toast.success(`Copied ${varName} to clipboard`);
      setTimeout(() => setCopiedVar(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleCopyAll = async () => {
    try {
      const content = variables
        .map((v) => `# ${v.description || v.usedBy || 'Configuration'}\n${v.name}=${v.placeholder || ''}`)
        .join('\n\n');

      await navigator.clipboard.writeText(content);
      setCopiedAll(true);
      toast.success('Generated and copied .env template to clipboard!');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <div>
      {/* Header with security disclosure and copy-all button */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span
            className="p-1 rounded d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--color-success)',
            }}
          >
            <VscShield size={16} />
          </span>
          <div>
            <span className="small text-white fw-medium d-block">
              Secrets Redacted & Safe Placeholders
            </span>
            <span className="text-repolens-secondary" style={{ fontSize: '0.75rem' }}>
              Real secrets and passwords are never exposed. Fill in safe values for local development.
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {exampleFilePath && onNavigateToFile && (
            <button
              type="button"
              onClick={() => onNavigateToFile(exampleFilePath)}
              className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
              style={{ fontSize: '0.75rem' }}
              title="Inspect template file in Code Viewer"
            >
              <VscFileCode size={14} />
              <span>View {exampleFilePath}</span>
            </button>
          )}

          {variables.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
              style={{
                backgroundColor: copiedAll ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface-hover)',
                borderColor: copiedAll ? 'var(--color-success)' : 'var(--color-border)',
                color: copiedAll ? 'var(--color-success)' : 'var(--color-text-primary)',
                fontSize: '0.75rem',
              }}
              title="Copy complete sanitized .env file to clipboard"
            >
              {copiedAll ? <VscCheck size={14} /> : <VscCopy size={14} />}
              <span>{copiedAll ? 'Copied .env' : 'Copy Full .env'}</span>
            </button>
          )}
        </div>
      </div>

      {setupInstructions && (
        <div
          className="p-2 mb-3 rounded text-repolens-secondary small"
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            fontSize: '0.775rem',
          }}
        >
          <strong>Setup Step:</strong> {setupInstructions}
        </div>
      )}

      {/* Variables List / Cards */}
      {variables.length === 0 ? (
        <div
          className="p-3 text-center text-repolens-secondary rounded border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            fontSize: '0.8rem',
          }}
        >
          No explicit environment variables or template files were detected in this repository.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {variables.map((v) => {
            const isCopied = copiedVar === v.name;
            return (
              <div
                key={v.name}
                className="p-2 p-md-3 rounded border d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div style={{ maxWidth: '65%' }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="font-monospace text-white fw-bold" style={{ fontSize: '0.85rem' }}>
                      {v.name}
                    </span>
                    {v.required ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: 'var(--color-error)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '0.625rem',
                        }}
                      >
                        Required
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(161, 161, 170, 0.15)',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.625rem',
                        }}
                      >
                        Optional
                      </span>
                    )}
                    {v.usedBy && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '0.625rem',
                        }}
                      >
                        {v.usedBy}
                      </span>
                    )}
                  </div>
                  {v.description && (
                    <div className="text-repolens-secondary small mt-1" style={{ fontSize: '0.75rem' }}>
                      {v.description}
                    </div>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2 w-100 w-md-auto justify-content-between justify-content-md-end">
                  <span
                    className="font-monospace px-2 py-1 rounded small text-truncate"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      maxWidth: '220px',
                    }}
                    title={v.placeholder}
                  >
                    {v.placeholder || '<value>'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(v.name, v.placeholder)}
                    className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1"
                    style={{
                      backgroundColor: isCopied ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface-hover)',
                      borderColor: isCopied ? 'var(--color-success)' : 'var(--color-border)',
                      color: isCopied ? 'var(--color-success)' : 'var(--color-text-primary)',
                      fontSize: '0.7rem',
                    }}
                    title={`Copy ${v.name}=${v.placeholder}`}
                  >
                    {isCopied ? <VscCheck size={12} /> : <VscCopy size={12} />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
