import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import RepositoryImportPanel from '../components/RepositoryImportPanel';
import RepositoryResultsView from '../components/RepositoryResultsView';
import DeleteRepositoryModal from '../components/DeleteRepositoryModal';
import {
  getRepositories,
  getRepositoryById,
  uploadRepositoryZip,
  importGitRepository,
  deleteRepository,
  deleteAllRepositories,
  clearBrowserRepoStorage,
} from '../services/api';

export default function Dashboard({ backendStatus }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const repoParam = searchParams.get('repo');

  const [repositories, setRepositories] = useState([]);
  const [activeRepoId, setActiveRepoId] = useState(null);
  const [activeRepository, setActiveRepository] = useState(null);

  // Ingestion execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState(0);
  const [ingestionError, setIngestionError] = useState(null);

  // Deletion modal state
  const [repoToDelete, setRepoToDelete] = useState(null);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Load a specific repository by ID
  const handleSelectRepository = useCallback(async (repoId) => {
    setActiveRepoId(repoId);
    setIngestionError(null);
    setSearchParams({ repo: repoId }, { replace: true });
    try {
      const response = await getRepositoryById(repoId);
      setActiveRepository(response.data || response);
    } catch (err) {
      toast.error(err?.error?.message || 'Failed to load repository details.');
    }
  }, [setSearchParams]);

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

  // Restore active repository from URL parameter on mount/refresh
  useEffect(() => {
    if (!repoParam || repoParam === activeRepoId) return;

    let isMounted = true;
    const fetchRepo = async () => {
      try {
        const response = await getRepositoryById(repoParam);
        if (isMounted) {
          setActiveRepoId(repoParam);
          setActiveRepository(response.data || response);
        }
      } catch (err) {
        if (isMounted) {
          toast.error(err?.error?.message || 'Failed to load repository details.');
        }
      }
    };

    fetchRepo();

    return () => {
      isMounted = false;
    };
  }, [repoParam, activeRepoId]);

  const refreshRepositories = async () => {
    try {
      const response = await getRepositories();
      setRepositories(response.data || []);
    } catch {
      // Backend error
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
      setSearchParams({ repo: repo._id }, { replace: true });
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
      setSearchParams({ repo: repo._id }, { replace: true });
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
    setSearchParams({}, { replace: true });
  };

  // Permanently delete single repository workflow (Hard Delete)
  const handleConfirmDelete = async () => {
    if (!repoToDelete || isDeletingRepo) return;
    setIsDeletingRepo(true);
    try {
      await deleteRepository(repoToDelete._id);
      clearBrowserRepoStorage(repoToDelete._id);
      toast.success(`Repository "${repoToDelete.name}" permanently deleted.`);

      // If the currently viewed repository was deleted, navigate back to import view
      if (activeRepoId === repoToDelete._id) {
        setActiveRepoId(null);
        setActiveRepository(null);
        setSearchParams({}, { replace: true });
      }

      // Re-fetch repositories directly from backend to ensure UI stays perfectly in sync with DB and disk
      await refreshRepositories();
      setRepoToDelete(null);
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Failed to delete repository.';
      toast.error(msg);
    } finally {
      setIsDeletingRepo(false);
    }
  };

  // Permanently delete ALL repositories workflow (Hard Delete All)
  const handleConfirmDeleteAll = async () => {
    if (isDeletingAll) return;
    setIsDeletingAll(true);
    try {
      await deleteAllRepositories();
      clearBrowserRepoStorage(null);
      toast.success('All repositories permanently deleted from disk and database.');

      setActiveRepoId(null);
      setActiveRepository(null);
      setRepositories([]);
      setSearchParams({}, { replace: true });
      setIsDeleteAllOpen(false);
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Failed to delete all repositories.';
      toast.error(msg);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="d-flex flex-grow-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 65px)' }}>
      {/* Sidebar with Repositories List */}
      <Sidebar
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectRepo={handleSelectRepository}
        onNewIngestion={handleBackToImport}
        onRequestDelete={(repo) => setRepoToDelete(repo)}
        onRequestDeleteAll={() => setIsDeleteAllOpen(true)}
        backendStatus={backendStatus}
      />

      {/* Main Content Area */}
      <main className="flex-grow-1 p-4 overflow-auto d-flex flex-column">
        {activeRepository ? (
          /* View Ingested Repository */
          <RepositoryResultsView
            repository={activeRepository}
            onBackToImport={handleBackToImport}
            onRequestDelete={(repo) => setRepoToDelete(repo)}
          />
        ) : (
          /* Repository Ingestion Dashboard */
          <div className="d-flex flex-column justify-content-center">
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

      {/* Accessible Repository Deletion Confirmation Modal (Single Repo) */}
      <DeleteRepositoryModal
        isOpen={Boolean(repoToDelete)}
        isAll={false}
        repository={repoToDelete}
        isDeleting={isDeletingRepo}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeletingRepo) {
            setRepoToDelete(null);
          }
        }}
      />

      {/* Accessible Bulk Repository Deletion Confirmation Modal (All Repos) */}
      <DeleteRepositoryModal
        isOpen={isDeleteAllOpen}
        isAll={true}
        repositoryCount={repositories.length}
        isDeleting={isDeletingAll}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => {
          if (!isDeletingAll) {
            setIsDeleteAllOpen(false);
          }
        }}
      />
    </div>
  );
}
