const HTTP_STATUS = require('../constants/httpStatus');
const logger = require('../utils/logger');

/**
 * Enforces role-based access control
 * @param  {...string} allowedRoles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required to access this resource.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('RBAC access denied', {
        userId: req.user.id,
        role: req.user.role,
        allowedRoles,
        url: req.originalUrl,
        method: req.method,
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE_ACCESS',
          message: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        },
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
