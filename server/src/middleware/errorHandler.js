import { config } from '../config/env.js';

/**
 * Centralized Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error details for server diagnostics
  console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
  if (err.stack && config.nodeEnv === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      ...(err.code && { code: err.code }),
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

export default errorHandler;
