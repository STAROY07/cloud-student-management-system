const { query, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES, USER_STATUS } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Get paginated students with search and filtering
 */
const getStudents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { search, department, semester, status } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR s.roll_no ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department) {
      conditions.push(`s.department = $${paramIndex}`);
      params.push(department);
      paramIndex++;
    }

    if (semester) {
      conditions.push(`s.semester = $${paramIndex}`);
      params.push(parseInt(semester, 10));
      paramIndex++;
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countRes = await query(
      `SELECT COUNT(s.id) as total
       FROM students s
       JOIN users u ON u.id = s.user_id
       ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countRes.rows[0].total, 10);

    // Data query
    const dataParams = [...params, limit, offset];
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
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        students: dataRes.rows,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed student profile with enrollments, attendance, and marks
 */
const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // RBAC: If student, ensure they are requesting their own profile
    if (req.user.role === ROLES.STUDENT && req.user.studentId !== id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: 'FORBIDDEN_RECORD_ACCESS',
          message: 'Students are only permitted to view their own academic profile.',
        },
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'STUDENT_NOT_FOUND', message: 'Student record not found.' },
      });
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        student,
        enrollments: enrollmentsRes.rows,
        attendance: attendanceRes.rows,
        marks: marksRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new student with associated user account (Admin only)
 */
const createStudent = async (req, res, next) => {
  try {
    const { name, email, phone, password, rollNo, department, semester, admissionYear } = req.body;

    const result = await withTransaction(async (client) => {
      // Check for email collision
      const existingEmail = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existingEmail.rowCount > 0) {
        const err = new Error('A user with this university email address already exists.');
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.code = 'EMAIL_ALREADY_EXISTS';
        throw err;
      }

      // Check for roll number collision
      const existingRoll = await client.query('SELECT id FROM students WHERE LOWER(roll_no) = LOWER($1)', [rollNo]);
      if (existingRoll.rowCount > 0) {
        const err = new Error('A student with this roll number already exists.');
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.code = 'ROLL_NUMBER_EXISTS';
        throw err;
      }

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

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Student registered successfully. Temporary password created.',
      data: { student: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student profile and metadata (Admin only)
 */
const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, semester, admissionYear, status } = req.body;

    const studentCheck = await query('SELECT user_id FROM students WHERE id = $1', [id]);
    if (studentCheck.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'STUDENT_NOT_FOUND', message: 'Student record not found.' },
      });
    }

    const userId = studentCheck.rows[0].user_id;

    await withTransaction(async (client) => {
      // Update User attributes if provided
      if (name || email || status) {
        const userUpdates = [];
        const userParams = [];
        let pIdx = 1;

        if (name) {
          userUpdates.push(`name = $${pIdx++}`);
          userParams.push(name);
        }
        if (email) {
          // Check for collision
          const emailCollision = await client.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
            [email, userId]
          );
          if (emailCollision.rowCount > 0) {
            const err = new Error('Email is already in use by another account.');
            err.statusCode = HTTP_STATUS.CONFLICT;
            throw err;
          }
          userUpdates.push(`email = $${pIdx++}`);
          userParams.push(email.toLowerCase());
        }
        if (status) {
          userUpdates.push(`status = $${pIdx++}`);
          userParams.push(status);
        }

        userUpdates.push('updated_at = NOW()');
        userParams.push(userId);

        await client.query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${pIdx}`,
          userParams
        );
      }

      // Update Student attributes if provided
      if (phone !== undefined || department || semester !== undefined || admissionYear !== undefined) {
        const stuUpdates = [];
        const stuParams = [];
        let sIdx = 1;

        if (phone !== undefined) {
          stuUpdates.push(`phone = $${sIdx++}`);
          stuParams.push(phone ? phone.trim() : null);
        }
        if (department) {
          stuUpdates.push(`department = $${sIdx++}`);
          stuParams.push(department);
        }
        if (semester !== undefined) {
          stuUpdates.push(`semester = $${sIdx++}`);
          stuParams.push(semester);
        }
        if (admissionYear !== undefined) {
          stuUpdates.push(`admission_year = $${sIdx++}`);
          stuParams.push(admissionYear);
        }

        stuUpdates.push('updated_at = NOW()');
        stuParams.push(id);

        await client.query(
          `UPDATE students SET ${stuUpdates.join(', ')} WHERE id = $${sIdx}`,
          stuParams
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Student profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate or remove student (Admin only)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const studentCheck = await query('SELECT user_id, roll_no FROM students WHERE id = $1', [id]);
    if (studentCheck.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'STUDENT_NOT_FOUND', message: 'Student record not found.' },
      });
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Student ${rollNo} deactivated successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};
