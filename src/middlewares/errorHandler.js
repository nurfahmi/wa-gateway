const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error'
  };

  // In development, include stack trace
  if (config.app.env === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};

