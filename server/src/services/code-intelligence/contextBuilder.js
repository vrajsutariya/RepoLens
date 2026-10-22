/**
 * Code Context Builder for Google Gemini Code Intelligence.
 *
 * Converts static analysis evidence into compact, high-density structured context
 * suitable for retrieval and reasoning, strictly preserving file paths and line ranges.
 */
export class ContextBuilder {
  /**
   * Generates a compact Markdown summary of the repository architecture.
   *
   * @param {object} analysis - AnalysisResult document
   * @param {object} options
   * @param {number} [options.maxSymbols=25]
   * @param {number} [options.maxEndpoints=20]
   * @returns {string} Formatted markdown context
   */
  static buildArchitecturalSummary(analysis, options = {}) {
    if (!analysis) return 'No repository analysis available.';

    const maxSymbols = options.maxSymbols || 25;
    const maxEndpoints = options.maxEndpoints || 20;

    const sections = [];

    // 1. Core Architecture & Tech Stack (Verified Facts)
    sections.push('### [VERIFIED] Technology Stack & Architecture');
    const fwList = (analysis.frameworks || []).map((f) => `- ${f.name} (${f.category}) [${f.evidence}]`).join('\n');
    sections.push(fwList || '- No major frameworks identified in manifests.');

    // 2. Verified Entry Points
    sections.push('\n### [VERIFIED] Application Entry Points');
    const epList = (analysis.entryPoints || [])
      .map((e) => `- \`${e.path}\` (${e.type}): ${e.description}${e.command ? ` [Command: ${e.command}]` : ''}`)
      .join('\n');
    sections.push(epList || '- No explicit entry points found.');

    // 3. Discovered API Surface
    if (analysis.apiEndpoints && analysis.apiEndpoints.length > 0) {
      sections.push('\n### [VERIFIED] Declared HTTP API Endpoints');
      const apiList = analysis.apiEndpoints
        .slice(0, maxEndpoints)
        .map(
          (ep) =>
            `- **${ep.method}** \`${ep.path}\` -> handler: \`${ep.handlerName}\` in \`${ep.file}:${ep.startLine}\``
        )
        .join('\n');
      sections.push(apiList);
      if (analysis.apiEndpoints.length > maxEndpoints) {
        sections.push(`- *(and ${analysis.apiEndpoints.length - maxEndpoints} more endpoints)*`);
      }
    }

    // 4. Database Models & Interactions
    if (analysis.databaseInteractions && analysis.databaseInteractions.length > 0) {
      sections.push('\n### [VERIFIED] Database Models & Operations');
      const dbList = analysis.databaseInteractions
        .map(
          (db) =>
            `- [${db.technology}] Model: \`${db.modelName}\` (op: \`${db.operationType}\`) in \`${db.file}:${db.startLine}\``
        )
        .join('\n');
      sections.push(dbList);
    }

    // 5. Key Domain Symbols (Functions & Classes)
    if (analysis.symbols && analysis.symbols.length > 0) {
      sections.push('\n### [VERIFIED] Key Domain Functions & Classes');
      const symbolList = analysis.symbols
        .filter((s) => s.isExported || s.type === 'class' || s.type === 'function')
        .slice(0, maxSymbols)
        .map(
          (s) =>
            `- \`${s.name}\` (${s.type}${s.isAsync ? ', async' : ''}) in \`${s.file}:${s.startLine}-${s.endLine}\``
        )
        .join('\n');
      sections.push(symbolList);
    }

    // 6. Inferred Module Relationships Notice
    sections.push('\n### [INFERRED] Structural Observations');
    if (analysis.dependencies?.circularDependencies?.length > 0) {
      const cycleInfo = analysis.dependencies.circularDependencies
        .map((c) => `- Circular cycle: ${c.cycle.join(' -> ')}`)
        .join('\n');
      sections.push(cycleInfo);
    } else {
      sections.push('- No circular dependency cycles detected in module imports.');
    }

    return sections.join('\n');
  }

  /**
   * Builds curated code excerpts for a specific query or target symbol.
   *
   * @param {Array<{ path: string, content: string }>} files
   * @param {Array<{ file: string, startLine: number, endLine: number, name: string }>} targetSymbols
   * @returns {Array<{ path: string, startLine: number, endLine: number, content: string }>}
   */
  static extractSymbolSnippets(files, targetSymbols = []) {
    const fileMap = new Map(files.map((f) => [f.path.replace(/\\/g, '/'), f]));
    const snippets = [];

    for (const sym of targetSymbols.slice(0, 10)) {
      const file = fileMap.get(sym.file.replace(/\\/g, '/'));
      if (file && file.content) {
        const lines = file.content.split(/\r?\n/);
        // Include 2 lines before and 2 lines after for context
        const start = Math.max(0, sym.startLine - 3);
        const end = Math.min(lines.length, sym.endLine + 2);
        const excerpt = lines.slice(start, end).join('\n');

        snippets.push({
          path: sym.file,
          symbolName: sym.name,
          startLine: start + 1,
          endLine: end,
          content: excerpt,
        });
      }
    }

    return snippets;
  }
}

export default ContextBuilder;
