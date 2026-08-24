const { query } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * List all courses with filtering and faculty lead
 */
const getCourses = async (req, res, next) => {
  try {
    const { department, semester, search } = req.query;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (department) {
      conditions.push(`c.department = $${pIdx++}`);
      params.push(department);
    }

    if (semester) {
      conditions.push(`c.semester = $${pIdx++}`);
      params.push(parseInt(semester, 10));
    }

    if (search) {
      conditions.push(`(c.code ILIKE $${pIdx} OR c.name ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    // If logged in as Faculty and query flag is given, allow filtering to assigned courses
    if (req.user.role === ROLES.FACULTY && req.query.myCourses === 'true') {
      conditions.push(`c.faculty_id = $${pIdx++}`);
      params.push(req.user.facultyId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const coursesRes = await query(
      `SELECT c.id, c.code, c.name, c.credits, c.department, c.semester, c.created_at,
              f.id as faculty_id, f.employee_id as faculty_employee_id, fu.name as faculty_name,
              COUNT(DISTINCT e.id) as enrolled_count
       FROM courses c
       LEFT JOIN faculty f ON f.id = c.faculty_id
       LEFT JOIN users fu ON fu.id = f.user_id
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
       ${whereClause}
       GROUP BY c.id, f.id, fu.name
       ORDER BY c.code ASC`,
      params
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        courses: coursesRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed course information and enrolled student roster
 */
const getCourseById = async (req, res, next) => {
  try {
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Course not found.' },
      });
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        course,
        roster: rosterRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new course (Admin only)
 */
const createCourse = async (req, res, next) => {
  try {
    const { code, name, credits, department, semester, facultyId } = req.body;

    const codeCheck = await query('SELECT id FROM courses WHERE LOWER(code) = LOWER($1)', [code]);
    if (codeCheck.rowCount > 0) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: { code: 'COURSE_CODE_EXISTS', message: 'A course with this code already exists.' },
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

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Course created successfully.',
      data: { course: newCourse },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update course details or faculty assignment (Admin only)
 */
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, credits, department, semester, facultyId } = req.body;

    const courseCheck = await query('SELECT id, code FROM courses WHERE id = $1', [id]);
    if (courseCheck.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Course not found.' },
      });
    }

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (name) {
      updates.push(`name = $${pIdx++}`);
      params.push(name);
    }
    if (credits !== undefined) {
      updates.push(`credits = $${pIdx++}`);
      params.push(credits);
    }
    if (department) {
      updates.push(`department = $${pIdx++}`);
      params.push(department);
    }
    if (semester !== undefined) {
      updates.push(`semester = $${pIdx++}`);
      params.push(semester);
    }
    if (facultyId !== undefined) {
      updates.push(`faculty_id = $${pIdx++}`);
      params.push(facultyId);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await query(`UPDATE courses SET ${updates.join(', ')} WHERE id = $${pIdx}`, params);

    await recordAuditLog({
      actorId: req.user.id,
      action: 'COURSE_UPDATED',
      entity: 'COURSES',
      entityId: id,
      details: { updates: req.body },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Course updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a course (Admin only)
 */
const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const courseCheck = await query('SELECT code FROM courses WHERE id = $1', [id]);
    if (courseCheck.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Course not found.' },
      });
    }

    const code = courseCheck.rows[0].code;

    await query('DELETE FROM courses WHERE id = $1', [id]);

    await recordAuditLog({
      actorId: req.user.id,
      action: 'COURSE_DELETED',
      entity: 'COURSES',
      entityId: id,
      details: { code },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Course ${code} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
