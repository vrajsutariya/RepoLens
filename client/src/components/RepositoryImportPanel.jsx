import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  VscFolder,
  VscCloudUpload,
  VscLink,
  VscClose,
  VscLoading,
  VscCheck,
  VscInfo,
  VscFileZip,
} from 'react-icons/vsc';

const INGESTION_STAGES = [
  'Receiving repository archive or repository payload...',
  'Executing security validation & ZIP Slip checks...',
  'Extracting directory hierarchy into sandboxed storage...',
  'Indexing files and calculating language breakdown...',
  'Finalizing repository index and persisting metadata...',
];

export default function RepositoryImportPanel({
  onUploadZip,
  onImportGit,
  isProcessing,
  uploadProgress,
  processingStage,
  error,
  onClearError,
}) {
  const [activeTab, setActiveTab] = useState('zip'); // 'zip' | 'git'

  // ZIP form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [customRepoName, setCustomRepoName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [zipValidationError, setZipValidationError] = useState('');
  const fileInputRef = useRef(null);

  // Git URL form state
  const [gitUrl, setGitUrl] = useState('');
  const [urlValidationError, setUrlValidationError] = useState('');

  // Handle ZIP file selection and client-side validation
  const validateAndSetZip = (file) => {
    setZipValidationError('');
    if (onClearError) onClearError();

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setZipValidationError('Please upload a valid .zip compressed archive.');
      return;
    }

    const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE_BYTES) {
      setZipValidationError('File size exceeds the 25MB limit. Please provide a smaller archive.');
      return;
    }

    setSelectedFile(file);
    if (!customRepoName) {
      const derivedName = file.name.replace(/\.zip$/i, '');
      setCustomRepoName(derivedName);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetZip(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetZip(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setZipValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Git URL validation
  const handleUrlChange = (e) => {
    setGitUrl(e.target.value);
    setUrlValidationError('');
    if (onClearError) onClearError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (activeTab === 'zip') {
      if (!selectedFile) {
        setZipValidationError('Please select or drag a ZIP archive first.');
        return;
      }
      onUploadZip(selectedFile, customRepoName);
    } else {
      const trimmedUrl = gitUrl.trim();
      if (!trimmedUrl) {
        setUrlValidationError('Please enter a Git repository URL.');
        return;
      }

      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'https:') {
          setUrlValidationError('Only HTTPS URLs are supported (e.g. https://github.com/owner/repo).');
          return;
        }
      } catch {
        setUrlValidationError('Invalid URL format. Please enter a valid HTTPS repository link.');
        return;
      }

      onImportGit(trimmedUrl);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="p-4 rounded border border-repolens bg-repolens-surface shadow-sm mx-auto w-100"
      style={{ maxWidth: '820px', borderRadius: 'var(--radius-md)' }}
    >
      {/* Mode Selection Tabs */}
      <div className="d-flex align-items-center justify-content-center gap-2 mb-4 border-bottom border-repolens pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('zip');
            if (onClearError) onClearError();
          }}
          className={`import-tab-btn ${activeTab === 'zip' ? 'active' : ''}`}
        >
          <div className="d-flex align-items-center gap-2">
            <VscFileZip size={18} />
            <span>Upload ZIP Archive</span>
          </div>
          {activeTab === 'zip' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="position-absolute bottom-0 start-0 w-100"
              style={{ height: '2px', backgroundColor: 'var(--color-primary)' }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('git');
            if (onClearError) onClearError();
          }}
          className={`import-tab-btn ${activeTab === 'git' ? 'active' : ''}`}
        >
          <div className="d-flex align-items-center gap-2">
            <VscLink size={18} />
            <span>Git Repository URL</span>
          </div>
          {activeTab === 'git' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="position-absolute bottom-0 start-0 w-100"
              style={{ height: '2px', backgroundColor: 'var(--color-primary)' }}
            />
          )}
        </button>
      </div>

      {/* Global Ingestion Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 mb-4 rounded d-flex align-items-start justify-content-between gap-3"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
          }}
        >
          <div className="small">{error}</div>
          <button
            type="button"
            onClick={onClearError}
            className="btn btn-sm text-secondary p-0 border-0"
            title="Dismiss error"
          >
            <VscClose size={16} />
          </button>
        </motion.div>
      )}

      {/* Ingestion Progress & Stages Feedback */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-4 rounded border border-repolens bg-repolens-bg text-center"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2 text-white">
            <VscLoading className="spin" size={20} style={{ color: 'var(--color-primary)' }} />
            <span className="fw-semibold small">Ingesting Repository Pipeline</span>
          </div>

          <p className="text-repolens-secondary small mb-3">
            {INGESTION_STAGES[processingStage] || INGESTION_STAGES[0]}
          </p>

          {/* Upload Progress Bar if percentage reported */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-100 mb-3" style={{ height: '4px', backgroundColor: 'var(--color-border)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  backgroundColor: 'var(--color-primary)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          )}

          <div className="d-flex justify-content-center gap-2 small text-repolens-secondary">
            <span className="repolens-badge" style={{ fontSize: '0.7rem' }}>
              Safe Extraction Active
            </span>
            <span className="repolens-badge" style={{ fontSize: '0.7rem' }}>
              Zero Execution Guarantee
            </span>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {activeTab === 'zip' ? (
            <motion.div
              key="zip-mode"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Drag and drop upload zone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`dropzone p-5 text-center mb-3 ${isDragOver ? 'active' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    onChange={handleFileChange}
                    className="d-none"
                  />
                  <div
                    className="d-inline-flex p-3 rounded-circle mb-3"
                    style={{
                      backgroundColor: 'rgba(240, 80, 51, 0.1)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <VscCloudUpload size={32} />
                  </div>
                  <h3 className="h6 fw-semibold text-white mb-1">
                    Drop your repository ZIP here, or <span className="text-repolens-primary">browse</span>
                  </h3>
                  <p className="text-repolens-secondary small mb-2">
                    Accepts standard .zip archives up to 25MB. Code is extracted strictly for static analysis.
                  </p>
                  <div className="text-repolens-secondary" style={{ fontSize: '0.75rem' }}>
                    Compressed size limit: 25MB &middot; Maximum 5,000 files
                  </div>
                </div>
              ) : (
                <div
                  className="p-3 mb-3 rounded border border-repolens bg-repolens-bg d-flex align-items-center justify-content-between gap-3"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    <div
                      className="p-2 rounded d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: 'rgba(240, 80, 51, 0.15)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <VscFolder size={22} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-white fw-medium small text-truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-repolens-secondary" style={{ fontSize: '0.75rem' }}>
                        {formatFileSize(selectedFile.size)} &middot; Ready for extraction
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-sm btn-repolens-outline py-1 px-2"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRemoveFile}
                      className="btn btn-sm btn-repolens-outline py-1 px-2 text-danger"
                      style={{ fontSize: '0.8rem' }}
                      title="Remove file"
                    >
                      <VscClose size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleFileChange}
                      className="d-none"
                    />
                  </div>
                </div>
              )}

              {/* Optional Custom Repository Name */}
              {selectedFile && (
                <div className="mb-3">
                  <label htmlFor="repoNameInput" className="form-label text-repolens-secondary small mb-1">
                    Repository Name (optional)
                  </label>
                  <input
                    id="repoNameInput"
                    type="text"
                    value={customRepoName}
                    disabled={isProcessing}
                    onChange={(e) => setCustomRepoName(e.target.value)}
                    placeholder="e.g., my-project"
                    className="form-control bg-repolens-bg text-white border-repolens small"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              )}

              {zipValidationError && (
                <div className="text-danger small mb-3">{zipValidationError}</div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="git-mode"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-3">
                <label htmlFor="gitUrlInput" className="form-label text-white small fw-medium mb-1">
                  Public Git Repository URL
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-repolens-bg border-repolens text-repolens-secondary">
                    <VscLink size={16} />
                  </span>
                  <input
                    id="gitUrlInput"
                    type="url"
                    value={gitUrl}
                    disabled={isProcessing}
                    onChange={handleUrlChange}
                    placeholder="https://github.com/owner/repository"
                    className="form-control bg-repolens-bg text-white border-repolens small"
                    style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                  />
                </div>
                {urlValidationError && (
                  <div className="text-danger small mt-1">{urlValidationError}</div>
                )}
              </div>

              {/* Supported Host Badges & Quick Suggestion */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 small text-repolens-secondary">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '0.75rem' }}>Supported:</span>
                  <span className="code-badge">GitHub</span>
                  <span className="code-badge">GitLab</span>
                  <span className="code-badge">Bitbucket</span>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setGitUrl('https://github.com/expressjs/express')}
                  className="btn btn-link p-0 text-repolens-primary small text-decoration-none"
                  style={{ fontSize: '0.75rem' }}
                >
                  Use sample repo (expressjs/express)
                </button>
              </div>

              <div
                className="p-3 mb-3 rounded bg-repolens-bg border border-repolens d-flex align-items-start gap-2 small"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <VscInfo size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                <span className="text-repolens-secondary" style={{ fontSize: '0.75rem' }}>
                  RepoLens executes a shallow, single-branch fetch with strict SSRF defenses. Private IP
                  addresses, cloud metadata endpoints, and embedded credentials are automatically blocked.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Action Button */}
        <div className="text-end mt-4">
          <motion.button
            type="submit"
            disabled={isProcessing || (activeTab === 'zip' && !selectedFile) || (activeTab === 'git' && !gitUrl.trim())}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-repolens-primary py-2 px-4 w-100"
            style={{ fontSize: '0.95rem' }}
          >
            {isProcessing ? (
              <>
                <VscLoading className="spin" size={16} />
                <span>Processing Ingestion...</span>
              </>
            ) : (
              <>
                <VscCheck size={16} />
                <span>Analyze Repository</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
