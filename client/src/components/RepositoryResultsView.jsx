import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import {
  VscRepo,
  VscArrowLeft,
  VscFiles,
  VscDatabase,
  VscLinkExternal,
  VscLayers,
  VscSymbolMethod,
  VscServerProcess,
  VscGitMerge,
  VscHubot,
  VscSparkle,
  VscGraph,
  VscBook,
} from 'react-icons/vsc';
import FileExplorer from './FileExplorer';
import FileViewer from './FileViewer';
import OverviewTab from './intelligence/OverviewTab';
import SymbolsTab from './intelligence/SymbolsTab';
import DependenciesTab from './intelligence/DependenciesTab';
import EndpointsTab from './intelligence/EndpointsTab';
import DatabaseTab from './intelligence/DatabaseTab';
import AiContextTab from './intelligence/AiContextTab';
import AiAssistantTab from './intelligence/AiAssistantTab';
import GraphWorkspace from './visualization/GraphWorkspace';
import OnboardingDashboard from './onboarding/OnboardingDashboard';
import {
  getRepositoryFileContent,
  getRepositoryAnalysis,
  triggerRepositoryAnalysis,
} from '../services/api';

export default function RepositoryResultsView({ repository, onBackToImport }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'files' | 'symbols' | 'dependencies' | 'endpoints' | 'database' | 'context'
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File explorer & code viewer state
  const [selectedFilePath, setSelectedFilePath] = useState(() => {
    if (repository?.fileList && repository.fileList.length > 0) {
      const firstCodeFile =
        repository.fileList.find(
          (f) =>
            !f.isBinary &&
            (f.extension === '.js' ||
              f.extension === '.jsx' ||
              f.extension === '.ts' ||
              f.extension === '.py' ||
              f.extension === '.md')
        ) || repository.fileList[0];
      return firstCodeFile ? firstCodeFile.path : null;
    }
    return null;
  });

  const [activeFileData, setActiveFileData] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [highlightRange, setHighlightRange] = useState(null);
  const [aiQuestionPrompt, setAiQuestionPrompt] = useState(null);

  // 1. Fetch analysis data on mount
  useEffect(() => {
    if (!repository?._id) return;

    let isCurrent = true;

    const loadAnalysis = async () => {
      try {
        const response = await getRepositoryAnalysis(repository._id);
        if (isCurrent) {
          setAnalysis(response.data || response);
        }
      } catch {
        // If analysis doesn't exist yet, trigger it automatically
        try {
          const runRes = await triggerRepositoryAnalysis(repository._id);
          if (isCurrent) {
            setAnalysis(runRes.data || runRes);
          }
        } catch {
          // Analysis failed
        }
      }
    };

    loadAnalysis();

    return () => {
      isCurrent = false;
    };
  }, [repository?._id]);

  // 2. Fetch file content when selectedFilePath changes
  useEffect(() => {
    if (!repository?._id || !selectedFilePath) return;

    let isCurrent = true;

    const loadContent = async () => {
      setIsLoadingFile(true);
      setFileError(null);
      try {
        const response = await getRepositoryFileContent(repository._id, selectedFilePath);
        if (isCurrent) {
          setActiveFileData(response.data || response);
          setIsLoadingFile(false);
        }
      } catch (err) {
        if (isCurrent) {
          setFileError(err?.error?.message || err.message || 'Failed to read file content.');
          setIsLoadingFile(false);
        }
      }
    };

    loadContent();

    return () => {
      isCurrent = false;
    };
  }, [repository?._id, selectedFilePath]);

  // Handle re-running analysis
  const handleRerunAnalysis = async () => {
    if (!repository?._id || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const response = await triggerRepositoryAnalysis(repository._id);
      setAnalysis(response.data || response);
      toast.success('Code Intelligence analysis updated!');
    } catch (err) {
      toast.error(err?.error?.message || 'Failed to analyze repository.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Navigate directly to a file from symbols/endpoints/dependencies or AI citations
  const handleNavigateToFile = (filePath, range = null) => {
    setSelectedFilePath(filePath);
    setHighlightRange(range);
    setActiveTab('files');
  };

  // Open AI Assistant with a contextual component question
  const handleAskAiAboutComponent = (question) => {
    setAiQuestionPrompt(question);
    setActiveTab('assistant');
  };

  // Open Architecture Graph with an optional recommended type
  const handleNavigateToGraph = (type = 'modules') => {
    setActiveTab('graphs');
  };

  const formatTotalSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <VscLayers size={15} /> },
    { id: 'onboarding', label: 'Onboarding Guide', icon: <VscBook size={15} />, highlight: true },
    { id: 'graphs', label: 'Architecture Graphs', icon: <VscGraph size={15} /> },
    { id: 'assistant', label: 'AI Assistant', icon: <VscHubot size={15} /> },
    { id: 'files', label: 'Files', icon: <VscFiles size={15} />, count: repository?.totalFiles },
    { id: 'symbols', label: 'Symbols', icon: <VscSymbolMethod size={15} />, count: analysis?.metrics?.symbolsCount },
    { id: 'dependencies', label: 'Dependencies', icon: <VscGitMerge size={15} />, count: analysis?.metrics?.relationshipsCount },
    { id: 'endpoints', label: 'API Endpoints', icon: <VscServerProcess size={15} />, count: analysis?.metrics?.apiEndpointsCount },
    { id: 'database', label: 'Database', icon: <VscDatabase size={15} />, count: analysis?.metrics?.databaseModelsCount },
    { id: 'context', label: 'AI Context', icon: <VscSparkle size={15} /> },
  ];

  return (
    <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden">
      {/* Top Repository Summary Bar */}
      <div className="p-3 mb-2 rounded border border-repolens bg-repolens-surface d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm flex-shrink-0">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            onClick={onBackToImport}
            className="btn btn-sm btn-repolens-outline py-1 px-2"
            title="Import another repository"
          >
            <VscArrowLeft size={16} />
            <span className="small">New Import</span>
          </button>

          <div className="d-flex align-items-center gap-2">
            <div
              className="p-2 rounded d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.15)',
                color: 'var(--color-primary)',
              }}
            >
              <VscRepo size={20} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h6 fw-bold text-white mb-0">{repository.name}</h1>
                <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>
                  {repository.sourceType === 'git' ? 'Git Remote' : 'ZIP Archive'}
                </span>
                {analysis?.status === 'completed' && (
                  <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.65rem' }}>
                    Analyzed
                  </span>
                )}
              </div>
              {repository.sourceUrl && (
                <a
                  href={repository.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-repolens-secondary small d-flex align-items-center gap-1 text-decoration-none mt-1"
                  style={{ fontSize: '0.75rem' }}
                >
                  <span className="text-truncate" style={{ maxWidth: '300px' }}>
                    {repository.sourceUrl}
                  </span>
                  <VscLinkExternal size={12} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Real Metrics & Languages */}
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 text-repolens-secondary small">
            <VscFiles size={16} style={{ color: 'var(--color-primary)' }} />
            <span>
              <strong className="text-white">{repository.totalFiles}</strong> files
            </span>
            <span>&middot;</span>
            <VscDatabase size={14} />
            <span>{formatTotalSize(repository.totalSize)}</span>
          </div>

          {/* Detected Languages Breakdown */}
          {repository.detectedLanguages && repository.detectedLanguages.length > 0 && (
            <div className="d-flex align-items-center gap-1 flex-wrap">
              {repository.detectedLanguages.slice(0, 4).map((lang) => (
                <span
                  key={lang.language}
                  className="code-badge"
                  style={{ fontSize: '0.7rem' }}
                  title={`${lang.language}: ${lang.count} files (${lang.percentage}%)`}
                >
                  {lang.language} <span className="text-white">{lang.percentage}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Intelligence Workspace Navigation Tabs */}
      <div className="d-flex align-items-center gap-1 border-bottom border-repolens bg-repolens-surface px-2 mb-2 flex-shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn border-0 py-2 px-3 small fw-medium d-flex align-items-center gap-2 position-relative ${
                isActive ? 'text-white' : 'text-repolens-secondary'
              }`}
              style={{
                backgroundColor: 'transparent',
                fontSize: '0.825rem',
                transition: 'color var(--transition-fast)',
              }}
            >
              <span style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className="badge rounded-pill"
                  style={{
                    backgroundColor: isActive ? 'rgba(240, 80, 51, 0.2)' : 'var(--color-border)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: '0.65rem',
                  }}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeWorkspaceTab"
                  className="position-absolute bottom-0 start-0 w-100"
                  style={{ height: '2px', backgroundColor: 'var(--color-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div
        className="flex-grow-1 border border-repolens rounded overflow-hidden position-relative d-flex flex-column"
        style={{
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface)',
          minHeight: '480px',
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <OverviewTab
                analysis={analysis}
                onNavigateToFile={handleNavigateToFile}
                onRerunAnalysis={handleRerunAnalysis}
                isAnalyzing={isAnalyzing}
                onAskAi={() => setActiveTab('assistant')}
                onOpenGraphs={() => setActiveTab('graphs')}
                onOpenOnboarding={() => setActiveTab('onboarding')}
              />
            </motion.div>
          )}

          {activeTab === 'onboarding' && (
            <motion.div
              key="onboarding-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100 w-100 overflow-hidden"
            >
              <OnboardingDashboard
                repository={repository}
                analysis={analysis}
                onNavigateToFile={handleNavigateToFile}
                onNavigateToGraph={handleNavigateToGraph}
                onAskAi={handleAskAiAboutComponent}
              />
            </motion.div>
          )}

          {activeTab === 'graphs' && (
            <motion.div
              key="graphs-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100 w-100"
            >
              <GraphWorkspace
                repositoryId={repository._id}
                onNavigateToFile={handleNavigateToFile}
                onAskAiAboutComponent={handleAskAiAboutComponent}
                analysisStatus={analysis?.status}
              />
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div
              key="assistant-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <AiAssistantTab
                repositoryId={repository._id}
                repositoryName={repository.name}
                analysisStatus={analysis?.status}
                onNavigateToFile={handleNavigateToFile}
                initialQuestion={aiQuestionPrompt}
                onClearInitialQuestion={() => setAiQuestionPrompt(null)}
              />
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="files-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="d-flex h-100 w-100"
            >
              <FileExplorer
                fileTree={repository.fileTree}
                fileList={repository.fileList}
                selectedPath={selectedFilePath}
                onSelectFile={(path) => {
                  setSelectedFilePath(path);
                  setHighlightRange(null);
                }}
              />
              <FileViewer
                fileData={activeFileData}
                isLoading={isLoadingFile}
                error={fileError}
                highlightRange={highlightRange}
                onClearHighlight={() => setHighlightRange(null)}
              />
            </motion.div>
          )}

          {activeTab === 'symbols' && (
            <motion.div
              key="symbols-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <SymbolsTab
                symbols={analysis?.symbols || []}
                onNavigateToFile={handleNavigateToFile}
              />
            </motion.div>
          )}

          {activeTab === 'dependencies' && (
            <motion.div
              key="dependencies-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <DependenciesTab
                dependencies={analysis?.dependencies || {}}
                onNavigateToFile={handleNavigateToFile}
              />
            </motion.div>
          )}

          {activeTab === 'endpoints' && (
            <motion.div
              key="endpoints-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <EndpointsTab
                endpoints={analysis?.apiEndpoints || []}
                onNavigateToFile={handleNavigateToFile}
              />
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div
              key="database-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <DatabaseTab
                databaseInteractions={analysis?.databaseInteractions || []}
                onNavigateToFile={handleNavigateToFile}
              />
            </motion.div>
          )}

          {activeTab === 'context' && (
            <motion.div
              key="context-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-100"
            >
              <AiContextTab repositoryId={repository._id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
