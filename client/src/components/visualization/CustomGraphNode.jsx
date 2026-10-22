import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  VscRocket,
  VscServerProcess,
  VscSymbolMethod,
  VscDatabase,
  VscFileCode,
  VscGear,
  VscLayers,
  VscShield,
} from 'react-icons/vsc';

const CATEGORY_STYLES = {
  'entry-point': {
    border: 'rgba(240, 80, 51, 0.6)',
    bg: 'rgba(240, 80, 51, 0.1)',
    badgeBg: '#F05033',
    badgeText: '#ffffff',
    icon: <VscRocket size={13} />,
    title: 'Entry Point',
  },
  'api-route': {
    border: 'rgba(16, 185, 129, 0.6)',
    bg: 'rgba(16, 185, 129, 0.1)',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    icon: <VscServerProcess size={13} />,
    title: 'HTTP Route',
  },
  'controller': {
    border: 'rgba(6, 182, 212, 0.6)',
    bg: 'rgba(6, 182, 212, 0.1)',
    badgeBg: '#06b6d4',
    badgeText: '#0f172a',
    icon: <VscSymbolMethod size={13} />,
    title: 'Controller',
  },
  'middleware': {
    border: 'rgba(245, 158, 11, 0.6)',
    bg: 'rgba(245, 158, 11, 0.1)',
    badgeBg: '#f59e0b',
    badgeText: '#0f172a',
    icon: <VscShield size={13} />,
    title: 'Middleware',
  },
  'model': {
    border: 'rgba(244, 63, 94, 0.6)',
    bg: 'rgba(244, 63, 94, 0.1)',
    badgeBg: '#f43f5e',
    badgeText: '#ffffff',
    icon: <VscDatabase size={13} />,
    title: 'Database Model',
  },
  'database': {
    border: 'rgba(244, 63, 94, 0.6)',
    bg: 'rgba(244, 63, 94, 0.1)',
    badgeBg: '#f43f5e',
    badgeText: '#ffffff',
    icon: <VscDatabase size={13} />,
    title: 'DB Operation',
  },
  'class': {
    border: 'rgba(168, 85, 247, 0.6)',
    bg: 'rgba(168, 85, 247, 0.1)',
    badgeBg: '#a855f7',
    badgeText: '#ffffff',
    icon: <VscLayers size={13} />,
    title: 'Class',
  },
  'function': {
    border: 'rgba(59, 130, 246, 0.6)',
    bg: 'rgba(59, 130, 246, 0.1)',
    badgeBg: '#3b82f6',
    badgeText: '#ffffff',
    icon: <VscSymbolMethod size={13} />,
    title: 'Function',
  },
  'config': {
    border: 'rgba(161, 161, 170, 0.6)',
    bg: 'rgba(161, 161, 170, 0.1)',
    badgeBg: '#71717a',
    badgeText: '#ffffff',
    icon: <VscGear size={13} />,
    title: 'Config',
  },
  'module': {
    border: 'rgba(113, 113, 122, 0.5)',
    bg: 'rgba(113, 113, 122, 0.08)',
    badgeBg: '#52525b',
    badgeText: '#ffffff',
    icon: <VscFileCode size={13} />,
    title: 'Module',
  },
};

function CustomGraphNode({ data, selected }) {
  const cat = data?.nodeCategory || 'module';
  const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.module;

  return (
    <div
      className="custom-graph-node position-relative rounded shadow-sm text-start"
      style={{
        width: '240px',
        backgroundColor: '#171719',
        border: selected ? '2px solid var(--color-primary)' : `1px solid ${style.border}`,
        boxShadow: selected ? '0 0 12px rgba(240, 80, 51, 0.4)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        cursor: 'pointer',
      }}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--color-primary)',
          border: '2px solid #171719',
        }}
      />

      {/* Node Header */}
      <div
        className="p-2 px-3 d-flex align-items-center justify-content-between gap-2 border-bottom"
        style={{
          backgroundColor: style.bg,
          borderColor: style.border,
          borderTopLeftRadius: 'var(--radius-sm)',
          borderTopRightRadius: 'var(--radius-sm)',
        }}
      >
        <div className="d-flex align-items-center gap-1 overflow-hidden">
          <span style={{ color: style.badgeBg, flexShrink: 0 }}>{style.icon}</span>
          <span
            className="text-truncate fw-semibold"
            style={{ fontSize: '0.7rem', color: '#e4e4e7', textTransform: 'uppercase' }}
          >
            {data.httpMethod || style.title}
          </span>
        </div>

        {data.symbolsCount > 0 && (
          <span
            className="badge rounded-pill"
            style={{ backgroundColor: '#27272a', color: '#a1a1aa', fontSize: '0.62rem' }}
          >
            {data.symbolsCount} symbols
          </span>
        )}

        {data.isAsync && (
          <span
            className="badge rounded-pill"
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.62rem' }}
          >
            async
          </span>
        )}
      </div>

      {/* Node Body */}
      <div className="p-2 px-3">
        <div
          className="text-white fw-bold text-truncate"
          style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
          title={data.label}
        >
          {data.label}
        </div>

        {data.sublabel && (
          <div
            className="text-truncate"
            style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '2px' }}
            title={data.sublabel}
          >
            {data.sublabel}
          </div>
        )}
      </div>

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--color-primary)',
          border: '2px solid #171719',
        }}
      />
    </div>
  );
}

export default memo(CustomGraphNode);
