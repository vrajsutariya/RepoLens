import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import { checkHealth } from './services/api';

export default function App() {
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    error: null,
    data: null,
  });

  const handleRetryHealth = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await checkHealth();
      setBackendStatus({
        loading: false,
        error: null,
        data: response.data || response,
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        error: err?.error?.message || err.message || 'Unable to connect to backend',
        data: null,
      });
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadHealth = async () => {
      try {
        const response = await checkHealth();
        if (!isCancelled) {
          setBackendStatus({
            loading: false,
            error: null,
            data: response.data || response,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setBackendStatus({
            loading: false,
            error: err?.error?.message || err.message || 'Unable to connect to backend',
            data: null,
          });
        }
      }
    };

    loadHealth();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <BrowserRouter>
      <MainLayout backendStatus={backendStatus} onRetryHealth={handleRetryHealth}>
        <Routes>
          <Route path="/" element={<Dashboard backendStatus={backendStatus} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
