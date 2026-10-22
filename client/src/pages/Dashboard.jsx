import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import RepositoryImportPanel from '../components/RepositoryImportPanel';
import RepositoryResultsView from '../components/RepositoryResultsView';
import {
  getRepositories,
  getRepositoryById,
  uploadRepositoryZip,
  importGitRepository,
} from '../services/api';

export default function Dashboard({ backendStatus }) {
  const [repositories, setRepositories] = useState([]);
  const [activeRepoId, setActiveRepoId] = useState(null);
  const [activeRepository, setActiveRepository] = useState(null);

  // Ingestion execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState(0);
  const [ingestionError, setIngestionError] = useState(null);

  // Fetch repository list on mount
  useEffect(() => {
    let isMounted = true;
    const loadRepos = async () => {
      try {
        const response = await getRepositories();
        if (isMounted) {
          setRepositories(response.data || []);
        }
      } catch {
        // Silently handle if backend is still connecting
      }
    };

    loadRepos();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshRepositories = async () => {
    try {
      const response = await getRepositories();
      setRepositories(response.data || []);
    } catch {
      // Backend error
    }
  };

  // Load a specific repository by ID
  const handleSelectRepository = async (repoId) => {
    setActiveRepoId(repoId);
    setIngestionError(null);
    try {
      const response = await getRepositoryById(repoId);
      setActiveRepository(response.data || response);
    } catch (err) {
      toast.error(err?.error?.message || 'Failed to load repository details.');
    }
  };

  // ZIP Upload workflow
  const handleUploadZip = async (file, customName) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setProcessingStage(0);
    setIngestionError(null);

    // Stage timer simulations for user feedback during ingestion pipeline
    const stageInterval = setInterval(() => {
      setProcessingStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 800);

    try {
      const response = await uploadRepositoryZip(file, customName, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      clearInterval(stageInterval);
      setProcessingStage(4);

      const repo = response.data || response;
      toast.success(`Repository "${repo.name}" ingested successfully!`);

      setActiveRepoId(repo._id);
      setActiveRepository(repo);
      await refreshRepositories();
    } catch (err) {
      clearInterval(stageInterval);
      const errMsg =
        err?.error?.message || err.message || 'Failed to extract and index repository ZIP archive.';
      setIngestionError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  // Git URL Import workflow
  const handleImportGit = async (url) => {
    setIsProcessing(true);
    setProcessingStage(0);
    setIngestionError(null);

    const stageInterval = setInterval(() => {
      setProcessingStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await importGitRepository(url);

      clearInterval(stageInterval);
      setProcessingStage(4);

      const repo = response.data || response;
      toast.success(`Git repository "${repo.name}" imported successfully!`);

      setActiveRepoId(repo._id);
      setActiveRepository(repo);
      await refreshRepositories();
    } catch (err) {
      clearInterval(stageInterval);
      const errMsg =
        err?.error?.message || err.message || 'Failed to clone and index public Git repository.';
      setIngestionError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToImport = () => {
    setActiveRepoId(null);
    setActiveRepository(null);
    setIngestionError(null);
  };

  return (
    <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 65px)' }}>
      {/* Sidebar with Repositories List */}
      <Sidebar
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectRepo={handleSelectRepository}
        onNewIngestion={handleBackToImport}
        backendStatus={backendStatus}
      />

      {/* Main Content Area */}
      <main className="flex-grow-1 p-4 overflow-auto d-flex flex-column">
        {activeRepository ? (
          /* View Ingested Repository */
          <RepositoryResultsView
            repository={activeRepository}
            onBackToImport={handleBackToImport}
          />
        ) : (
          /* Repository Ingestion Dashboard */
          <div className="d-flex flex-column flex-grow-1 justify-content-center">
            <DashboardHeader
              onAnalyzeClick={() => {
                const el = document.getElementById('gitUrlInput') || document.querySelector('.dropzone');
                el?.focus();
              }}
              isAnalyzing={isProcessing}
            />

            <RepositoryImportPanel
              onUploadZip={handleUploadZip}
              onImportGit={handleImportGit}
              isProcessing={isProcessing}
              uploadProgress={uploadProgress}
              processingStage={processingStage}
              error={ingestionError}
              onClearError={() => setIngestionError(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
