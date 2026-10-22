import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence } from 'motion/react';
import { VscLoading, VscLayers, VscWarning, VscInfo } from 'react-icons/vsc';

import CustomGraphNode from './CustomGraphNode';
import GraphToolbar from './GraphToolbar';
import GraphDetailsPanel from './GraphDetailsPanel';
import GraphLegend from './GraphLegend';
import { getRepositoryGraph } from '../../services/api';

const nodeTypes = {
  customNode: CustomGraphNode,
};

function FlowCanvas({
  repositoryId,
  onNavigateToFile,
  onAskAiAboutComponent,
  analysisStatus,
  initialGraphType = 'modules',
}) {
  const [userGraphType, setUserGraphType] = useState(null);
  const [prevInitial, setPrevInitial] = useState(initialGraphType);

  if (prevInitial !== initialGraphType) {
    setPrevInitial(initialGraphType);
    setUserGraphType(null);
  }

  const activeGraphType = userGraphType || initialGraphType || 'modules';
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Selected node or edge for side details inspection
  const [selectedItem, setSelectedItem] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { fitView } = useReactFlow();

  // 1. Fetch Graph from Backend
  useEffect(() => {
    if (!repositoryId) return;

    let isMounted = true;
    const fetchGraph = async () => {
      setIsLoading(true);
      setError(null);
      setSelectedItem(null);

      try {
        const response = await getRepositoryGraph(repositoryId, activeGraphType);
        const data = response.data || response;

        if (isMounted) {
          setGraphData(data);
          setIsLoading(false);

          // Apply initial nodes & edges with animation
          const rawNodes = data.nodes || [];
          const rawEdges = (data.edges || []).map((e) => ({
            ...e,
            style: {
              stroke: e.data?.isCircular
                ? '#facc15'
                : e.data?.relationshipType?.includes('db')
                ? '#f43f5e'
                : '#52525b',
              strokeWidth: e.data?.isCircular ? 2.5 : 1.5,
              strokeDasharray: e.data?.isCircular ? '5,5' : 'none',
            },
            labelStyle: {
              fill: '#a1a1aa',
              fontSize: 10,
              fontFamily: 'monospace',
            },
            labelBgStyle: {
              fill: '#171719',
              fillOpacity: 0.85,
              stroke: '#27272a',
            },
          }));

          setNodes(rawNodes);
          setEdges(rawEdges);

          setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
          }, 150);
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err?.error?.message || err?.message || 'Failed to load architecture graph.';
          setError(errMsg);
          setIsLoading(false);
        }
      }
    };

    fetchGraph();

    return () => {
      isMounted = false;
    };
  }, [repositoryId, activeGraphType, fitView, setNodes, setEdges]);

  // Extract distinct node categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (!graphData?.nodes) return [];
    const set = new Set();
    graphData.nodes.forEach((n) => {
      if (n.data?.nodeCategory) set.add(n.data.nodeCategory);
    });
    return Array.from(set);
  }, [graphData]);

  // Apply search & category filter to nodes
  useEffect(() => {
    if (!graphData?.nodes) return;

    const query = searchQuery.trim().toLowerCase();

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const label = (node.data?.label || '').toLowerCase();
        const sublabel = (node.data?.sublabel || '').toLowerCase();
        const cat = node.data?.nodeCategory || '';

        const matchesSearch = !query || label.includes(query) || sublabel.includes(query);
        const matchesCategory = filterCategory === 'all' || cat === filterCategory;

        const isVisible = matchesSearch && matchesCategory;

        return {
          ...node,
          hidden: !isVisible,
          style: {
            ...node.style,
            opacity: isVisible ? 1 : 0.2,
          },
        };
      })
    );
  }, [searchQuery, filterCategory, graphData, setNodes]);

  // Click node handler
  const onNodeClick = useCallback((event, node) => {
    setSelectedItem(node);
  }, []);

  // Click edge handler
  const onEdgeClick = useCallback((event, edge) => {
    setSelectedItem({ ...edge, type: 'edge' });
  }, []);

  // Click canvas background handler
  const onPaneClick = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  return (
    <div className="d-flex flex-column h-100 w-100 overflow-hidden position-relative bg-repolens-bg">
      {/* Top Interactive Toolbar */}
      <GraphToolbar
        activeGraphType={activeGraphType}
        onChangeGraphType={(type) => setUserGraphType(type)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        categories={availableCategories}
        onFitView={handleFitView}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        metadata={graphData?.metadata}
      />

      {/* Analysis Status Notice Bar */}
      {analysisStatus && analysisStatus !== 'completed' && (
        <div
          className="p-1 px-3 d-flex align-items-center gap-2 border-bottom text-truncate"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
            fontSize: '0.72rem',
            color: '#60a5fa',
          }}
        >
          <VscInfo size={13} className="flex-shrink-0" />
          <span className="text-truncate">
            Static code analysis is currently {analysisStatus}. Graph nodes and relationships will expand automatically once analysis completes.
          </span>
        </div>
      )}

      {/* Limitations Notice Bar if any */}
      {graphData?.metadata?.limitations?.length > 0 && (
        <div
          className="p-1 px-3 d-flex align-items-center gap-2 border-bottom text-truncate"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.2)',
            fontSize: '0.72rem',
            color: '#facc15',
          }}
        >
          <VscWarning size={13} className="flex-shrink-0" />
          <span className="text-truncate">
            {graphData.metadata.limitations[0]}
          </span>
        </div>
      )}

      {/* Main Graph Canvas Area */}
      <div className="flex-grow-1 position-relative overflow-hidden" style={{ backgroundColor: '#09090b' }}>
        {isLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-repolens-secondary">
            <VscLoading className="spin mb-3" size={32} style={{ color: 'var(--color-primary)' }} />
            <span className="small">Synthesizing architecture graph from static AST intelligence...</span>
          </div>
        ) : error ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-danger p-4 text-center">
            <VscWarning size={36} className="mb-2" />
            <h6 className="fw-semibold">Architecture Graph Unavailable</h6>
            <p className="small text-repolens-secondary mb-3" style={{ maxWidth: '420px' }}>
              {error}
            </p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-repolens-secondary p-4 text-center">
            <VscLayers size={36} className="mb-2 opacity-50" />
            <h6 className="text-white fw-semibold">No Graph Components Found</h6>
            <p className="small text-repolens-secondary mb-0" style={{ maxWidth: '380px' }}>
              Static analysis did not identify components matching this graph type in the repository.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#27272a" gap={24} size={1} />
            <Controls
              style={{
                backgroundColor: '#171719',
                borderColor: '#27272a',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            {showMiniMap && (
              <MiniMap
                style={{
                  backgroundColor: '#171719',
                  borderColor: '#27272a',
                  borderRadius: 'var(--radius-sm)',
                }}
                nodeColor={(n) => {
                  if (n.data?.isEntryPoint) return '#F05033';
                  if (n.data?.nodeCategory === 'api-route') return '#10b981';
                  if (n.data?.nodeCategory === 'controller') return '#06b6d4';
                  if (n.data?.nodeCategory === 'database') return '#f43f5e';
                  return '#52525b';
                }}
              />
            )}
          </ReactFlow>
        )}

        {/* Graph Legend Overlay */}
        {!isLoading && !error && nodes.length > 0 && <GraphLegend />}

        {/* Selected Node / Edge Details Panel */}
        <AnimatePresence>
          {selectedItem && (
            <GraphDetailsPanel
              selectedItem={selectedItem}
              onClose={() => setSelectedItem(null)}
              onNavigateToFile={onNavigateToFile}
              onAskAiAboutComponent={onAskAiAboutComponent}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function GraphWorkspace(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
