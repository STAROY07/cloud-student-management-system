const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Application error carrying the HTTP status and stable error code
 * consumed by the centralized error handling middleware
 */
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(code, message) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, code, message);
  }

  static unauthorized(code, message) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, code, message);
  }

  static forbidden(code, message) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, code, message);
  }

  static notFound(code, message) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, code, message);
  }

  static conflict(code, message) {
    return new ApiError(HTTP_STATUS.CONFLICT, code, message);
  }
}

module.exports = ApiError;
