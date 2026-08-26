const { query, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES, USER_STATUS } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { buildFilters, buildUpdateSet } = require('../utils/sqlBuilder');
const { assertUnique } = require('../utils/uniqueness');

const studentNotFound = (res) =>
  sendError(res, {
    status: HTTP_STATUS.NOT_FOUND,
    code: 'STUDENT_NOT_FOUND',
    message: 'Student record not found.',
  });

/**
 * Get paginated students with search and filtering
 */
const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { search, department, semester, status } = req.query;

  const filters = buildFilters([
    {
      value: search ? `%${search}%` : undefined,
      condition: (p) => `(u.name ILIKE ${p} OR u.email ILIKE ${p} OR s.roll_no ILIKE ${p})`,
    },
    { value: department, condition: (p) => `s.department = ${p}` },
    { value: semester ? parseInt(semester, 10) : undefined, condition: (p) => `s.semester = ${p}` },
    { value: status, condition: (p) => `u.status = ${p}` },
  ]);

  const whereClause = filters.clause();

  // Total count query
  const countRes = await query(
    `SELECT COUNT(s.id) as total
       FROM students s
       JOIN users u ON u.id = s.user_id
       ${whereClause}`,
    filters.params
  );
  const totalRecords = parseInt(countRes.rows[0].total, 10);

  // Data query
  const dataRes = await query(
    `SELECT s.id, s.phone, s.roll_no, s.department, s.semester, s.admission_year, s.created_at,
              u.id as user_id, u.name, u.email, u.status, u.must_change_password,
              COUNT(DISTINCT e.id) as enrolled_courses_count
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'ACTIVE'
       ${whereClause}
       GROUP BY s.id, u.id
       ORDER BY s.roll_no ASC
       LIMIT $${filters.nextIndex} OFFSET $${filters.nextIndex + 1}`,
    [...filters.params, limit, offset]
  );

  return sendSuccess(res, {
    data: {
      students: dataRes.rows,
      pagination: buildPaginationMeta({ page, limit, totalRecords }),
    },
  });
});

/**
 * Get detailed student profile with enrollments, attendance, and marks
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // RBAC: If student, ensure they are requesting their own profile
  if (req.user.role === ROLES.STUDENT && req.user.studentId !== id) {
    return sendError(res, {
      status: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN_RECORD_ACCESS',
      message: 'Students are only permitted to view their own academic profile.',
    });
  }

  const studentRes = await query(
    `SELECT s.id, s.phone, s.roll_no, s.department, s.semester, s.admission_year, s.created_at, s.updated_at,
              u.id as user_id, u.name, u.email, u.status, u.must_change_password
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
    [id]
  );

  if (studentRes.rowCount === 0) {
    return studentNotFound(res);
  }

  const student = studentRes.rows[0];

  // Fetch student's course enrollments with course details & faculty lead
  const enrollmentsRes = await query(
    `SELECT e.id as enrollment_id, e.academic_year, e.status as enrollment_status,
              c.id as course_id, c.code as course_code, c.name as course_name, c.credits,
              fu.name as faculty_name
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN faculty f ON f.id = c.faculty_id
       LEFT JOIN users fu ON fu.id = f.user_id
       WHERE e.student_id = $1
       ORDER BY c.code ASC`,
    [id]
  );

  // Fetch attendance summary per enrollment
  const attendanceRes = await query(
    `SELECT a.id, a.enrollment_id, a.date, a.status, a.created_at,
              c.code as course_code, c.name as course_name
       FROM attendance a
       JOIN enrollments e ON e.id = a.enrollment_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1
       ORDER BY a.date DESC
       LIMIT 50`,
    [id]
  );

  // Fetch marks per enrollment
  const marksRes = await query(
    `SELECT m.id, m.enrollment_id, m.assessment, m.score, m.max_score, m.created_at,
              c.code as course_code, c.name as course_name
       FROM marks m
       JOIN enrollments e ON e.id = m.enrollment_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1
       ORDER BY c.code ASC, m.assessment ASC`,
    [id]
  );

  return sendSuccess(res, {
    data: {
      student,
      enrollments: enrollmentsRes.rows,
      attendance: attendanceRes.rows,
      marks: marksRes.rows,
    },
  });
});

/**
 * Register new student with associated user account (Admin only)
 */
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, phone, password, rollNo, department, semester, admissionYear } = req.body;

  const result = await withTransaction(async (client) => {
    await assertUnique(client.query.bind(client), {
      table: 'users',
      column: 'email',
      value: email,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'A user with this university email address already exists.',
    });

    await assertUnique(client.query.bind(client), {
      table: 'students',
      column: 'roll_no',
      value: rollNo,
      code: 'ROLL_NUMBER_EXISTS',
      message: 'A student with this roll number already exists.',
    });

    const passwordHash = await hashPassword(password);

    // 1. Create user with must_change_password: true
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, ROLES.STUDENT, USER_STATUS.ACTIVE, true]
    );
    const userId = userRes.rows[0].id;

    // 2. Create student profile with phone
    const studentRes = await client.query(
      `INSERT INTO students (user_id, phone, roll_no, department, semester, admission_year)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, phone ? phone.trim() : null, rollNo.toUpperCase().trim(), department, semester, admissionYear]
    );
    const student = studentRes.rows[0];

    return {
      ...student,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: true,
    };
  });

  // Record audit log (never logging password!)
  await recordAuditLog({
    actorId: req.user.id,
    action: 'STUDENT_CREATED',
    entity: 'STUDENTS',
    entityId: result.id,
    details: { rollNo: result.roll_no, email: result.email, phone: result.phone, department: result.department },
    ipAddress: req.ip,
  });

  return sendCreated(res, {
    message: 'Student registered successfully. Temporary password created.',
    data: { student: result },
  });
});

/**
 * Update student profile and metadata (Admin only)
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, department, semester, admissionYear, status } = req.body;

  const studentCheck = await query('SELECT user_id FROM students WHERE id = $1', [id]);
  if (studentCheck.rowCount === 0) {
    return studentNotFound(res);
  }

  const userId = studentCheck.rows[0].user_id;

  await withTransaction(async (client) => {
    // Update User attributes if provided
    if (name || email || status) {
      if (email) {
        await assertUnique(client.query.bind(client), {
          table: 'users',
          column: 'email',
          value: email,
          excludeId: userId,
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email is already in use by another account.',
        });
      }

      const userSet = buildUpdateSet({
        name: name || undefined,
        email: email ? email.toLowerCase() : undefined,
        status: status || undefined,
      });

      await client.query(
        `UPDATE users SET ${userSet.clause} WHERE id = $${userSet.nextIndex}`,
        [...userSet.params, userId]
      );
    }

    // Update Student attributes if provided
    const studentSet = buildUpdateSet({
      phone: phone === undefined ? undefined : phone ? phone.trim() : null,
      department: department || undefined,
      semester,
      admission_year: admissionYear,
    });

    if (studentSet.hasUpdates) {
      await client.query(
        `UPDATE students SET ${studentSet.clause} WHERE id = $${studentSet.nextIndex}`,
        [...studentSet.params, id]
      );
    }
  });

  await recordAuditLog({
    actorId: req.user.id,
    action: 'STUDENT_UPDATED',
    entity: 'STUDENTS',
    entityId: id,
    details: { updates: req.body },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Student profile updated successfully.' });
});

/**
 * Deactivate or remove student (Admin only)
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const studentCheck = await query('SELECT user_id, roll_no FROM students WHERE id = $1', [id]);
  if (studentCheck.rowCount === 0) {
    return studentNotFound(res);
  }

  const { user_id: userId, roll_no: rollNo } = studentCheck.rows[0];

  // Soft deactivate student user
  await query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [USER_STATUS.INACTIVE, userId]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'STUDENT_DEACTIVATED',
    entity: 'STUDENTS',
    entityId: id,
    details: { rollNo },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: `Student ${rollNo} deactivated successfully.` });
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};
