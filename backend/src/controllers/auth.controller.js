const { query } = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { recordAuditLog } = require('../middleware/audit.middleware');
const HTTP_STATUS = require('../constants/httpStatus');
const { USER_STATUS, ROLES } = require('../constants/roles');
const logger = require('../utils/logger');

/**
 * Handle user authentication and token issuance
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.must_change_password,
              f.id AS faculty_id, f.department AS faculty_department, f.designation, f.phone AS faculty_phone,
              s.id AS student_id, s.roll_no, s.department AS student_department, s.semester, s.phone AS student_phone
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );

    if (userRes.rowCount === 0) {
      logger.warn('Authentication failed: user not found', { email, ip: req.ip });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
    }

    const user = userRes.rows[0];

    if (user.status !== USER_STATUS.ACTIVE) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: `Account is ${user.status.toLowerCase()}. Please contact administration.`,
        },
      });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      logger.warn('Authentication failed: invalid password', { email, ip: req.ip });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Record login audit event
    await recordAuditLog({
      actorId: user.id,
      action: 'USER_LOGIN',
      entity: 'USERS',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.student_phone || user.faculty_phone || null,
          mustChangePassword: !!user.must_change_password,
          facultyId: user.faculty_id || null,
          studentId: user.student_id || null,
          rollNo: user.roll_no || null,
          department: user.faculty_department || user.student_department || null,
          designation: user.designation || null,
          semester: user.semester || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Return currently authenticated user profile
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone || null,
          mustChangePassword: !!req.user.must_change_password,
          facultyId: req.user.facultyId || null,
          studentId: req.user.studentId || null,
          rollNo: req.user.rollNo || null,
          department: req.user.department || null,
          designation: req.user.designation || null,
          semester: req.user.semester || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user logout and revoke session
 */
const logout = async (req, res, next) => {
  try {
    await recordAuditLog({
      actorId: req.user.id,
      action: 'USER_LOGOUT',
      entity: 'USERS',
      entityId: req.user.id,
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change authenticated user password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    const isMatch = await comparePassword(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password does not match.' },
      });
    }

    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    await recordAuditLog({
      actorId: req.user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'USERS',
      entityId: req.user.id,
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile (Permitted personal attributes)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (name) {
      await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name.trim(), req.user.id]);
    }

    if (phone !== undefined) {
      if (req.user.role === ROLES.STUDENT && req.user.studentId) {
        await query('UPDATE students SET phone = $1, updated_at = NOW() WHERE id = $2', [phone ? phone.trim() : null, req.user.studentId]);
      } else if (req.user.role === ROLES.FACULTY && req.user.facultyId) {
        await query('UPDATE faculty SET phone = $1, updated_at = NOW() WHERE id = $2', [phone ? phone.trim() : null, req.user.facultyId]);
      }
    }

    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password,
              f.id AS faculty_id, f.department AS faculty_department, f.designation, f.phone AS faculty_phone,
              s.id AS student_id, s.roll_no, s.department AS student_department, s.semester, s.phone AS student_phone
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const user = userRes.rows[0];

    await recordAuditLog({
      actorId: req.user.id,
      action: 'PROFILE_UPDATED',
      entity: 'USERS',
      entityId: req.user.id,
      details: { newName: name ? name.trim() : undefined, newPhone: phone ? phone.trim() : undefined },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.student_phone || user.faculty_phone || null,
          mustChangePassword: !!user.must_change_password,
          facultyId: user.faculty_id || null,
          studentId: user.student_id || null,
          rollNo: user.roll_no || null,
          department: user.faculty_department || user.student_department || null,
          designation: user.designation || null,
          semester: user.semester || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change authenticated user email with password verification
 */
const changeEmail = async (req, res, next) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (normalizedNewEmail === req.user.email.toLowerCase()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'SAME_EMAIL', message: 'New email address must be different from current email.' },
      });
    }

    // 1. Verify user & password
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User record not found.' },
      });
    }

    const isMatch = await comparePassword(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password does not match.' },
      });
    }

    // 2. Check for duplicate email in database
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [normalizedNewEmail, req.user.id]);
    if (existing.rowCount > 0) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'This email address is already registered to another account.' },
      });
    }

    // 3. Update database
    await query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [normalizedNewEmail, req.user.id]);

    // 4. Audit Log
    await recordAuditLog({
      actorId: req.user.id,
      action: 'EMAIL_UPDATED',
      entity: 'USERS',
      entityId: req.user.id,
      details: { oldEmail: req.user.email, newEmail: normalizedNewEmail },
      ipAddress: req.ip,
    });

    const refreshedUserRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.must_change_password,
              f.id AS faculty_id, f.department AS faculty_department, f.designation, f.phone AS faculty_phone,
              s.id AS student_id, s.roll_no, s.department AS student_department, s.semester, s.phone AS student_phone
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const user = refreshedUserRes.rows[0];

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'University email address updated successfully. Please use your new email for future logins.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.student_phone || user.faculty_phone || null,
          mustChangePassword: !!user.must_change_password,
          facultyId: user.faculty_id || null,
          studentId: user.student_id || null,
          rollNo: user.roll_no || null,
          department: user.faculty_department || user.student_department || null,
          designation: user.designation || null,
          semester: user.semester || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  logout,
  changePassword,
  updateProfile,
  changeEmail,
};

