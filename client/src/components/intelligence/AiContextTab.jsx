import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { VscHubot, VscCopy, VscCheck, VscLoading } from 'react-icons/vsc';
import { getRepositoryAiContext } from '../../services/api';

export default function AiContextTab({ repositoryId }) {
  const [contextData, setContextData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!repositoryId) return;

    let isMounted = true;

    const loadContext = async () => {
      try {
        const response = await getRepositoryAiContext(repositoryId);
        if (isMounted) {
          setContextData(response.data || response);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [repositoryId]);

  const handleCopy = async () => {
    if (!contextData?.summary) return;
    try {
      await navigator.clipboard.writeText(contextData.summary);
      setCopied(true);
      toast.success('AI Context copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy context.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 text-center text-repolens-secondary">
        <VscLoading className="spin mb-2" size={24} style={{ color: 'var(--color-primary)' }} />
        <p className="small mb-0">Building structured AI context from repository evidence...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100 p-4 overflow-hidden">
      <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom border-repolens">
        <div className="d-flex align-items-center gap-2">
          <div
            className="p-2 rounded d-flex align-items-center justify-content-center"
            style={{ backgroundColor: 'rgba(240, 80, 51, 0.1)', color: 'var(--color-primary)' }}
          >
            <VscHubot size={18} />
          </div>
          <div>
            <h2 className="h6 fw-bold text-white mb-0">Gemini Grounded Context Preparation</h2>
            <span className="text-repolens-secondary small">
              High-density structured evidence for evidence-based codebase reasoning in Phase 4.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-sm btn-repolens-outline d-flex align-items-center gap-1"
          style={{ fontSize: '0.75rem' }}
        >
          {copied ? <VscCheck size={14} className="text-success" /> : <VscCopy size={14} />}
          <span>{copied ? 'Copied' : 'Copy AI Prompt Context'}</span>
        </button>
      </div>

      <div
        className="flex-grow-1 p-3 rounded overflow-auto"
        style={{
          backgroundColor: '#09090b',
          border: '1px solid var(--color-border)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.8rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          color: '#e4e4e7',
        }}
      >
        {contextData?.summary || 'No AI context available.'}
      </div>
    </div>
  );
}
