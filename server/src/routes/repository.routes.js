import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { UPLOADS_ROOT } from '../config/storage.js';
import {
  uploadRepositoryZip,
  importGitRepository,
  getRepositories,
  getRepositoryById,
  getRepositoryTree,
  getRepositoryFiles,
  getRepositoryFileContent,
  triggerRepositoryAnalysis,
  getRepositoryAnalysis,
  getRepositoryLanguages,
  getRepositorySymbols,
  getRepositoryDependencies,
  getRepositoryEndpoints,
  getRepositoryDatabaseInteractions,
  getRepositoryAiContext,
  askRepositoryQuestion,
  getRepositorySuggestedQuestions,
} from '../controllers/repository.controller.js';

const router = Router();

// Multer storage configuration for temporary archive uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_ROOT);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `upload-${uniqueSuffix}-${sanitizedOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max upload limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isZipExt = ext === '.zip';
    const isZipMime =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream';

    if (isZipExt || isZipMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .zip archive files are permitted.'));
    }
  },
});

// Wrapper to handle multer errors cleanly with uniform JSON responses
const handleMulterUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'File size exceeds maximum safety limit of 25MB.',
            status: 400,
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          message: `Upload error: ${err.message}`,
          status: 400,
        },
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message,
          status: 400,
        },
      });
    }
    next();
  });
};

/**
 * Repository Ingestion Endpoints
 */
router.post('/upload', handleMulterUpload, uploadRepositoryZip);
router.post('/import', importGitRepository);

/**
 * Repository Inspection Endpoints
 */
router.get('/', getRepositories);
router.get('/:id', getRepositoryById);
router.get('/:id/tree', getRepositoryTree);
router.get('/:id/files', getRepositoryFiles);
router.get('/:id/file', getRepositoryFileContent);

/**
 * Code Intelligence Analysis Endpoints
 */
router.post('/:id/analyze', triggerRepositoryAnalysis);
router.get('/:id/analysis', getRepositoryAnalysis);
router.get('/:id/languages', getRepositoryLanguages);
router.get('/:id/symbols', getRepositorySymbols);
router.get('/:id/dependencies', getRepositoryDependencies);
router.get('/:id/endpoints', getRepositoryEndpoints);
router.get('/:id/database-interactions', getRepositoryDatabaseInteractions);
router.get('/:id/context', getRepositoryAiContext);

/**
 * Codebase Q&A Rate Limiter
 * Bounds question generation frequency per IP
 */
const askRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 questions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many question requests from this IP. Please wait before asking again.',
      status: 429,
    },
  },
});

/**
 * Codebase Q&A Endpoints (Phase 4)
 */
router.post('/:id/ask', askRateLimiter, askRepositoryQuestion);
router.get('/:id/suggested-questions', getRepositorySuggestedQuestions);

export default router;
