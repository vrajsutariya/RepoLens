import path from 'path';

const LANGUAGE_EXTENSION_MAP = {
  // JavaScript & TypeScript
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',

  // Python
  '.py': 'Python',
  '.pyw': 'Python',

  // Java & Kotlin
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',

  // Systems Programming
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hpp': 'C++ Header',
  '.rs': 'Rust',
  '.go': 'Go',

  // Modern Enterprise & Mobile
  '.cs': 'C#',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.rb': 'Ruby',
  '.php': 'PHP',

  // Web & Styles
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',

  // Data & Config
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.toml': 'TOML',
  '.sql': 'SQL',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',

  // Shell & Scripts
  '.sh': 'Shell',
  '.bash': 'Bash',
  '.zsh': 'Zsh',
  '.ps1': 'PowerShell',
  '.bat': 'Batch',
  '.cmd': 'Batch',

  // Documentation
  '.md': 'Markdown',
  '.markdown': 'Markdown',
  '.txt': 'Plain Text',
};

/**
 * Detects language for a given file name or path.
 */
export const detectLanguage = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_EXTENSION_MAP[ext] || 'Other';
};

/**
 * Analyzes language breakdown for a list of indexed files.
 * @param {Array<{ language: string, isBinary: boolean }>} files
 * @returns {Array<{ language: string, count: number, percentage: number }>}
 */
export const calculateLanguageBreakdown = (files) => {
  const codeFiles = files.filter((f) => !f.isBinary && f.language !== 'Other' && f.language !== 'Plain Text');
  const counts = {};
  let total = 0;

  for (const file of codeFiles) {
    counts[file.language] = (counts[file.language] || 0) + 1;
    total++;
  }

  // If no recognized code files, count all files
  if (total === 0) {
    for (const file of files) {
      counts[file.language] = (counts[file.language] || 0) + 1;
      total++;
    }
  }

  if (total === 0) return [];

  return Object.entries(counts)
    .map(([language, count]) => ({
      language,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
};
