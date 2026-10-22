import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  VscFolder,
  VscFolderOpened,
  VscFile,
  VscFileCode,
  VscFileMedia,
  VscMarkdown,
  VscJson,
  VscSearch,
  VscChevronRight,
  VscChevronDown,
} from 'react-icons/vsc';

// Helper to choose file icon based on file extension
const getFileIcon = (fileName, isBinary) => {
  if (isBinary) return <VscFileMedia size={15} style={{ color: '#a1a1aa' }} />;

  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return <VscFileCode size={15} style={{ color: '#facc15' }} />;
    case 'ts':
    case 'tsx':
      return <VscFileCode size={15} style={{ color: '#38bdf8' }} />;
    case 'py':
      return <VscFileCode size={15} style={{ color: '#4ade80' }} />;
    case 'json':
      return <VscJson size={15} style={{ color: '#fb923c' }} />;
    case 'md':
    case 'markdown':
      return <VscMarkdown size={15} style={{ color: '#c084fc' }} />;
    case 'html':
    case 'css':
    case 'scss':
      return <VscFileCode size={15} style={{ color: '#f87171' }} />;
    default:
      return <VscFile size={15} style={{ color: '#94a3b8' }} />;
  }
};

/**
 * Recursive File & Directory Tree Node component
 */
function TreeNode({ node, depth = 0, selectedPath, onSelectFile, expandedFolders, onToggleFolder }) {
  if (!node) return null;

  const isDirectory = node.type === 'directory';
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div className="w-100">
      <div
        onClick={handleClick}
        className={`file-tree-node ${isSelected ? 'active' : ''}`}
        style={{
          paddingLeft: `${Math.max(8, depth * 14)}px`,
        }}
        title={node.path}
      >
        {isDirectory ? (
          <>
            <span style={{ width: '12px', display: 'inline-flex', alignItems: 'center' }}>
              {isExpanded ? <VscChevronDown size={12} /> : <VscChevronRight size={12} />}
            </span>
            {isExpanded ? (
              <VscFolderOpened size={16} style={{ color: 'var(--color-primary)' }} />
            ) : (
              <VscFolder size={16} style={{ color: 'var(--color-text-secondary)' }} />
            )}
            <span className="text-truncate fw-medium">{node.name}</span>
          </>
        ) : (
          <>
            <span style={{ width: '12px' }} />
            {getFileIcon(node.name, node.isBinary)}
            <span className="text-truncate">{node.name}</span>
          </>
        )}
      </div>

      {isDirectory && (
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {node.children.map((child) => (
                <TreeNode
                  key={child.path || child.name}
                  node={child}
                  depth={depth + 1}
                  selectedPath={selectedPath}
                  onSelectFile={onSelectFile}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default function FileExplorer({ fileTree, fileList = [], selectedPath, onSelectFile }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Set default expanded folders (top-level)
  const [expandedFolders, setExpandedFolders] = useState(() => {
    const initial = new Set();
    if (fileTree && fileTree.path) {
      initial.add(fileTree.path);
    }
    // Also expand immediate children if they are directories
    if (fileTree && fileTree.children) {
      fileTree.children.forEach((c) => {
        if (c.type === 'directory') initial.add(c.path);
      });
    }
    return initial;
  });

  const handleToggleFolder = (folderPath) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Filtered file list when searching
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return fileList.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [searchQuery, fileList]);

  return (
    <div
      className="d-flex flex-column h-100 border-end border-repolens bg-repolens-surface"
      style={{ width: '320px', minWidth: '260px' }}
    >
      {/* File Explorer Header & Search */}
      <div className="p-3 border-bottom border-repolens">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="small fw-bold text-white text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            File Explorer
          </span>
          <span className="code-badge" style={{ fontSize: '0.7rem' }}>
            {fileList.length} files
          </span>
        </div>

        <div className="input-group input-group-sm">
          <span className="input-group-text bg-repolens-bg border-repolens text-repolens-secondary">
            <VscSearch size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in repository..."
            className="form-control bg-repolens-bg text-white border-repolens"
            style={{ fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Tree / Filtered List View */}
      <div className="flex-grow-1 overflow-auto p-2">
        {filteredFiles ? (
          /* Search results flat list */
          <div className="d-flex flex-column gap-1">
            <div className="text-repolens-secondary px-2 py-1" style={{ fontSize: '0.7rem' }}>
              Found {filteredFiles.length} matching files:
            </div>
            {filteredFiles.length === 0 ? (
              <div className="p-3 text-center text-repolens-secondary small">
                No matching files found.
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedPath === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => onSelectFile(file.path)}
                    className={`file-tree-node ${isSelected ? 'active' : ''}`}
                    title={file.path}
                  >
                    {getFileIcon(file.name, file.isBinary)}
                    <div className="d-flex flex-column overflow-hidden">
                      <span className="text-truncate fw-medium">{file.name}</span>
                      <span className="text-repolens-secondary text-truncate" style={{ fontSize: '0.65rem' }}>
                        {file.path}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : fileTree ? (
          /* Hierarchical tree */
          <TreeNode
            node={fileTree}
            depth={0}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        ) : (
          <div className="p-3 text-center text-repolens-secondary small">
            No files available in this repository.
          </div>
        )}
      </div>
    </div>
  );
}
