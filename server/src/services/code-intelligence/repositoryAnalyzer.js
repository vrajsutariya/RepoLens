import fs from 'fs';
import path from 'path';
import Repository from '../../models/Repository.js';
import AnalysisResult from '../../models/AnalysisResult.js';
import OnboardingGuide from '../../models/OnboardingGuide.js';
import { getRepoExtractedDir } from '../../config/storage.js';
import { assertSafePath } from '../../utils/pathSafety.js';
import { analyzeLanguages } from './languageDetector.js';
import { detectFrameworks } from './frameworkDetector.js';
import { detectEntryPoints } from './entryPointDetector.js';
import { extractSymbols } from './symbolExtractor.js';
import { analyzeApiEndpoints } from './apiAnalyzer.js';
import { analyzeDatabaseInteractions } from './databaseAnalyzer.js';
import { analyzeDependencies } from './dependencyAnalyzer.js';
import { findCircularDependencies, buildRelationshipGraph } from './relationshipBuilder.js';

const MAX_FILES_TO_ANALYZE = 500;
const MAX_FILE_SIZE_BYTES = 250 * 1024; // 250KB max per file for AST parsing

/**
 * Loads readable text contents for source files in a repository.
 */
const loadReadableFiles = async (repository, extractedDir, warnings = []) => {
  const loadedFiles = [];
  const parsedManifests = {};

  const candidateFiles = (repository.fileList || []).filter(
    (f) => !f.isBinary && f.size <= MAX_FILE_SIZE_BYTES
  );

  const filesToRead = candidateFiles.slice(0, MAX_FILES_TO_ANALYZE);

  for (const item of filesToRead) {
    try {
      const fullPath = assertSafePath(extractedDir, item.path);
      const content = await fs.promises.readFile(fullPath, 'utf8');

      loadedFiles.push({
        path: item.path,
        name: item.name,
        size: item.size,
        extension: item.extension,
        language: item.language,
        content,
        lineCount: content.split(/\r?\n/).length,
      });

      // Cache manifests
      const lowerName = item.name.toLowerCase();
      if (lowerName === 'package.json') {
        try {
          parsedManifests['package.json'] = JSON.parse(content);
        } catch {
          warnings.push({
            file: item.path,
            message: 'Malformed package.json manifest could not be parsed as JSON',
            type: 'manifest-parse-error',
          });
        }
      } else if (lowerName === 'requirements.txt') {
        parsedManifests['requirements.txt'] = content;
      }
    } catch (err) {
      warnings.push({
        file: item.path,
        message: `Could not read file for analysis: ${err.message}`,
        type: 'file-read-error',
      });
    }
  }

  return { loadedFiles, parsedManifests };
};

// Map to track and deduplicate in-flight analysis promises per repository ID
const inFlightAnalyses = new Map();

/**
 * Executes static code intelligence analysis on an imported repository.
 *
 * @param {string} repositoryId - MongoDB ObjectId of the repository
 * @returns {Promise<object>} Persisted AnalysisResult document
 */
export const analyzeRepository = async (repositoryId) => {
  const idStr = String(repositoryId);
  if (inFlightAnalyses.has(idStr)) {
    return inFlightAnalyses.get(idStr);
  }

  const analysisPromise = (async () => {
    const repository = await Repository.findById(repositoryId);
    if (!repository) {
      throw new Error(`Repository with ID "${repositoryId}" not found.`);
    }

    const extractedDir = getRepoExtractedDir(repository.storageKey);
    if (!fs.existsSync(extractedDir)) {
      throw new Error(`Extracted repository directory does not exist on disk for storage key "${repository.storageKey}".`);
    }

    // 1. Initialize or reset analysis record as 'processing'
    let analysis = await AnalysisResult.findOne({ repositoryId });
    if (!analysis) {
      analysis = new AnalysisResult({
        repositoryId,
        status: 'processing',
        startedAt: new Date(),
      });
    } else {
      analysis.status = 'processing';
      analysis.startedAt = new Date();
      analysis.completedAt = null;
      analysis.errorMessage = null;
    }
    await analysis.save();

    const warnings = [];

    try {
      // 2. Safe file discovery and content loading
      const { loadedFiles, parsedManifests } = await loadReadableFiles(repository, extractedDir, warnings);

      // 3. Language Statistics & Classification
      const languages = analyzeLanguages(loadedFiles);

      // 4. Framework Detection
      const frameworks = detectFrameworks(loadedFiles, parsedManifests);

      // 5. Entry Points & Configuration Discovery
      const entryPoints = detectEntryPoints(loadedFiles, parsedManifests);

      // 6. AST Symbol Extraction
      const { symbols, fileImports } = extractSymbols(loadedFiles, warnings);

      // 7. Express API Route Analysis
      const apiEndpoints = analyzeApiEndpoints(loadedFiles);

      // 8. Database Interaction Analysis
      const databaseInteractions = analyzeDatabaseInteractions(loadedFiles);

      // 9. Dependency & Import Graph
      const dependencies = analyzeDependencies(fileImports, repository.fileList, parsedManifests);
      const circularDependencies = findCircularDependencies(dependencies.internalImports);
      dependencies.circularDependencies = circularDependencies;

      const relationshipGraph = buildRelationshipGraph(repository.fileList, dependencies.internalImports, symbols);

      // 10. Metrics Computation
      let totalLOC = 0;
      for (const f of loadedFiles) {
        totalLOC += f.lineCount || 0;
      }

      const uniqueDbModels = new Set(databaseInteractions.map((db) => db.modelName));

      analysis.metrics = {
        totalFilesAnalyzed: loadedFiles.length,
        totalLOC,
        symbolsCount: symbols.length,
        apiEndpointsCount: apiEndpoints.length,
        databaseModelsCount: uniqueDbModels.size,
        relationshipsCount: dependencies.internalImports.length,
      };

      analysis.languages = languages;
      analysis.frameworks = frameworks;
      analysis.entryPoints = entryPoints;
      analysis.symbols = symbols;
      analysis.dependencies = dependencies;
      analysis.apiEndpoints = apiEndpoints;
      analysis.databaseInteractions = databaseInteractions;
      analysis.relationshipGraph = relationshipGraph;
      analysis.warnings = warnings;

      analysis.status = 'completed';
      analysis.completedAt = new Date();

      await analysis.save();

      // Mark any existing onboarding guide for this repository as stale
      try {
        await OnboardingGuide.updateOne({ repositoryId }, { $set: { isStale: true } });
      } catch {
        // Non-fatal if guide update fails
      }

      console.info(
        `[CodeIntelligence] Analysis completed for repository "${repository.name}" (${symbols.length} symbols, ${apiEndpoints.length} endpoints, ${frameworks.length} frameworks).`
      );

      return analysis;
    } catch (err) {
      console.error(`[CodeIntelligence] Analysis failed for repository "${repository.name}":`, err.message);
      analysis.status = 'failed';
      analysis.errorMessage = err.message;
      analysis.completedAt = new Date();
      await analysis.save();
      throw err;
    }
  })();

  inFlightAnalyses.set(idStr, analysisPromise);
  try {
    return await analysisPromise;
  } finally {
    inFlightAnalyses.delete(idStr);
  }
};
