import fs from 'fs';
import path from 'path';
import Repository from '../models/Repository.js';
import AnalysisResult from '../models/AnalysisResult.js';
import OnboardingGuide from '../models/OnboardingGuide.js';
import { analyzeRepository } from '../services/code-intelligence/repositoryAnalyzer.js';
import ContextBuilder from '../services/code-intelligence/contextBuilder.js';
import { processZipUpload } from '../services/zipIngestion.service.js';
import { processGitImport } from '../services/gitIngestion.service.js';
import {
  getRepoExtractedDir,
  getRepoStorageDir,
  cleanupDirectory,
  cleanupAllRepositoriesStorage,
  cleanupOrphanedStorage,
} from '../config/storage.js';
import { assertSafePath, isBinaryFile } from '../utils/pathSafety.js';
import { detectLanguage } from '../utils/languageDetector.js';
import { getDBStatus } from '../config/db.js';
import { answerCodebaseQuestion } from '../services/code-intelligence/qaService.js';
import { generateSuggestedQuestions } from '../services/code-intelligence/suggestedQuestions.service.js';
import { generateRepositoryGraph } from '../services/code-intelligence/graphBuilder.js';
import {
  generateOnboardingGuide,
  getOnboardingGuide,
} from '../services/code-intelligence/onboardingService.js';

const MAX_DISPLAY_FILE_SIZE_BYTES = 500 * 1024; // 500KB text view limit

/**
 * Ensures MongoDB is connected before attempting operations.
 */
const assertDatabaseConnected = () => {
  const status = getDBStatus();
  if (status !== 'connected') {
    const error = new Error(
      'MongoDB is not configured or currently unavailable. Please verify MONGODB_URI in server/.env.'
    );
    error.statusCode = 503;
    throw error;
  }
};

/**
 * POST /api/repositories/upload
 * Handles ZIP archive upload and ingestion.
 */
export const uploadRepositoryZip = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No file uploaded. Please provide a valid .zip file in multipart form field "file".',
          status: 400,
        },
      });
    }

    const repository = await processZipUpload(req.file, req.body.name);

    res.status(201).json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/repositories/import
 * Handles public Git repository URL ingestion.
 */
export const importGitRepository = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Repository URL is required. Please provide a public HTTPS Git URL.',
          status: 400,
        },
      });
    }

    const repository = await processGitImport(url.trim());

    res.status(201).json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories
 * Lists recent repositories without bulky file lists.
 * Supports configurable limit via query parameter (default: 100).
 */
export const getRepositories = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

    const [repositories, totalCount] = await Promise.all([
      Repository.find({}, '-fileList -fileTree')
        .sort({ createdAt: -1 })
        .limit(limit),
      Repository.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: repositories,
      total: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id
 * Retrieves full repository metadata and file tree.
 */
export const getRepositoryById = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const repository = await Repository.findById(req.params.id);
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${req.params.id}" not found.`,
          status: 404,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/tree
 * Retrieves the nested directory tree of the repository.
 */
export const getRepositoryTree = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const repository = await Repository.findById(
      req.params.id,
      'name sourceType status fileTree totalFiles detectedLanguages'
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${req.params.id}" not found.`,
          status: 404,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: repository._id,
        name: repository.name,
        fileTree: repository.fileTree,
        totalFiles: repository.totalFiles,
        detectedLanguages: repository.detectedLanguages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/files
 * Retrieves flat file listing with optional search query.
 */
export const getRepositoryFiles = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { query, language } = req.query;
    const repository = await Repository.findById(req.params.id, 'name fileList');

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${req.params.id}" not found.`,
          status: 404,
        },
      });
    }

    let files = repository.fileList || [];

    if (query) {
      const q = query.toLowerCase();
      files = files.filter(
        (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      );
    }

    if (language) {
      files = files.filter((f) => f.language.toLowerCase() === language.toLowerCase());
    }

    res.status(200).json({
      success: true,
      data: {
        total: files.length,
        files,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/file?path=...
 * Retrieves the text content of a single source file safely.
 */
export const getRepositoryFileContent = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const filePath = req.query.path;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File path query parameter "path" is required.',
          status: 400,
        },
      });
    }

    const repository = await Repository.findById(req.params.id, 'name storageKey');
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${req.params.id}" not found.`,
          status: 404,
        },
      });
    }

    const extractedDir = getRepoExtractedDir(repository.storageKey);

    // 1. Sanitize file path against directory traversal
    let safeFullPath;
    try {
      safeFullPath = assertSafePath(extractedDir, filePath);
    } catch {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: Directory traversal or invalid file path.',
          status: 403,
        },
      });
    }

    // 2. Verify file existence
    let stats;
    try {
      stats = await fs.promises.stat(safeFullPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: {
          message: `File "${filePath}" does not exist in repository.`,
          status: 404,
        },
      });
    }

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Path "${filePath}" is a directory, not a readable file.`,
          status: 400,
        },
      });
    }

    const fileName = path.basename(safeFullPath);
    const extension = path.extname(fileName).toLowerCase();
    const language = detectLanguage(fileName);

    // 3. Check for binary file
    if (isBinaryFile(fileName)) {
      return res.status(200).json({
        success: true,
        data: {
          path: filePath,
          name: fileName,
          size: stats.size,
          extension,
          language,
          isBinary: true,
          message: 'Binary file cannot be displayed as text.',
          content: null,
          lineCount: 0,
        },
      });
    }

    // 4. Enforce file size limit for text view
    if (stats.size > MAX_DISPLAY_FILE_SIZE_BYTES) {
      return res.status(200).json({
        success: true,
        data: {
          path: filePath,
          name: fileName,
          size: stats.size,
          extension,
          language,
          isBinary: false,
          isTruncated: true,
          message: `File size (${Math.round(stats.size / 1024)}KB) exceeds the maximum display limit of ${
            MAX_DISPLAY_FILE_SIZE_BYTES / 1024
          }KB.`,
          content: null,
          lineCount: 0,
        },
      });
    }

    // 5. Read text content
    const buffer = await fs.promises.readFile(safeFullPath);

    // Secondary binary content heuristic check
    if (isBinaryFile(fileName, buffer)) {
      return res.status(200).json({
        success: true,
        data: {
          path: filePath,
          name: fileName,
          size: stats.size,
          extension,
          language,
          isBinary: true,
          message: 'Binary file cannot be displayed as text.',
          content: null,
          lineCount: 0,
        },
      });
    }

    const content = buffer.toString('utf8');
    const lineCount = content ? content.split(/\r?\n/).length : 0;

    res.status(200).json({
      success: true,
      data: {
        path: filePath,
        name: fileName,
        size: stats.size,
        extension,
        language,
        isBinary: false,
        isTruncated: false,
        lineCount,
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/repositories/:id/analyze
 * Manually starts or reruns static code intelligence analysis.
 */
export const triggerRepositoryAnalysis = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await analyzeRepository(req.params.id);
    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/analysis
 * Retrieves analysis results, architecture metrics, and status.
 */
export const getRepositoryAnalysis = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id });
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: {
          message: `No analysis results found for repository ID "${req.params.id}". Trigger analysis via POST /api/repositories/${req.params.id}/analyze.`,
          status: 404,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/languages
 * Retrieves detailed language breakdown and lines of code.
 */
export const getRepositoryLanguages = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id }, 'languages metrics status');
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    res.status(200).json({
      success: true,
      data: analysis.languages || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/symbols
 * Retrieves extracted symbols (functions, classes, methods) with pagination & filters.
 */
export const getRepositorySymbols = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const { query, type, file, page = 1, limit = 50 } = req.query;

    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id }, 'symbols metrics');
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    let symbols = analysis.symbols || [];

    if (query) {
      const q = query.toLowerCase();
      symbols = symbols.filter((s) => s.name.toLowerCase().includes(q) || s.file.toLowerCase().includes(q));
    }

    if (type) {
      symbols = symbols.filter((s) => s.type.toLowerCase() === type.toLowerCase());
    }

    if (file) {
      symbols = symbols.filter((s) => s.file.toLowerCase().includes(file.toLowerCase()));
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const total = symbols.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedSymbols = symbols.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        symbols: paginatedSymbols,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/dependencies
 * Retrieves internal and external module dependencies.
 */
export const getRepositoryDependencies = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id }, 'dependencies relationshipGraph metrics');
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        dependencies: analysis.dependencies,
        relationshipGraph: analysis.relationshipGraph,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/endpoints
 * Retrieves discovered Express API endpoints.
 */
export const getRepositoryEndpoints = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id }, 'apiEndpoints metrics');
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    res.status(200).json({
      success: true,
      data: analysis.apiEndpoints || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/database-interactions
 * Retrieves discovered database models, schemas, and queries.
 */
export const getRepositoryDatabaseInteractions = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id }, 'databaseInteractions metrics');
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    res.status(200).json({
      success: true,
      data: analysis.databaseInteractions || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/context
 * Generates verified structured context for Gemini AI.
 */
export const getRepositoryAiContext = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const analysis = await AnalysisResult.findOne({ repositoryId: req.params.id });
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analysis not found for this repository.', status: 404 },
      });
    }

    const summary = ContextBuilder.buildArchitecturalSummary(analysis);
    res.status(200).json({
      success: true,
      data: {
        summary,
        metrics: analysis.metrics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/repositories/:id/ask
 * Answers codebase questions grounded in verified repository evidence.
 */
export const askRepositoryQuestion = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format: "${id}".`,
          status: 400,
        },
      });
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Question is required and must be a non-empty string.',
          status: 400,
        },
      });
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 3) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Question must be at least 3 characters long.',
          status: 400,
        },
      });
    }

    if (trimmedQuestion.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Question exceeds maximum length limit of 500 characters.',
          status: 400,
        },
      });
    }

    const result = await answerCodebaseQuestion(id, trimmedQuestion);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: {
        message: error.message || 'An error occurred while answering the codebase question.',
        status,
        code: error.code || null,
        suggestedFaqs: error.suggestedFaqs || [],
      },
    });
  }
};

/**
 * GET /api/repositories/faq
 * Returns predefined FAQ knowledge base entries for offline help and onboarding.
 */
export const getRepositoryFaqEntries = async (req, res) => {
  const { FAQ_ENTRIES } = await import('../services/code-intelligence/faqKnowledgeBase.js');
  res.status(200).json({
    success: true,
    data: FAQ_ENTRIES,
  });
};

/**
 * GET /api/repositories/:id/suggested-questions
 * Generates repository-tailored suggested questions based on static code intelligence.
 */
export const getRepositorySuggestedQuestions = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format: "${id}".`,
          status: 400,
        },
      });
    }

    const questions = await generateSuggestedQuestions(id);

    res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/graph?type=modules|api-flow|call-graph|database
 * Generates interactive architecture and execution flow graphs from repository intelligence.
 */
export const getRepositoryGraph = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format: "${id}".`,
          status: 400,
        },
      });
    }

    const repository = await Repository.findById(id, 'name fileList storageKey');
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${id}" not found.`,
          status: 404,
        },
      });
    }

    const analysis = await AnalysisResult.findOne({ repositoryId: id });
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Repository code intelligence analysis is incomplete or pending. Please analyze repository first.',
          status: 400,
          code: 'ANALYSIS_NOT_READY',
        },
      });
    }

    const { type = 'modules' } = req.query;
    const allowedTypes = new Set(['modules', 'api-flow', 'call-graph', 'database']);
    if (type && !allowedTypes.has(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid graph type "${type}". Allowed types: modules, api-flow, call-graph, database.`,
          status: 400,
        },
      });
    }

    const graph = generateRepositoryGraph(repository, analysis, type);

    res.status(200).json({
      success: true,
      data: graph,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/repositories/:id/onboarding
 * Retrieves the current onboarding guide for a repository if available.
 */
export const getRepositoryOnboardingGuide = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format "${id}". Must be a 24-character hexadecimal string.`,
          status: 400,
        },
      });
    }

    const result = await getOnboardingGuide(id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/repositories/:id/onboarding/generate
 * Generates an AI-powered onboarding and setup guide for an imported repository.
 */
export const generateRepositoryOnboardingGuide = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format "${id}". Must be a 24-character hexadecimal string.`,
          status: 400,
        },
      });
    }

    const repository = await Repository.findById(id, 'name storageKey');
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${id}" not found.`,
          status: 404,
        },
      });
    }

    const analysis = await AnalysisResult.findOne({ repositoryId: id });
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Repository code intelligence analysis is incomplete or pending. Please analyze repository first.',
          status: 400,
          code: 'ANALYSIS_NOT_READY',
        },
      });
    }

    const guide = await generateOnboardingGuide(id, { forceRegenerate: false });

    res.status(200).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/repositories/:id/onboarding/regenerate
 * Forces regeneration of the onboarding guide (bypassing cache).
 */
export const regenerateRepositoryOnboardingGuide = async (req, res, next) => {
  try {
    assertDatabaseConnected();
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format "${id}". Must be a 24-character hexadecimal string.`,
          status: 400,
        },
      });
    }

    const repository = await Repository.findById(id, 'name storageKey');
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${id}" not found.`,
          status: 404,
        },
      });
    }

    const analysis = await AnalysisResult.findOne({ repositoryId: id });
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Repository code intelligence analysis is incomplete or pending. Please analyze repository first.',
          status: 400,
          code: 'ANALYSIS_NOT_READY',
        },
      });
    }

    const guide = await generateOnboardingGuide(id, { forceRegenerate: true });

    res.status(200).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/repositories/:id
 * Permanently deletes a repository and all its associated analysis results,
 * onboarding guides, and extracted disk files.
 */
export const deleteRepository = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid repository ID format: "${id}".`,
          status: 400,
        },
      });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Repository with ID "${id}" not found.`,
          status: 404,
        },
      });
    }

    // 1. Delete associated database records across all models
    await Promise.all([
      AnalysisResult.deleteMany({ repositoryId: id }),
      OnboardingGuide.deleteMany({ repositoryId: id }),
    ]);

    // 2. Delete the repository document itself
    await Repository.findByIdAndDelete(id);

    // 3. Safely clean up repository storage directory on disk
    let directoryDeleted = false;
    if (repository.storageKey && typeof repository.storageKey === 'string') {
      const sanitizedKey = repository.storageKey.replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedKey.length > 0) {
        const repoStorageDir = getRepoStorageDir(sanitizedKey);
        directoryDeleted = await cleanupDirectory(repoStorageDir);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: `Repository "${repository.name}" and all associated analysis data were permanently deleted.`,
        id,
        directoryDeleted,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/repositories
 * Permanently deletes ALL repositories, associated analysis results,
 * onboarding guides, and purges all extracted repository directories from disk.
 */
export const deleteAllRepositories = async (req, res, next) => {
  try {
    assertDatabaseConnected();

    // 1. Count records prior to deletion for logging and reporting
    const [repoCount, analysisCount, guideCount] = await Promise.all([
      Repository.countDocuments(),
      AnalysisResult.countDocuments(),
      OnboardingGuide.countDocuments(),
    ]);

    // 2. Purge all records across all database models
    await Promise.all([
      Repository.deleteMany({}),
      AnalysisResult.deleteMany({}),
      OnboardingGuide.deleteMany({}),
    ]);

    // 3. Purge all extracted directories and uploaded archives from disk
    const diskDirsCleaned = await cleanupAllRepositoriesStorage();

    res.status(200).json({
      success: true,
      data: {
        message: `All repositories (${repoCount}) and associated data were permanently deleted from database and disk.`,
        deletedCounts: {
          repositories: repoCount,
          analysisResults: analysisCount,
          onboardingGuides: guideCount,
          storageDirectories: diskDirsCleaned,
        },
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
