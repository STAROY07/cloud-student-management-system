const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');
const HTTP_STATUS = require('../constants/httpStatus');
const { USER_STATUS } = require('../constants/roles');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access denied. Missing or invalid Authorization header.',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      logger.warn('JWT verification failed', { error: err.message, ip: req.ip });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Session has expired or token is invalid. Please sign in again.',
        },
      });
    }

    // Verify user exists and status is ACTIVE in PostgreSQL
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password,
              f.id AS faculty_id, f.department AS faculty_department, f.phone AS faculty_phone,
              s.id AS student_id, s.roll_no, s.department AS student_department, s.semester, s.phone AS student_phone
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Authenticated user profile no longer exists.',
        },
      });
    }

    const user = userRes.rows[0];

    if (user.status !== USER_STATUS.ACTIVE) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: `Your account is currently ${user.status.toLowerCase()}. Please contact the administrator.`,
        },
      });
    }

    // Attach enriched user session to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.student_phone || user.faculty_phone || null,
      must_change_password: !!user.must_change_password,
      facultyId: user.faculty_id || null,
      studentId: user.student_id || null,
      rollNo: user.roll_no || null,
      department: user.faculty_department || user.student_department || null,
      semester: user.semester || null,
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'AUTH_INTERNAL_ERROR',
        message: 'Internal server error during authentication.',
      },
    });
  }
};

module.exports = {
  authenticateToken,
};
