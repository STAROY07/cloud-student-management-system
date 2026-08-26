const HTTP_STATUS = require('../constants/httpStatus');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Centralized application error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Application Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const isDevelopment = config.nodeEnv === 'development';
  const message = statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR && !isDevelopment
    ? 'An unexpected error occurred on the server. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * 404 Route Not Found middleware
 */
const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
