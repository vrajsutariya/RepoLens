import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  VscFileCode,
  VscCopy,
  VscCheck,
  VscLoading,
  VscWarning,
  VscFileMedia,
  VscInfo,
} from 'react-icons/vsc';

export default function FileViewer({
  fileData,
  isLoading,
  error,
  highlightRange,
  onClearHighlight,
}) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  // Auto-scroll to highlighted line range when citation is inspected
  useEffect(() => {
    if (highlightRange?.startLine && fileData?.content) {
      const targetId = `code-line-${highlightRange.startLine}`;
      const timeoutId = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightRange, fileData?.path, fileData?.content]);

  const handleCopyCode = async () => {
    if (!fileData?.content) return;
    try {
      await navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  const handleCopyPath = async () => {
    if (!fileData?.path) return;
    try {
      await navigator.clipboard.writeText(fileData.path);
      toast.success('File path copied!');
    } catch {
      toast.error('Failed to copy path.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-5 text-repolens-secondary">
        <VscLoading className="spin mb-3" size={32} style={{ color: 'var(--color-primary)' }} />
        <span className="small">Loading file content...</span>
      </div>
    );
  }

  // 2. Error state
  if (error) {
    return (
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-5 text-danger">
        <VscWarning size={32} className="mb-2" />
        <h6 className="fw-semibold">Error Loading File</h6>
        <p className="small text-repolens-secondary text-center mb-0">{error}</p>
      </div>
    );
  }

  // 3. Empty state: no file selected
  if (!fileData) {
    return (
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-5 text-repolens-secondary">
        <div
          className="p-3 mb-3 rounded-circle d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <VscFileCode size={36} />
        </div>
        <h6 className="text-white fw-semibold mb-1">No File Selected</h6>
        <p className="small text-repolens-secondary text-center mb-0" style={{ maxWidth: '380px' }}>
          Select any file from the file explorer on the left or inspect an evidence citation from the AI Assistant.
        </p>
      </div>
    );
  }

  // Split lines for numbering
  const lines = fileData.content ? fileData.content.split(/\r?\n/) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex-grow-1 d-flex flex-column h-100 overflow-hidden bg-repolens-bg"
    >
      {/* File Metadata Header Bar */}
      <div className="p-3 border-bottom border-repolens bg-repolens-surface d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2 overflow-hidden">
          <VscFileCode size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <span className="text-white fw-medium small text-truncate" title={fileData.path}>
              {fileData.path}
            </span>
            <button
              type="button"
              onClick={handleCopyPath}
              className="btn btn-sm text-repolens-secondary p-0 border-0"
              title="Copy relative file path"
            >
              <VscCopy size={13} />
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Highlight Range Badge */}
          {highlightRange?.startLine && (
            <div
              className="d-flex align-items-center gap-1 px-2 py-1 rounded"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.15)',
                border: '1px solid rgba(240, 80, 51, 0.4)',
                color: 'var(--color-primary)',
                fontSize: '0.725rem',
              }}
            >
              <span>
                Cited: Lines {highlightRange.startLine}&ndash;{highlightRange.endLine || highlightRange.startLine}
              </span>
              {onClearHighlight && (
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="btn btn-sm p-0 border-0 ms-1"
                  style={{ color: 'var(--color-primary)', lineHeight: 1 }}
                  title="Clear citation highlight"
                >
                  &times;
                </button>
              )}
            </div>
          )}

          {/* Metadata badges */}
          <span className="code-badge">{fileData.language || 'Plain Text'}</span>
          <span className="code-badge">{formatFileSize(fileData.size)}</span>
          {!fileData.isBinary && (
            <span className="code-badge">{fileData.lineCount || lines.length} lines</span>
          )}

          {!fileData.isBinary && fileData.content && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
              style={{ fontSize: '0.75rem' }}
            >
              {copied ? <VscCheck size={14} className="text-success" /> : <VscCopy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow-1 overflow-hidden d-flex flex-column" ref={containerRef}>
        {fileData.isBinary ? (
          /* Binary file warning */
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-5 text-repolens-secondary">
            <VscFileMedia size={36} className="mb-3 text-repolens-secondary" />
            <h6 className="text-white fw-semibold mb-1">Binary File</h6>
            <p className="small text-repolens-secondary text-center mb-0">
              {fileData.message || 'Binary files cannot be displayed as plain text.'}
            </p>
          </div>
        ) : fileData.isTruncated ? (
          /* File too large warning */
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-5 text-warning">
            <VscInfo size={36} className="mb-3" />
            <h6 className="fw-semibold text-white mb-1">File Exceeds Display Limit</h6>
            <p className="small text-repolens-secondary text-center mb-0">{fileData.message}</p>
          </div>
        ) : (
          /* Code content with line numbers and citation highlighting */
          <div className="code-viewer-container flex-grow-1 overflow-auto">
            <div className="code-line-numbers" aria-hidden="true">
              {lines.map((_, index) => {
                const lineNum = index + 1;
                const isHighlighted =
                  highlightRange &&
                  lineNum >= highlightRange.startLine &&
                  lineNum <= highlightRange.endLine;

                return (
                  <span
                    key={index}
                    className={`code-line-number ${isHighlighted ? 'text-primary fw-bold' : ''}`}
                    style={isHighlighted ? { color: 'var(--color-primary)', fontWeight: 600 } : {}}
                  >
                    {lineNum}
                  </span>
                );
              })}
            </div>
            <pre className="code-content m-0">
              <code>
                {lines.map((line, index) => {
                  const lineNum = index + 1;
                  const isHighlighted =
                    highlightRange &&
                    lineNum >= highlightRange.startLine &&
                    lineNum <= highlightRange.endLine;

                  return (
                    <div
                      key={index}
                      id={`code-line-${lineNum}`}
                      style={{
                        backgroundColor: isHighlighted ? 'rgba(240, 80, 51, 0.15)' : 'transparent',
                        borderLeft: isHighlighted
                          ? '3px solid var(--color-primary)'
                          : '3px solid transparent',
                        paddingLeft: '6px',
                        marginLeft: '-9px',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      {line || '\n'}
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
