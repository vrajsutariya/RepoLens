/**
 * 404 Not Found Middleware for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
      path: req.originalUrl,
      status: 404,
    },
  });
};

export default notFoundHandler;
