import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000, // 60s timeout for cloning / indexing larger repositories
});

// Response interceptor for consistent error unwrapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data || {
      success: false,
      error: {
        message: error.message || 'Network error occurred while connecting to the server.',
      },
    };
    return Promise.reject(errorResponse);
  }
);

export const checkHealth = async () => {
  return await api.get('/health');
};

/**
 * Repository Ingestion & Inspection APIs
 */
export const uploadRepositoryZip = async (file, customName, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  if (customName) {
    formData.append('name', customName);
  }

  return await api.post('/repositories/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

export const importGitRepository = async (url) => {
  return await api.post('/repositories/import', { url });
};

export const getRepositories = async () => {
  return await api.get('/repositories');
};

export const getRepositoryById = async (id) => {
  return await api.get(`/repositories/${id}`);
};

export const deleteRepository = async (id) => {
  return await api.delete(`/repositories/${id}`);
};

export const getRepositoryTree = async (id) => {
  return await api.get(`/repositories/${id}/tree`);
};

export const getRepositoryFiles = async (id, params = {}) => {
  return await api.get(`/repositories/${id}/files`, { params });
};

export const getRepositoryFileContent = async (id, filePath) => {
  return await api.get(`/repositories/${id}/file`, {
    params: { path: filePath },
  });
};

/**
 * Code Intelligence Analysis APIs (Phase 3)
 */
export const getRepositoryAnalysis = async (id) => {
  return await api.get(`/repositories/${id}/analysis`);
};

export const triggerRepositoryAnalysis = async (id) => {
  return await api.post(`/repositories/${id}/analyze`);
};

export const getRepositorySymbols = async (id, params = {}) => {
  return await api.get(`/repositories/${id}/symbols`, { params });
};

export const getRepositoryDependencies = async (id) => {
  return await api.get(`/repositories/${id}/dependencies`);
};

export const getRepositoryEndpoints = async (id) => {
  return await api.get(`/repositories/${id}/endpoints`);
};

export const getRepositoryDatabaseInteractions = async (id) => {
  return await api.get(`/repositories/${id}/database-interactions`);
};

export const getRepositoryAiContext = async (id) => {
  return await api.get(`/repositories/${id}/context`);
};

/**
 * Gemini Codebase Q&A APIs (Phase 4)
 */
export const askRepositoryQuestion = async (id, question, options = {}) => {
  return await api.post(`/repositories/${id}/ask`, { question }, options);
};

export const getRepositorySuggestedQuestions = async (id) => {
  return await api.get(`/repositories/${id}/suggested-questions`);
};

/**
 * Architecture & Execution Flow Graphs (Phase 5)
 */
export const getRepositoryGraph = async (id, type = 'modules') => {
  return await api.get(`/repositories/${id}/graph`, {
    params: { type },
  });
};

/**
 * Repository Onboarding & Setup Assistant (Phase 6)
 */
export const getRepositoryOnboarding = async (id) => {
  return await api.get(`/repositories/${id}/onboarding`);
};

export const generateRepositoryOnboarding = async (id) => {
  return await api.post(`/repositories/${id}/onboarding/generate`);
};

export const regenerateRepositoryOnboarding = async (id) => {
  return await api.post(`/repositories/${id}/onboarding/regenerate`);
};

/**
 * Predefined FAQ Knowledge Base (Fallback & System Help)
 */
export const getFaqEntries = async () => {
  return await api.get('/repositories/faq');
};

export default api;
