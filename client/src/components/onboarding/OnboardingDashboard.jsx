import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import {
  VscBook,
  VscSparkle,
  VscTerminal,
  VscChecklist,
  VscServerProcess,
  VscLayers,
  VscRefresh,
  VscWarning,
  VscGraph,
  VscHubot,
  VscFiles,
  VscLinkExternal,
  VscShield,
  VscInfo,
  VscCheck,
} from 'react-icons/vsc';
import OnboardingSection from './OnboardingSection';
import SetupCommand from './SetupCommand';
import EnvironmentVariableList from './EnvironmentVariableList';
import RecommendedFileList from './RecommendedFileList';
import EvidenceCitation from './EvidenceCitation';
import OnboardingEmptyState from './OnboardingEmptyState';
import {
  getRepositoryOnboarding,
  generateRepositoryOnboarding,
  regenerateRepositoryOnboarding,
} from '../../services/api';

export default function OnboardingDashboard({
  repository,
  analysis,
  onNavigateToFile = null,
  onNavigateToGraph = null,
  onAskAi = null,
}) {
  const [guide, setGuide] = useState(null);
  const [hasGuide, setHasGuide] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Load existing onboarding guide on mount or repository change
  useEffect(() => {
    if (!repository?._id) return;

    let isCurrent = true;

    const fetchGuide = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getRepositoryOnboarding(repository._id);
        const data = response.data?.data || response.data || response;
        if (isCurrent) {
          if (data && data.hasGuide && data.guide) {
            setGuide(data.guide);
            setHasGuide(true);
            setIsStale(Boolean(data.isStale));
          } else {
            setGuide(null);
            setHasGuide(false);
            setIsStale(false);
          }
        }
      } catch (err) {
        if (isCurrent) {
          setGuide(null);
          setHasGuide(false);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    fetchGuide();

    return () => {
      isCurrent = false;
    };
  }, [repository?._id]);

  const handleGenerate = async () => {
    if (!repository?._id || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateRepositoryOnboarding(repository._id);
      const newGuide = response.data?.data || response.data || response;
      setGuide(newGuide);
      setHasGuide(true);
      setIsStale(false);
      toast.success('Repository onboarding guide generated successfully!');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to generate onboarding guide.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!repository?._id || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await regenerateRepositoryOnboarding(repository._id);
      const newGuide = response.data?.data || response.data || response;
      setGuide(newGuide);
      setHasGuide(true);
      setIsStale(false);
      toast.success('Onboarding guide regenerated with latest analysis!');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to regenerate onboarding guide.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-5 text-repolens-secondary">
        <div className="spinner-border text-primary mb-3" role="status" style={{ color: 'var(--color-primary)' }}>
          <span className="visually-hidden">Loading Onboarding Guide...</span>
        </div>
        <p className="small mb-0">Checking repository onboarding status...</p>
      </div>
    );
  }

  if (!hasGuide || !guide) {
    return (
      <div className="p-3">
        <OnboardingEmptyState
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          error={error}
        />
      </div>
    );
  }

  const {
    overview = {},
    architecture = {},
    setup = {},
    environment = {},
    readingOrder = [],
    requestFlow = {},
    testingAndTroubleshooting = {},
    evidence = [],
    metadata = {},
  } = guide;

  return (
    <div className="d-flex flex-column gap-3 p-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
      {/* Stale Guide Notice */}
      {isStale && (
        <div
          className="p-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            color: 'var(--color-warning)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <VscWarning size={18} className="flex-shrink-0" />
            <span className="small">
              <strong>Outdated Guide:</strong> The repository was re-analyzed after this guide was generated.
              Regenerate to refresh with latest code intelligence.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="btn btn-sm py-1 px-3 d-flex align-items-center gap-1 shadow-sm"
            style={{
              backgroundColor: 'var(--color-warning)',
              color: '#0D0D0F',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {isGenerating ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <VscRefresh size={14} />
            )}
            <span>Regenerate Guide</span>
          </button>
        </div>
      )}

      {/* Top Project Overview Hero Card */}
      <div
        className="p-4 rounded border shadow-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                className="p-1 rounded d-flex align-items-center justify-content-center"
                style={{
                  backgroundColor: 'rgba(240, 80, 51, 0.15)',
                  color: 'var(--color-primary)',
                }}
              >
                <VscBook size={18} />
              </span>
              <h2 className="h5 fw-bold text-white mb-0">{repository.name} — Onboarding Guide</h2>
            </div>
            <p className="text-repolens-secondary small mb-0" style={{ maxWidth: '780px', lineHeight: 1.5 }}>
              {overview.purpose || 'Comprehensive developer onboarding guide.'}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="btn btn-sm btn-repolens-outline py-1 px-2 d-flex align-items-center gap-1"
              style={{ fontSize: '0.75rem' }}
              title="Regenerate guide with fresh analysis"
            >
              {isGenerating ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <VscRefresh size={13} />
              )}
              <span>Regenerate</span>
            </button>

            {onNavigateToGraph && (
              <button
                type="button"
                onClick={() => onNavigateToGraph(architecture.recommendedGraph || 'api-flow')}
                className="btn btn-sm py-1 px-2 d-flex align-items-center gap-1 text-white"
                style={{
                  backgroundColor: 'rgba(240, 80, 51, 0.2)',
                  borderColor: 'var(--color-primary)',
                  fontSize: '0.75rem',
                }}
                title="Open interactive Architecture Graphs"
              >
                <VscGraph size={14} style={{ color: 'var(--color-primary)' }} />
                <span>View Architecture Graph</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        {overview.features && overview.features.length > 0 && (
          <div className="mb-3">
            <span className="text-repolens-secondary small fw-semibold d-block mb-1" style={{ fontSize: '0.75rem' }}>
              Discovered Features & Responsibilities:
            </span>
            <div className="d-flex flex-wrap gap-2">
              {overview.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="p-1 px-2 rounded small text-white d-flex align-items-center gap-1"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.75rem',
                  }}
                >
                  <VscCheck size={12} style={{ color: 'var(--color-success)' }} />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack Badges */}
        {overview.technologies && overview.technologies.length > 0 && (
          <div className="d-flex flex-wrap align-items-center gap-2 pt-2 border-top" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
              Tech Stack:
            </span>
            {overview.technologies.map((t, idx) => (
              <span
                key={idx}
                className="code-badge"
                style={{ fontSize: '0.7rem' }}
                title={`${t.name} (${t.category}) — ${t.purpose || t.confidence}`}
              >
                <strong className="text-white">{t.name}</strong>
                {t.version && <span className="ms-1 text-repolens-secondary">v{t.version}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Missing Info Callout if applicable */}
        {overview.missingInfo && overview.missingInfo.length > 0 && (
          <div
            className="mt-3 p-2 rounded d-flex align-items-center gap-2 small"
            style={{
              backgroundColor: 'rgba(161, 161, 170, 0.08)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
            }}
          >
            <VscInfo size={14} className="flex-shrink-0" />
            <span>
              <strong>Note on incomplete information:</strong> {overview.missingInfo.join(' • ')}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: Local Setup & Run Guide */}
      <OnboardingSection
        title="1. Local Setup & Quick Start"
        icon={<VscTerminal size={18} />}
        badge="Verified Commands"
      >
        <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
          Follow these verified steps to install dependencies and run the application in local development mode.
        </p>

        {/* Prerequisites */}
        {setup.prerequisites && setup.prerequisites.length > 0 && (
          <div className="mb-3">
            <span className="small fw-semibold text-white d-block mb-1">Prerequisites:</span>
            <div className="d-flex flex-wrap gap-2">
              {setup.prerequisites.map((p, idx) => (
                <span
                  key={idx}
                  className="badge"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.725rem',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Install Dependencies */}
        <div className="mb-3">
          <div className="small fw-semibold text-white mb-1">Step 1: Install Dependencies</div>
          {setup.installCommands?.map((cmd, idx) => (
            <SetupCommand key={idx} {...cmd} />
          ))}
        </div>

        {/* Step 2: Run Development Server */}
        <div className="mb-3">
          <div className="small fw-semibold text-white mb-1">Step 2: Start Development Server</div>
          {setup.devCommands?.map((cmd, idx) => (
            <SetupCommand key={idx} {...cmd} />
          ))}
        </div>

        {/* Production Commands (Optional) */}
        {setup.prodCommands && setup.prodCommands.length > 0 && (
          <div className="mb-3">
            <div className="small fw-semibold text-white mb-1">Step 3: Build & Production Mode (Optional)</div>
            {setup.prodCommands.map((cmd, idx) => (
              <SetupCommand key={idx} {...cmd} />
            ))}
          </div>
        )}

        {/* Required External Services */}
        {setup.requiredServices && setup.requiredServices.length > 0 && (
          <div className="mt-3 p-3 rounded border" style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
            <span className="small fw-semibold text-white d-block mb-2">Required External Services:</span>
            <div className="d-flex flex-column gap-2">
              {setup.requiredServices.map((svc, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 small">
                  <span
                    className="p-1 rounded-circle"
                    style={{ backgroundColor: 'var(--color-success)', width: '6px', height: '6px' }}
                  />
                  <strong className="text-white">{svc.name}:</strong>
                  <span className="text-repolens-secondary">{svc.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Local URLs */}
        {setup.expectedUrls && setup.expectedUrls.length > 0 && (
          <div className="mt-3 d-flex flex-wrap align-items-center gap-2">
            <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
              Expected Local Endpoints:
            </span>
            {setup.expectedUrls.map((u, idx) => (
              <a
                key={idx}
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="code-badge d-flex align-items-center gap-1 text-decoration-none"
                style={{ fontSize: '0.725rem' }}
                title={u.description}
              >
                <span>{u.label}:</span>
                <span className="text-white">{u.url}</span>
                <VscLinkExternal size={11} />
              </a>
            ))}
          </div>
        )}
      </OnboardingSection>

      {/* Section 2: Environment Configuration */}
      <OnboardingSection
        title="2. Environment Variables & Credentials"
        icon={<VscChecklist size={18} />}
        badge={`${environment.variables?.length || 0} Variables`}
      >
        <EnvironmentVariableList
          variables={environment.variables || []}
          exampleFilePath={environment.exampleFilePath}
          setupInstructions={environment.setupInstructions}
          onNavigateToFile={onNavigateToFile}
        />
      </OnboardingSection>

      {/* Section 3: Recommended Reading Order */}
      <OnboardingSection
        title="3. Recommended Reading Order for New Developers"
        icon={<VscBook size={18} />}
        badge={`${readingOrder.length} Key Files`}
      >
        <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
          Read these verified files in sequence to understand application bootstrapping, routing, core business
          controllers, and database persistence.
        </p>

        <RecommendedFileList
          files={readingOrder}
          onNavigateToFile={onNavigateToFile}
          onAskAi={onAskAi}
        />
      </OnboardingSection>

      {/* Section 4: Architecture Overview */}
      <OnboardingSection
        title="4. Architecture & Component Structure"
        icon={<VscLayers size={18} />}
        badge="Layered Structure"
      >
        <div className="d-flex flex-column gap-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div
                className="p-3 rounded border h-100"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
              >
                <div className="small fw-semibold text-white mb-1">Backend Architecture</div>
                <div className="text-repolens-secondary small" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {architecture.backend}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div
                className="p-3 rounded border h-100"
                style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
              >
                <div className="small fw-semibold text-white mb-1">Frontend / Client Structure</div>
                <div className="text-repolens-secondary small" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {architecture.frontend}
                </div>
              </div>
            </div>
          </div>

          {/* Entry Points */}
          {architecture.entryPoints && architecture.entryPoints.length > 0 && (
            <div>
              <span className="small fw-semibold text-white d-block mb-2">Main Application Entry Points:</span>
              <div className="d-flex flex-column gap-2">
                {architecture.entryPoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-2 px-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
                    style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="font-monospace small text-white">{ep.path}</span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60A5FA',
                          fontSize: '0.65rem',
                        }}
                      >
                        {ep.type}
                      </span>
                      <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                        {ep.description}
                      </span>
                    </div>

                    {onNavigateToFile && (
                      <button
                        type="button"
                        onClick={() => onNavigateToFile(ep.path, { startLine: ep.startLine, endLine: ep.endLine })}
                        className="btn btn-sm btn-repolens-outline py-0 px-2 small"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Modules */}
          {architecture.keyModules && architecture.keyModules.length > 0 && (
            <div>
              <span className="small fw-semibold text-white d-block mb-2">Key Modules & Responsibilities:</span>
              <div className="d-flex flex-column gap-2">
                {architecture.keyModules.map((km, idx) => (
                  <div
                    key={idx}
                    className="p-2 px-3 rounded border"
                    style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                      <span className="font-monospace small fw-bold text-white">{km.path}</span>
                      {onNavigateToFile && (
                        <button
                          type="button"
                          onClick={() => onNavigateToFile(km.path)}
                          className="btn btn-sm btn-repolens-outline py-0 px-2 small"
                          style={{ fontSize: '0.7rem' }}
                        >
                          View
                        </button>
                      )}
                    </div>
                    <div className="text-repolens-secondary small" style={{ fontSize: '0.775rem' }}>
                      {km.responsibility}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Graph Callout */}
          {onNavigateToGraph && (
            <div
              className="p-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{
                backgroundColor: 'rgba(240, 80, 51, 0.08)',
                borderColor: 'rgba(240, 80, 51, 0.3)',
              }}
            >
              <div>
                <span className="small fw-semibold text-white d-block">Explore Interactive Architecture Graph</span>
                <span className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
                  Visualize module dependencies, API execution flows, and database interactions in React Flow.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToGraph(architecture.recommendedGraph || 'api-flow')}
                className="btn btn-sm py-1 px-3 fw-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)', fontSize: '0.75rem' }}
              >
                Open Graph View
              </button>
            </div>
          )}
        </div>
      </OnboardingSection>

      {/* Section 5: Request & Execution Flow */}
      <OnboardingSection
        title="5. Request & Data Flow"
        icon={<VscServerProcess size={18} />}
        badge="Execution Lifecycle"
      >
        <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
          {requestFlow.summary || 'Traces how incoming HTTP requests are processed through routing, controllers, and persistence layers.'}
        </p>

        {requestFlow.steps && requestFlow.steps.length > 0 && (
          <div className="d-flex flex-column gap-2 mb-3">
            {requestFlow.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-2 px-3 rounded border d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{
                  backgroundColor: 'var(--color-background)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#60A5FA',
                      fontSize: '0.7rem',
                    }}
                  >
                    {step.step || idx + 1}
                  </span>
                  <div>
                    <span className="fw-semibold text-white small me-2">{step.component}</span>
                    <span className="text-repolens-secondary small">{step.action}</span>
                  </div>
                </div>

                {step.filePath && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="font-monospace text-repolens-secondary small" style={{ fontSize: '0.7rem' }}>
                      {step.filePath}
                      {step.startLine ? `:${step.startLine}` : ''}
                    </span>
                    {onNavigateToFile && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToFile(step.filePath, {
                            startLine: step.startLine,
                            endLine: step.endLine,
                          })
                        }
                        className="btn btn-sm btn-repolens-outline py-0 px-2 small"
                        style={{ fontSize: '0.675rem' }}
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic limitations */}
        {requestFlow.limitations && requestFlow.limitations.length > 0 && (
          <div className="text-repolens-secondary small" style={{ fontSize: '0.75rem' }}>
            <strong>Analysis Boundaries:</strong> {requestFlow.limitations.join(' • ')}
          </div>
        )}
      </OnboardingSection>

      {/* Section 6: Testing & Troubleshooting */}
      <OnboardingSection
        title="6. Testing & Common Troubleshooting"
        icon={<VscSparkle size={18} />}
        badge={testingAndTroubleshooting.hasTests ? 'Tests Discovered' : 'Troubleshooting Ready'}
      >
        {/* Test Commands */}
        {testingAndTroubleshooting.testCommands && testingAndTroubleshooting.testCommands.length > 0 && (
          <div className="mb-3">
            <span className="small fw-semibold text-white d-block mb-1">Automated Test Execution:</span>
            {testingAndTroubleshooting.testCommands.map((cmd, idx) => (
              <SetupCommand key={idx} {...cmd} />
            ))}
          </div>
        )}

        {/* Troubleshooting Guide */}
        {testingAndTroubleshooting.troubleshooting && testingAndTroubleshooting.troubleshooting.length > 0 && (
          <div>
            <span className="small fw-semibold text-white d-block mb-2">Common Setup Pitfalls & Solutions:</span>
            <div className="d-flex flex-column gap-2">
              {testingAndTroubleshooting.troubleshooting.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <VscWarning size={14} style={{ color: 'var(--color-warning)' }} />
                    <span className="small fw-bold text-white">{item.issue}</span>
                  </div>
                  {item.possibleCause && (
                    <div className="text-repolens-secondary small mb-1" style={{ fontSize: '0.775rem' }}>
                      <strong>Cause:</strong> {item.possibleCause}
                    </div>
                  )}
                  {item.suggestedFix && (
                    <div className="small" style={{ color: 'var(--color-success)', fontSize: '0.775rem' }}>
                      <strong>Solution:</strong> {item.suggestedFix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </OnboardingSection>

      {/* Section 7: Source Evidence & Citations */}
      {evidence && evidence.length > 0 && (
        <OnboardingSection
          title="7. Verified Source Evidence & Citations"
          icon={<VscShield size={18} />}
          badge={`${evidence.length} Verified Snippets`}
          defaultOpen={false}
        >
          <p className="text-repolens-secondary small mb-3" style={{ fontSize: '0.8rem' }}>
            All instructions, reading recommendations, and setup configurations are grounded in these authoritative
            file snippets extracted from the repository.
          </p>
          <EvidenceCitation evidence={evidence} onNavigateToFile={onNavigateToFile} />
        </OnboardingSection>
      )}

      {/* Footer metadata */}
      <div className="text-center text-repolens-secondary small py-2" style={{ fontSize: '0.725rem' }}>
        Generated with {metadata.modelUsed || 'Gemini 2.5 Flash'} • Grounded in static AST analysis • Zero code execution
      </div>
    </div>
  );
}
