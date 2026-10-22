import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  VscHubot,
  VscSend,
  VscLoading,
  VscLightbulb,
  VscInfo,
  VscWarning,
  VscFileCode,
  VscLinkExternal,
  VscSparkle,
  VscTrash,
  VscQuestion,
  VscChevronDown,
  VscChevronUp,
} from 'react-icons/vsc';
import {
  askRepositoryQuestion,
  getRepositorySuggestedQuestions,
} from '../../services/api';

/**
 * AI Assistant Tab — Gemini-Powered Codebase Q&A with Evidence Citations
 */
export default function AiAssistantTab({
  repositoryId,
  repositoryName,
  analysisStatus,
  onNavigateToFile,
  initialQuestion,
  onClearInitialQuestion,
}) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Sync initialQuestion when passed from outside
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      textareaRef.current?.focus();
      if (onClearInitialQuestion) onClearInitialQuestion();
    }
  }, [initialQuestion, onClearInitialQuestion]);

  // Conversation history in current session
  const [history, setHistory] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askingStage, setAskingStage] = useState(0); // 0: intent, 1: retrieval, 2: synthesis
  const [expandedEvidence, setExpandedEvidence] = useState({}); // { [evId]: boolean }

  const historyEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Clean up any pending in-flight request when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 1. Fetch dynamic suggested questions on mount
  useEffect(() => {
    if (!repositoryId) return;

    let isCurrent = true;
    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const response = await getRepositorySuggestedQuestions(repositoryId);
        if (isCurrent) {
          setSuggestedQuestions(response.data || []);
        }
      } catch {
        // Fallback default suggestions
        if (isCurrent) {
          setSuggestedQuestions([
            'How many files and what is the project structure of this repository?',
            'Which major technologies and frameworks are used in this codebase?',
            'What is the starting point or main entry point of this project?',
            'What package dependencies does this project rely on?',
            'What API routes or endpoints are defined in this repository?',
          ]);
        }
      } finally {
        if (isCurrent) setLoadingSuggestions(false);
      }
    };

    loadSuggestions();

    return () => {
      isCurrent = false;
    };
  }, [repositoryId]);

  // Auto-scroll to latest response
  useEffect(() => {
    if (history.length > 0) {
      historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isAsking]);

  // Toggle evidence snippet expansion
  const toggleEvidence = (evId) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [evId]: !prev[evId],
    }));
  };

  const handleCancelQuestion = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAsking(false);
    toast('Question cancelled by user.', { icon: '⏹️' });
  };

  // Submit Question Handler
  const handleSubmitQuestion = async (questionText = question) => {
    const q = (questionText || '').trim();
    if (!q || isAsking) return;

    if (q.length < 3) {
      toast.error('Question must be at least 3 characters long.');
      return;
    }

    if (q.length > 500) {
      toast.error('Question exceeds 500 characters limit.');
      return;
    }

    setIsAsking(true);
    setAskingStage(0);
    setQuestion('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Stage timer simulations for clear progress feedback
    const timer1 = setTimeout(() => setAskingStage(1), 600);
    const timer2 = setTimeout(() => setAskingStage(2), 1500);

    try {
      const response = await askRepositoryQuestion(repositoryId, q, {
        signal: abortController.signal,
      });
      const data = response.data || response;

      // Automatically expand top evidence items by default
      const initialExpanded = {};
      if (data?.evidence) {
        data.evidence.forEach((ev, idx) => {
          if (idx < 2) initialExpanded[ev.id] = true;
        });
      }
      setExpandedEvidence((prev) => ({ ...prev, ...initialExpanded }));

      setHistory((prev) => [
        ...prev,
        {
          id: `qa_${Date.now()}`,
          question: q,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          answerData: data,
          error: null,
        },
      ]);
    } catch (err) {
      const isCanceled =
        err?.name === 'CanceledError' ||
        err?.code === 'ERR_CANCELED' ||
        err?.message?.includes('canceled') ||
        err?.message?.includes('aborted');

      if (isCanceled) {
        setHistory((prev) => [
          ...prev,
          {
            id: `qa_${Date.now()}`,
            question: q,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            answerData: null,
            error: 'Question request was stopped by user.',
            statusCode: 499,
          },
        ]);
      } else {
        const errorMessage =
          err?.error?.message || err?.message || 'Failed to generate answer from repository evidence.';

        setHistory((prev) => [
          ...prev,
          {
            id: `qa_${Date.now()}`,
            question: q,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            answerData: null,
            error: errorMessage,
            statusCode: err?.error?.status || 500,
            suggestedFaqs: err?.error?.suggestedFaqs || [],
          },
        ]);

        toast.error(errorMessage);
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      abortControllerRef.current = null;
      setIsAsking(false);
      setAskingStage(0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion();
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast.success('Conversation history cleared.');
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden bg-repolens-bg">
      {/* Top Assistant Status Header */}
      <div className="p-3 border-bottom border-repolens bg-repolens-surface d-flex flex-wrap align-items-center justify-content-between gap-3 flex-shrink-0">
        <div className="d-flex align-items-center gap-2">
          <div
            className="p-2 rounded d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: 'rgba(240, 80, 51, 0.15)',
              color: 'var(--color-primary)',
            }}
          >
            <VscHubot size={18} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h2 className="h6 fw-bold text-white mb-0">Gemini Codebase Assistant</h2>
              <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>
                Evidence-Grounded RAG
              </span>
              {analysisStatus && analysisStatus !== 'completed' && (
                <span className="badge bg-warning-subtle text-warning border border-warning-subtle" style={{ fontSize: '0.65rem' }}>
                  Analysis: {analysisStatus}
                </span>
              )}
            </div>
            <p className="text-repolens-secondary small mb-0" style={{ fontSize: '0.75rem' }}>
              Ask architectural questions verified against actual repository files and static code intelligence.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
            style={{ fontSize: '0.75rem' }}
            title="Clear current session Q&A history"
          >
            <VscTrash size={13} />
            <span>Clear Session</span>
          </button>
        )}
      </div>

      {/* Main Q&A Feed Area */}
      <div className="flex-grow-1 overflow-auto p-3 p-md-4 d-flex flex-column gap-4">
        {/* Empty State / Prompt Suggestions */}
        {history.length === 0 && !isAsking && (
          <div className="my-auto d-flex flex-column align-items-center justify-content-center text-center p-3">
            <div
              className="p-3 mb-3 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.1)',
                border: '1px solid rgba(240, 80, 51, 0.3)',
                color: 'var(--color-primary)',
              }}
            >
              <VscSparkle size={32} />
            </div>
            <h5 className="text-white fw-semibold mb-2">
              Ask Any Question About <span className="text-primary">{repositoryName || 'This Repository'}</span>
            </h5>
            <p className="text-repolens-secondary small mb-4" style={{ maxWidth: '480px' }}>
              Answers are grounded strictly in indexed AST symbols, route handlers, database schemas, and actual source code excerpts.
            </p>

            {/* Quick Repository Evidence-Grounded Questions */}
            <div className="w-100 mb-3" style={{ maxWidth: '640px' }}>
              <div className="text-start mb-2">
                <span className="text-white small fw-semibold d-flex align-items-center gap-1">
                  <VscLightbulb size={14} style={{ color: 'var(--color-primary)' }} />
                  <span>Quick Repository Questions (Extracted Evidence):</span>
                </span>
                <span className="text-repolens-secondary small d-block" style={{ fontSize: '0.725rem' }}>
                  Instant answers derived from static file indexing, AST symbols, and manifest metadata.
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                {[
                  {
                    q: 'How many files and what is the project structure of this repository?',
                    label: 'How many files & project structure?',
                    tag: 'Overview',
                  },
                  {
                    q: 'Which major technologies and frameworks are used in this codebase?',
                    label: 'Which major technologies & frameworks are used?',
                    tag: 'Tech Stack',
                  },
                  {
                    q: 'What is the starting point or main entry point of this project?',
                    label: 'What is the starting point / main entry point?',
                    tag: 'Entry Point',
                  },
                  {
                    q: 'What package dependencies does this project rely on?',
                    label: 'What package dependencies are declared?',
                    tag: 'Dependencies',
                  },
                  {
                    q: 'What API routes or endpoints are defined in this repository?',
                    label: 'What API routes & endpoints are defined?',
                    tag: 'Endpoints',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmitQuestion(item.q)}
                    className="btn btn-sm text-start py-2 px-3 rounded border border-repolens d-flex align-items-center justify-content-between gap-2"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.82rem',
                      transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 text-truncate">
                      <VscQuestion size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <span className="text-truncate fw-medium">{item.label}</span>
                    </div>
                    <span
                      className="badge flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(240, 80, 51, 0.12)',
                        color: 'var(--color-primary)',
                        fontSize: '0.65rem',
                      }}
                    >
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Suggested Architectural Questions */}
            {suggestedQuestions.filter((sq) => !sq.includes('How many files') && !sq.includes('Which major technologies')).length > 0 && (
              <div className="w-100" style={{ maxWidth: '640px' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-repolens-secondary small fw-medium d-block text-start">
                    Additional architectural prompts:
                  </span>
                  {loadingSuggestions && (
                    <span className="text-repolens-secondary small d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                      <VscLoading className="spin" size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>Loading...</span>
                    </span>
                  )}
                </div>
                <div className="d-flex flex-column gap-2">
                  {suggestedQuestions
                    .filter((sq) => !sq.includes('How many files') && !sq.includes('Which major technologies'))
                    .map((sq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSubmitQuestion(sq)}
                        className="btn btn-sm text-start py-2 px-3 rounded border border-repolens d-flex align-items-center justify-content-between gap-2"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                      >
                        <span className="text-truncate">{sq}</span>
                        <span className="text-repolens-secondary small flex-shrink-0">&rarr;</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Offline Platform FAQ Chips */}
            <div className="w-100 mt-3 pt-3 border-top border-repolens text-start" style={{ maxWidth: '640px' }}>
              <span className="text-repolens-secondary small fw-medium d-block mb-2" style={{ fontSize: '0.75rem' }}>
                RepoLens platform guide & FAQs (Offline ready):
              </span>
              <div className="d-flex flex-wrap gap-2">
                {[
                  'What is RepoLens?',
                  'How does repository analysis work?',
                  "Does RepoLens execute the uploaded repository's code?",
                  'How do I explore file dependencies?',
                  'How do I delete a repository?',
                ].map((faqQ, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmitQuestion(faqQ)}
                    className="btn btn-sm text-start py-1 px-2 rounded border border-repolens d-flex align-items-center gap-1"
                    style={{
                      backgroundColor: 'rgba(23, 23, 25, 0.7)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.725rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <VscQuestion size={13} style={{ color: '#f59e0b' }} />
                    <span>{faqQ}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation Q&A Cards */}
        {history.map((item) => (
          <div key={item.id} className="d-flex flex-column gap-3">
            {/* User Question Bubble */}
            <div className="d-flex align-items-start gap-2 align-self-end" style={{ maxWidth: '85%' }}>
              <div
                className="p-3 rounded shadow-sm"
                style={{
                  backgroundColor: 'rgba(240, 80, 51, 0.12)',
                  border: '1px solid rgba(240, 80, 51, 0.3)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 2px var(--radius-md)',
                }}
              >
                <div className="d-flex align-items-center justify-content-between gap-3 mb-1">
                  <span className="fw-semibold text-white small">You</span>
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
                    {item.timestamp}
                  </span>
                </div>
                <div className="text-white small" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {item.question}
                </div>
              </div>
            </div>

            {/* Error State */}
            {item.error && (
              <div
                className="p-3 rounded border border-danger-subtle bg-repolens-surface d-flex flex-column gap-2"
                style={{ borderRadius: 'var(--radius-md)', maxWidth: '90%' }}
              >
                <div className="d-flex align-items-center gap-2 text-danger small fw-semibold">
                  <VscWarning size={16} />
                  <span>Unable to Answer Question</span>
                </div>
                <p className="text-repolens-secondary small mb-0">{item.error}</p>
                {item.statusCode === 503 && (
                  <div
                    className="p-2 mt-1 rounded small"
                    style={{ backgroundColor: '#09090b', border: '1px solid var(--color-border)' }}
                  >
                    <code className="text-warning">
                      Tip: Set GEMINI_API_KEY=your_key_here in server/.env to enable dynamic AI codebase answers.
                    </code>
                  </div>
                )}

                {item.suggestedFaqs && item.suggestedFaqs.length > 0 && (
                  <div className="mt-2 pt-2 border-top border-repolens">
                    <span className="text-repolens-secondary small d-block mb-1" style={{ fontSize: '0.75rem' }}>
                      Suggested FAQ Topics (Available Offline):
                    </span>
                    <div className="d-flex flex-wrap gap-1">
                      {item.suggestedFaqs.map((faq) => (
                        <button
                          key={faq.id}
                          type="button"
                          onClick={() => handleSubmitQuestion(faq.question)}
                          className="btn btn-sm btn-repolens-outline py-1 px-2 text-start d-flex align-items-center gap-1"
                          style={{ fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <VscQuestion size={12} style={{ color: 'var(--color-primary)' }} />
                          <span>{faq.question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assistant Answer Box */}
            {item.answerData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded border border-repolens bg-repolens-surface d-flex flex-column gap-3 shadow-sm"
                style={{ borderRadius: 'var(--radius-md)', maxWidth: '95%' }}
              >
                {/* Header with Assistant Tag */}
                <div className="d-flex align-items-center justify-content-between pb-2 border-bottom border-repolens">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="p-1 rounded d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: item.answerData.isFaqFallback
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(240, 80, 51, 0.15)',
                        color: item.answerData.isFaqFallback ? '#f59e0b' : 'var(--color-primary)',
                      }}
                    >
                      {item.answerData.isFaqFallback ? <VscQuestion size={15} /> : <VscHubot size={15} />}
                    </div>
                    <span className="fw-semibold text-white small">
                      {item.answerData.isFaqFallback ? 'RepoLens FAQ' : 'RepoLens AI'}
                    </span>
                    {item.answerData.isFaqFallback ? (
                      <span
                        className="badge rounded-pill d-flex align-items-center gap-1"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          fontSize: '0.65rem',
                        }}
                      >
                        <VscQuestion size={11} />
                        <span>FAQ Answer &middot; Offline Help</span>
                      </span>
                    ) : (
                      <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>
                        Verified Grounding
                      </span>
                    )}
                    {item.answerData.faqCategory && (
                      <span className="code-badge" style={{ fontSize: '0.65rem' }}>
                        {item.answerData.faqCategory}
                      </span>
                    )}
                  </div>
                  <span className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
                    {item.timestamp}
                  </span>
                </div>

                {/* Executive Summary Callout */}
                {item.answerData.summary && (
                  <div
                    className="p-3 rounded d-flex align-items-start gap-2"
                    style={{
                      backgroundColor: 'rgba(240, 80, 51, 0.08)',
                      borderLeft: '3px solid var(--color-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <VscLightbulb
                      size={18}
                      style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div>
                      <span className="fw-semibold text-white small d-block mb-1">Executive Summary</span>
                      <p className="text-repolens-secondary small mb-0" style={{ lineHeight: '1.5' }}>
                        {item.answerData.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Markdown Formatted Answer */}
                <div
                  className="text-white small"
                  style={{
                    lineHeight: '1.6',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {item.answerData.answer}
                </div>

                {/* Verified Claims Breakdown */}
                {item.answerData.claims && item.answerData.claims.length > 0 && (
                  <div className="mt-2 pt-3 border-top border-repolens">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-white small fw-semibold">Grounded Claims & Observations:</span>
                      <span className="text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
                        {item.answerData.claims.length} claims evaluated
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {item.answerData.claims.map((claim, cIdx) => {
                        const isVerifiedFact = claim.type === 'source_fact';
                        return (
                          <div
                            key={cIdx}
                            className="p-2 rounded border border-repolens d-flex flex-wrap align-items-center justify-content-between gap-2"
                            style={{
                              backgroundColor: '#09090b',
                              fontSize: '0.78rem',
                            }}
                          >
                            <div className="d-flex align-items-start gap-2">
                              {isVerifiedFact ? (
                                <span
                                  className="badge bg-success-subtle text-success border border-success-subtle flex-shrink-0"
                                  style={{ fontSize: '0.65rem', marginTop: '2px' }}
                                >
                                  Verified Fact
                                </span>
                              ) : (
                                <span
                                  className="badge bg-primary-subtle text-primary border border-primary-subtle flex-shrink-0"
                                  style={{ fontSize: '0.65rem', marginTop: '2px' }}
                                >
                                  Inference
                                </span>
                              )}
                              <span className="text-repolens-secondary">{claim.text}</span>
                            </div>

                            {/* Cited Evidence Badges */}
                            {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                              <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                {claim.evidenceIds.map((evId) => (
                                  <a
                                    key={evId}
                                    href={`#evidence-${evId}`}
                                    className="badge text-decoration-none"
                                    style={{
                                      backgroundColor: 'rgba(240, 80, 51, 0.15)',
                                      color: 'var(--color-primary)',
                                      border: '1px solid rgba(240, 80, 51, 0.3)',
                                      fontSize: '0.65rem',
                                    }}
                                  >
                                    [{evId}]
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inspectable Evidence Cards */}
                {item.answerData.evidence && item.answerData.evidence.length > 0 && (
                  <div className="mt-2 pt-3 border-top border-repolens">
                    <span className="text-white small fw-semibold d-block mb-2">
                      Source Code Evidence ({item.answerData.evidence.length} citations):
                    </span>

                    <div className="d-flex flex-column gap-2">
                      {item.answerData.evidence.map((ev) => {
                        const isExpanded = Boolean(expandedEvidence[ev.id]);

                        return (
                          <div
                            key={ev.id}
                            id={`evidence-${ev.id}`}
                            className="rounded border border-repolens overflow-hidden"
                            style={{ backgroundColor: '#09090b' }}
                          >
                            {/* Evidence Card Header */}
                            <div className="p-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom border-repolens">
                              <div className="d-flex align-items-center gap-2 overflow-hidden">
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: 'rgba(240, 80, 51, 0.2)',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.65rem',
                                  }}
                                >
                                  {ev.id}
                                </span>
                                <span
                                  className="text-white small fw-medium text-truncate"
                                  title={ev.filePath}
                                  style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                                >
                                  {ev.filePath}
                                </span>
                                <span className="repolens-badge" style={{ fontSize: '0.65rem' }}>
                                  Lines {ev.startLine}&ndash;{ev.endLine}
                                </span>
                                {ev.evidenceType && (
                                  <span className="code-badge" style={{ fontSize: '0.65rem' }}>
                                    {ev.evidenceType}
                                  </span>
                                )}
                              </div>

                              <div className="d-flex align-items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigateToFile(ev.filePath, {
                                      startLine: ev.startLine,
                                      endLine: ev.endLine,
                                    })
                                  }
                                  className="btn btn-sm btn-repolens-outline py-0 px-2 d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.7rem', height: '24px' }}
                                  title="Open file and highlight this code citation in File Viewer"
                                >
                                  <VscLinkExternal size={11} />
                                  <span>View in Code</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleEvidence(ev.id)}
                                  className="btn btn-sm text-repolens-secondary p-0 border-0"
                                  title={isExpanded ? 'Collapse snippet' : 'Expand snippet'}
                                >
                                  {isExpanded ? <VscChevronUp size={15} /> : <VscChevronDown size={15} />}
                                </button>
                              </div>
                            </div>

                            {/* Snippet Preview */}
                            {isExpanded && (
                              <div className="p-3 overflow-auto" style={{ maxHeight: '240px' }}>
                                <pre
                                  className="m-0"
                                  style={{
                                    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                    fontSize: '0.75rem',
                                    lineHeight: '1.5',
                                    color: '#d4d4d8',
                                  }}
                                >
                                  <code>{ev.snippet}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Architectural Inferences and Limitations */}
                {((item.answerData.inferences && item.answerData.inferences.length > 0) ||
                  (item.answerData.limitations && item.answerData.limitations.length > 0)) && (
                  <div className="mt-2 pt-3 border-top border-repolens d-flex flex-column gap-2">
                    {item.answerData.inferences && item.answerData.inferences.length > 0 && (
                      <div className="d-flex align-items-start gap-2 small text-repolens-secondary">
                        <VscInfo size={14} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong className="text-white">Inferences: </strong>
                          {item.answerData.inferences.join('; ')}
                        </div>
                      </div>
                    )}

                    {item.answerData.limitations && item.answerData.limitations.length > 0 && (
                      <div className="d-flex align-items-start gap-2 small text-repolens-secondary">
                        <VscWarning size={14} className="text-warning" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong className="text-white">Static Analysis Limitations: </strong>
                          {item.answerData.limitations.join('; ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Files for Inspection */}
                {item.answerData.suggestedFiles && item.answerData.suggestedFiles.length > 0 && (
                  <div className="mt-2 pt-2 border-top border-repolens d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                      Suggested files to inspect:
                    </span>
                    {item.answerData.suggestedFiles.map((f, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => onNavigateToFile(f)}
                        className="btn btn-sm btn-repolens-outline py-0 px-2 d-flex align-items-center gap-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        <VscFileCode size={12} style={{ color: 'var(--color-primary)' }} />
                        <span>{f}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}

        {/* In-Flight Processing Indicator */}
        {isAsking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded border border-repolens bg-repolens-surface d-flex align-items-center justify-content-between gap-3 shadow-sm align-self-start"
            style={{ borderRadius: 'var(--radius-md)', maxWidth: '480px', width: '100%' }}
          >
            <div className="d-flex align-items-center gap-3 overflow-hidden">
              <VscLoading className="spin" size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div className="d-flex flex-column text-truncate">
                <span className="text-white small fw-medium text-truncate">
                  {askingStage === 0 && 'Analyzing question intent & extracting keywords...'}
                  {askingStage === 1 && 'Retrieving grounded code evidence & symbols...'}
                  {askingStage === 2 && 'Synthesizing evidence-based answer with Gemini...'}
                </span>
                <span className="text-repolens-secondary text-truncate" style={{ fontSize: '0.7rem' }}>
                  Verifying source line citations against repository files
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelQuestion}
              className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1 text-danger flex-shrink-0"
              style={{ fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              title="Stop generating answer"
            >
              <span>Stop</span>
            </button>
          </motion.div>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* Bottom Question Input Bar */}
      <div className="p-3 border-top border-repolens bg-repolens-surface flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitQuestion();
          }}
          className="d-flex flex-column gap-2"
        >
          <div className="position-relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAsking}
              placeholder="Ask a question about this repository (e.g., 'Where is authentication handled?', 'How is user registration processed?')..."
              className="form-control text-white"
              style={{
                backgroundColor: '#09090b',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                resize: 'none',
                paddingRight: '48px',
                lineHeight: '1.4',
              }}
            />

            {isAsking ? (
              <button
                type="button"
                onClick={handleCancelQuestion}
                className="btn position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  right: '10px',
                  bottom: '10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                }}
                title="Stop generating answer"
              >
                <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="btn btn-repolens-primary position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  right: '10px',
                  bottom: '10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  opacity: !question.trim() ? 0.5 : 1,
                }}
                title="Submit question (Enter)"
              >
                <VscSend size={16} />
              </button>
            )}
          </div>

          <div className="d-flex align-items-center justify-content-between px-1">
            <span className="text-repolens-secondary" style={{ fontSize: '0.7rem' }}>
              Press <kbd style={{ backgroundColor: '#27272a', color: '#fff', fontSize: '0.65rem' }}>Enter</kbd> to submit, <kbd style={{ backgroundColor: '#27272a', color: '#fff', fontSize: '0.65rem' }}>Shift+Enter</kbd> for newline
            </span>
            <span
              className={`small ${question.length > 500 ? 'text-danger' : 'text-repolens-secondary'}`}
              style={{ fontSize: '0.7rem' }}
            >
              {question.length} / 500
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
