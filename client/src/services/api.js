import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
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

export default api;
