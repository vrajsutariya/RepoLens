import path from 'path';

const LANGUAGE_SPECS = {
  // Source Code Languages
  '.js': { language: 'JavaScript', isSource: true },
  '.jsx': { language: 'JavaScript (React)', isSource: true },
  '.mjs': { language: 'JavaScript', isSource: true },
  '.cjs': { language: 'JavaScript', isSource: true },
  '.ts': { language: 'TypeScript', isSource: true },
  '.tsx': { language: 'TypeScript (React)', isSource: true },
  '.mts': { language: 'TypeScript', isSource: true },
  '.cts': { language: 'TypeScript', isSource: true },
  '.py': { language: 'Python', isSource: true },
  '.pyw': { language: 'Python', isSource: true },
  '.java': { language: 'Java', isSource: true },
  '.c': { language: 'C', isSource: true },
  '.h': { language: 'C/C++ Header', isSource: true },
  '.cpp': { language: 'C++', isSource: true },
  '.cc': { language: 'C++', isSource: true },
  '.cxx': { language: 'C++', isSource: true },
  '.hpp': { language: 'C++ Header', isSource: true },
  '.go': { language: 'Go', isSource: true },
  '.rs': { language: 'Rust', isSource: true },
  '.php': { language: 'PHP', isSource: true },
  '.rb': { language: 'Ruby', isSource: true },
  '.cs': { language: 'C#', isSource: true },
  '.swift': { language: 'Swift', isSource: true },
  '.kt': { language: 'Kotlin', isSource: true },
  '.kts': { language: 'Kotlin', isSource: true },
  '.sql': { language: 'SQL', isSource: true },
  '.sh': { language: 'Shell', isSource: true },
  '.bash': { language: 'Bash', isSource: true },
  '.zsh': { language: 'Zsh', isSource: true },
  '.html': { language: 'HTML', isSource: true },
  '.htm': { language: 'HTML', isSource: true },
  '.css': { language: 'CSS', isSource: true },
  '.scss': { language: 'SCSS', isSource: true },
  '.sass': { language: 'Sass', isSource: true },
  '.less': { language: 'Less', isSource: true },

  // Configuration and Data Assets
  '.json': { language: 'JSON', isSource: false },
  '.yaml': { language: 'YAML', isSource: false },
  '.yml': { language: 'YAML', isSource: false },
  '.toml': { language: 'TOML', isSource: false },
  '.xml': { language: 'XML', isSource: false },
  '.env': { language: 'Environment Config', isSource: false },
  '.ini': { language: 'INI Config', isSource: false },
  '.md': { language: 'Markdown', isSource: false },
  '.markdown': { language: 'Markdown', isSource: false },
  '.txt': { language: 'Plain Text', isSource: false },
};

/**
 * Classifies a file into a programming language or configuration asset.
 */
export const classifyFileLanguage = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const spec = LANGUAGE_SPECS[ext];
  if (spec) {
    return {
      language: spec.language,
      isSourceCode: spec.isSource,
    };
  }

  // Handle special dotfiles
  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'dockerfile') return { language: 'Dockerfile', isSource: false };
  if (basename === 'makefile') return { language: 'Makefile', isSource: false };
  if (basename.startsWith('.env')) return { language: 'Environment Config', isSource: false };

  return {
    language: 'Other',
    isSourceCode: false,
  };
};

/**
 * Aggregates language statistics with file counts, lines of code, and percentages.
 *
 * @param {Array<{ path: string, content?: string, lineCount?: number }>} files
 * @returns {Array<{ language: string, fileCount: number, loc: number, percentage: number, isSourceCode: boolean }>}
 */
export const analyzeLanguages = (files) => {
  const statsByLanguage = {};
  let totalSourceLOC = 0;
  let totalOverallLOC = 0;

  for (const file of files) {
    const { language, isSourceCode } = classifyFileLanguage(file.path);
    const loc = file.lineCount || (file.content ? file.content.split(/\r?\n/).length : 1);

    if (!statsByLanguage[language]) {
      statsByLanguage[language] = {
        language,
        fileCount: 0,
        loc: 0,
        isSourceCode,
      };
    }

    statsByLanguage[language].fileCount += 1;
    statsByLanguage[language].loc += loc;

    totalOverallLOC += loc;
    if (isSourceCode) {
      totalSourceLOC += loc;
    }
  }

  const denominatorLOC = totalSourceLOC > 0 ? totalSourceLOC : (totalOverallLOC || 1);

  return Object.values(statsByLanguage)
    .map((stat) => ({
      ...stat,
      percentage: Math.round(((stat.isSourceCode ? stat.loc : 0) / denominatorLOC) * 100) ||
        (stat.isSourceCode ? 1 : 0),
    }))
    .sort((a, b) => {
      // Source code languages prioritized first, then by line count
      if (a.isSourceCode && !b.isSourceCode) return -1;
      if (!a.isSourceCode && b.isSourceCode) return 1;
      return b.loc - a.loc;
    });
};
