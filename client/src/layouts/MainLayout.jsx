import { Toaster } from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MainLayout({ children, backendStatus }) {
  return (
    <div className="d-flex flex-column min-vh-100 bg-repolens-bg">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--color-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'var(--color-surface)',
            },
          },
        }}
      />
      <Header backendStatus={backendStatus} />
      <main className="flex-grow-1 d-flex flex-column">{children}</main>
      <Footer />
    </div>
  );
}
