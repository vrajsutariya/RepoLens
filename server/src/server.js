import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  // Connect to database if configured
  await connectDB();

  const server = app.listen(config.port, () => {
    console.info(
      `[RepoLens Server] Running in ${config.nodeEnv} mode on http://localhost:${config.port}`
    );
    console.info(`[RepoLens Server] Health check available at http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.info(`[RepoLens Server] Received ${signal}. Closing HTTP server gracefully...`);
    server.close(() => {
      console.info('[RepoLens Server] HTTP server closed.');
      process.exit(0);
    });

    // Force exit after 10s timeout
    setTimeout(() => {
      console.error('[RepoLens Server] Forcefully terminating server process.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[RepoLens Server] Startup failure:', error);
  process.exit(1);
});
