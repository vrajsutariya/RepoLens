import { Router } from 'express';
import { config, isGeminiConfigured } from '../config/env.js';
import { getDBStatus } from '../config/db.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Get overall system health and service availability
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  const geminiConfigured = isGeminiConfigured();

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'RepoLens API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      services: {
        database: dbStatus,
        gemini: {
          configured: geminiConfigured,
          model: config.geminiModel,
        },
      },
    },
  });
});

export default router;
