const { query } = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { recordAuditLog } = require('../middleware/audit.middleware');
const HTTP_STATUS = require('../constants/httpStatus');
const { USER_STATUS, ROLES } = require('../constants/roles');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { USER_PROFILE_COLUMNS, serializeUser, findUserProfileById } = require('../utils/userProfile');

const invalidCredentials = (res) =>
  sendError(res, {
    status: HTTP_STATUS.UNAUTHORIZED,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email address or password.',
  });

/**
 * Handle user authentication and token issuance
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const userRes = await query(
    `SELECT ${USER_PROFILE_COLUMNS}, u.password_hash
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );

  if (userRes.rowCount === 0) {
    logger.warn('Authentication failed: user not found', { email, ip: req.ip });
    return invalidCredentials(res);
  }

  const user = userRes.rows[0];

  if (user.status !== USER_STATUS.ACTIVE) {
    return sendError(res, {
      status: HTTP_STATUS.FORBIDDEN,
      code: 'ACCOUNT_INACTIVE',
      message: `Account is ${user.status.toLowerCase()}. Please contact administration.`,
    });
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    logger.warn('Authentication failed: invalid password', { email, ip: req.ip });
    return invalidCredentials(res);
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

  return sendSuccess(res, {
    data: {
      token,
      user: serializeUser(user),
    },
  });
});

/**
 * Return currently authenticated user profile
 */
const getMe = asyncHandler(async (req, res) =>
  sendSuccess(res, {
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
  })
);

/**
 * Handle user logout and revoke session
 */
const logout = asyncHandler(async (req, res) => {
  await recordAuditLog({
    actorId: req.user.id,
    action: 'USER_LOGOUT',
    entity: 'USERS',
    entityId: req.user.id,
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Logged out successfully.' });
});

/**
 * Change authenticated user password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (userRes.rowCount === 0) {
    return sendError(res, {
      status: HTTP_STATUS.NOT_FOUND,
      code: 'USER_NOT_FOUND',
      message: 'User not found.',
    });
  }

  const isMatch = await comparePassword(currentPassword, userRes.rows[0].password_hash);
  if (!isMatch) {
    return sendError(res, {
      status: HTTP_STATUS.BAD_REQUEST,
      code: 'INVALID_CURRENT_PASSWORD',
      message: 'Current password does not match.',
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

  return sendSuccess(res, { message: 'Password changed successfully.' });
});

/**
 * Update authenticated user profile (Permitted personal attributes)
 */
const updateProfile = asyncHandler(async (req, res) => {
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

  const user = await findUserProfileById(req.user.id);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'PROFILE_UPDATED',
    entity: 'USERS',
    entityId: req.user.id,
    details: { newName: name ? name.trim() : undefined, newPhone: phone ? phone.trim() : undefined },
    ipAddress: req.ip,
  });

  return sendSuccess(res, {
    message: 'Profile updated successfully.',
    data: { user: serializeUser(user) },
  });
});

/**
 * Change authenticated user email with password verification
 */
const changeEmail = asyncHandler(async (req, res) => {
  const { newEmail, currentPassword } = req.body;
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  if (normalizedNewEmail === req.user.email.toLowerCase()) {
    return sendError(res, {
      status: HTTP_STATUS.BAD_REQUEST,
      code: 'SAME_EMAIL',
      message: 'New email address must be different from current email.',
    });
  }

  // 1. Verify user & password
  const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (userRes.rowCount === 0) {
    return sendError(res, {
      status: HTTP_STATUS.NOT_FOUND,
      code: 'USER_NOT_FOUND',
      message: 'User record not found.',
    });
  }

  const isMatch = await comparePassword(currentPassword, userRes.rows[0].password_hash);
  if (!isMatch) {
    return sendError(res, {
      status: HTTP_STATUS.BAD_REQUEST,
      code: 'INVALID_PASSWORD',
      message: 'Current password does not match.',
    });
  }

  // 2. Check for duplicate email in database
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [normalizedNewEmail, req.user.id]);
  if (existing.rowCount > 0) {
    return sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'This email address is already registered to another account.',
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

  const user = await findUserProfileById(req.user.id);

  return sendSuccess(res, {
    message: 'University email address updated successfully. Please use your new email for future logins.',
    data: { user: serializeUser(user) },
  });
});

module.exports = {
  login,
  getMe,
  logout,
  changePassword,
  updateProfile,
  changeEmail,
};
