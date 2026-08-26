const { query } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { buildFilters, buildUpdateSet } = require('../utils/sqlBuilder');

const courseNotFound = (res) =>
  sendError(res, {
    status: HTTP_STATUS.NOT_FOUND,
    code: 'COURSE_NOT_FOUND',
    message: 'Course not found.',
  });

/**
 * List all courses with filtering and faculty lead
 */
const getCourses = asyncHandler(async (req, res) => {
  const { department, semester, search } = req.query;

  // Faculty may narrow the listing down to the courses assigned to them
  const onlyMyCourses = req.user.role === ROLES.FACULTY && req.query.myCourses === 'true';

  const filters = buildFilters([
    { value: department, condition: (p) => `c.department = ${p}` },
    { value: semester ? parseInt(semester, 10) : undefined, condition: (p) => `c.semester = ${p}` },
    { value: search ? `%${search}%` : undefined, condition: (p) => `(c.code ILIKE ${p} OR c.name ILIKE ${p})` },
    { value: onlyMyCourses ? req.user.facultyId : undefined, condition: (p) => `c.faculty_id = ${p}` },
  ]);

  const coursesRes = await query(
    `SELECT c.id, c.code, c.name, c.credits, c.department, c.semester, c.created_at,
              f.id as faculty_id, f.employee_id as faculty_employee_id, fu.name as faculty_name,
              COUNT(DISTINCT e.id) as enrolled_count
       FROM courses c
       LEFT JOIN faculty f ON f.id = c.faculty_id
       LEFT JOIN users fu ON fu.id = f.user_id
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
       ${filters.clause()}
       GROUP BY c.id, f.id, fu.name
       ORDER BY c.code ASC`,
    filters.params
  );

  return sendSuccess(res, { data: { courses: coursesRes.rows } });
});

/**
 * Get detailed course information and enrolled student roster
 */
const getCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const courseRes = await query(
    `SELECT c.id, c.code, c.name, c.credits, c.department, c.semester, c.created_at, c.updated_at,
              f.id as faculty_id, f.employee_id, f.designation, fu.name as faculty_name, fu.email as faculty_email
       FROM courses c
       LEFT JOIN faculty f ON f.id = c.faculty_id
       LEFT JOIN users fu ON fu.id = f.user_id
       WHERE c.id = $1`,
    [id]
  );

  if (courseRes.rowCount === 0) {
    return courseNotFound(res);
  }

  const course = courseRes.rows[0];

  // Enrolled student roster
  const rosterRes = await query(
    `SELECT e.id as enrollment_id, e.academic_year, e.status as enrollment_status,
              s.id as student_id, s.roll_no, s.department as student_department, s.semester as student_semester,
              u.name as student_name, u.email as student_email
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       WHERE e.course_id = $1 AND e.status = 'ACTIVE'
       ORDER BY s.roll_no ASC`,
    [id]
  );

  return sendSuccess(res, {
    data: {
      course,
      roster: rosterRes.rows,
    },
  });
});

/**
 * Register new course (Admin only)
 */
const createCourse = asyncHandler(async (req, res) => {
  const { code, name, credits, department, semester, facultyId } = req.body;

  const codeCheck = await query('SELECT id FROM courses WHERE LOWER(code) = LOWER($1)', [code]);
  if (codeCheck.rowCount > 0) {
    return sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      code: 'COURSE_CODE_EXISTS',
      message: 'A course with this code already exists.',
    });
  }

  const insertRes = await query(
    `INSERT INTO courses (code, name, credits, department, semester, faculty_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [code.toUpperCase(), name, credits, department, semester, facultyId || null]
  );
  const newCourse = insertRes.rows[0];

  await recordAuditLog({
    actorId: req.user.id,
    action: 'COURSE_CREATED',
    entity: 'COURSES',
    entityId: newCourse.id,
    details: { code: newCourse.code, name: newCourse.name, credits: newCourse.credits },
    ipAddress: req.ip,
  });

  return sendCreated(res, {
    message: 'Course created successfully.',
    data: { course: newCourse },
  });
});

/**
 * Update course details or faculty assignment (Admin only)
 */
const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, credits, department, semester, facultyId } = req.body;

  const courseCheck = await query('SELECT id, code FROM courses WHERE id = $1', [id]);
  if (courseCheck.rowCount === 0) {
    return courseNotFound(res);
  }

  const courseSet = buildUpdateSet({
    name: name || undefined,
    credits,
    department: department || undefined,
    semester,
    faculty_id: facultyId,
  });

  await query(`UPDATE courses SET ${courseSet.clause} WHERE id = $${courseSet.nextIndex}`, [...courseSet.params, id]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'COURSE_UPDATED',
    entity: 'COURSES',
    entityId: id,
    details: { updates: req.body },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Course updated successfully.' });
});

/**
 * Delete a course (Admin only)
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const courseCheck = await query('SELECT code FROM courses WHERE id = $1', [id]);
  if (courseCheck.rowCount === 0) {
    return courseNotFound(res);
  }

  const { code } = courseCheck.rows[0];

  await query('DELETE FROM courses WHERE id = $1', [id]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'COURSE_DELETED',
    entity: 'COURSES',
    entityId: id,
    details: { code },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: `Course ${code} deleted successfully.` });
});

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
