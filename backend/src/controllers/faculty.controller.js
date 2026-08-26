const { query, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES, USER_STATUS } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { buildFilters, buildUpdateSet } = require('../utils/sqlBuilder');
const { assertUnique } = require('../utils/uniqueness');

const facultyNotFound = (res) =>
  sendError(res, {
    status: HTTP_STATUS.NOT_FOUND,
    code: 'FACULTY_NOT_FOUND',
    message: 'Faculty profile not found.',
  });

/**
 * List all faculty members with assigned course metrics
 */
const getFacultyList = asyncHandler(async (req, res) => {
  const { department, search } = req.query;

  const filters = buildFilters([
    { value: department, condition: (p) => `f.department = ${p}` },
    {
      value: search ? `%${search}%` : undefined,
      condition: (p) => `(u.name ILIKE ${p} OR u.email ILIKE ${p} OR f.employee_id ILIKE ${p})`,
    },
  ]);

  const facultyRes = await query(
    `SELECT f.id, f.employee_id, f.department, f.designation, f.created_at,
              u.id as user_id, u.name, u.email, u.status,
              COUNT(c.id) as assigned_courses_count
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       LEFT JOIN courses c ON c.faculty_id = f.id
       ${filters.clause()}
       GROUP BY f.id, u.id
       ORDER BY u.name ASC`,
    filters.params
  );

  return sendSuccess(res, { data: { faculty: facultyRes.rows } });
});

/**
 * Get faculty member profile and assigned courses
 */
const getFacultyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const facultyRes = await query(
    `SELECT f.id, f.employee_id, f.department, f.designation, f.created_at, f.updated_at,
              u.id as user_id, u.name, u.email, u.status
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       WHERE f.id = $1`,
    [id]
  );

  if (facultyRes.rowCount === 0) {
    return facultyNotFound(res);
  }

  const faculty = facultyRes.rows[0];

  // Assigned courses
  const coursesRes = await query(
    `SELECT c.id, c.code, c.name, c.credits, c.department, c.semester,
              COUNT(e.id) as enrolled_students_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
       WHERE c.faculty_id = $1
       GROUP BY c.id
       ORDER BY c.code ASC`,
    [id]
  );

  return sendSuccess(res, {
    data: {
      faculty,
      assignedCourses: coursesRes.rows,
    },
  });
});

/**
 * Register new faculty member (Admin only)
 */
const createFaculty = asyncHandler(async (req, res) => {
  const { name, email, password = 'Faculty@123', employeeId, department, designation } = req.body;

  const result = await withTransaction(async (client) => {
    await assertUnique(client.query.bind(client), {
      table: 'users',
      column: 'email',
      value: email,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'A user with this email address already exists.',
    });

    await assertUnique(client.query.bind(client), {
      table: 'faculty',
      column: 'employee_id',
      value: employeeId,
      code: 'EMPLOYEE_ID_EXISTS',
      message: 'A faculty member with this employee ID already exists.',
    });

    const passwordHash = await hashPassword(password);

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email.toLowerCase(), passwordHash, ROLES.FACULTY, USER_STATUS.ACTIVE]
    );
    const userId = userRes.rows[0].id;

    const facultyRes = await client.query(
      `INSERT INTO faculty (user_id, employee_id, department, designation)
         VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, employeeId.toUpperCase(), department, designation]
    );

    return { ...facultyRes.rows[0], name, email: email.toLowerCase(), status: USER_STATUS.ACTIVE };
  });

  await recordAuditLog({
    actorId: req.user.id,
    action: 'FACULTY_CREATED',
    entity: 'FACULTY',
    entityId: result.id,
    details: { employeeId: result.employee_id, email: result.email, department: result.department },
    ipAddress: req.ip,
  });

  return sendCreated(res, {
    message: 'Faculty member created successfully.',
    data: { faculty: result },
  });
});

/**
 * Update faculty information (Admin only)
 */
const updateFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, department, designation, status } = req.body;

  const facultyCheck = await query('SELECT user_id FROM faculty WHERE id = $1', [id]);
  if (facultyCheck.rowCount === 0) {
    return facultyNotFound(res);
  }

  const userId = facultyCheck.rows[0].user_id;

  await withTransaction(async (client) => {
    if (name || email || status) {
      if (email) {
        await assertUnique(client.query.bind(client), {
          table: 'users',
          column: 'email',
          value: email,
          excludeId: userId,
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email address is already in use.',
        });
      }

      const userSet = buildUpdateSet({
        name: name || undefined,
        email: email ? email.toLowerCase() : undefined,
        status: status || undefined,
      });

      await client.query(`UPDATE users SET ${userSet.clause} WHERE id = $${userSet.nextIndex}`, [
        ...userSet.params,
        userId,
      ]);
    }

    const facultySet = buildUpdateSet({
      department: department || undefined,
      designation: designation || undefined,
    });

    if (facultySet.hasUpdates) {
      await client.query(`UPDATE faculty SET ${facultySet.clause} WHERE id = $${facultySet.nextIndex}`, [
        ...facultySet.params,
        id,
      ]);
    }
  });

  await recordAuditLog({
    actorId: req.user.id,
    action: 'FACULTY_UPDATED',
    entity: 'FACULTY',
    entityId: id,
    details: { updates: req.body },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Faculty profile updated successfully.' });
});

module.exports = {
  getFacultyList,
  getFacultyById,
  createFaculty,
  updateFaculty,
};
