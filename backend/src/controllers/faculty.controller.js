const { query, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES, USER_STATUS } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * List all faculty members with assigned course metrics
 */
const getFacultyList = async (req, res, next) => {
  try {
    const { department, search } = req.query;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (department) {
      conditions.push(`f.department = $${pIdx++}`);
      params.push(department);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR f.employee_id ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const facultyRes = await query(
      `SELECT f.id, f.employee_id, f.department, f.designation, f.created_at,
              u.id as user_id, u.name, u.email, u.status,
              COUNT(c.id) as assigned_courses_count
       FROM faculty f
       JOIN users u ON u.id = f.user_id
       LEFT JOIN courses c ON c.faculty_id = f.id
       ${whereClause}
       GROUP BY f.id, u.id
       ORDER BY u.name ASC`,
      params
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        faculty: facultyRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get faculty member profile and assigned courses
 */
const getFacultyById = async (req, res, next) => {
  try {
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'FACULTY_NOT_FOUND', message: 'Faculty profile not found.' },
      });
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        faculty,
        assignedCourses: coursesRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new faculty member (Admin only)
 */
const createFaculty = async (req, res, next) => {
  try {
    const { name, email, password = 'Faculty@123', employeeId, department, designation } = req.body;

    const result = await withTransaction(async (client) => {
      // Check email uniqueness
      const existingEmail = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existingEmail.rowCount > 0) {
        const err = new Error('A user with this email address already exists.');
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }

      // Check employee ID uniqueness
      const existingEmp = await client.query('SELECT id FROM faculty WHERE LOWER(employee_id) = LOWER($1)', [employeeId]);
      if (existingEmp.rowCount > 0) {
        const err = new Error('A faculty member with this employee ID already exists.');
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }

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

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Faculty member created successfully.',
      data: { faculty: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update faculty information (Admin only)
 */
const updateFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, department, designation, status } = req.body;

    const facultyCheck = await query('SELECT user_id FROM faculty WHERE id = $1', [id]);
    if (facultyCheck.rowCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: 'FACULTY_NOT_FOUND', message: 'Faculty profile not found.' },
      });
    }

    const userId = facultyCheck.rows[0].user_id;

    await withTransaction(async (client) => {
      if (name || email || status) {
        const uUpdates = [];
        const uParams = [];
        let uIdx = 1;

        if (name) {
          uUpdates.push(`name = $${uIdx++}`);
          uParams.push(name);
        }
        if (email) {
          const emailCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [email, userId]);
          if (emailCheck.rowCount > 0) {
            const err = new Error('Email address is already in use.');
            err.statusCode = HTTP_STATUS.CONFLICT;
            throw err;
          }
          uUpdates.push(`email = $${uIdx++}`);
          uParams.push(email.toLowerCase());
        }
        if (status) {
          uUpdates.push(`status = $${uIdx++}`);
          uParams.push(status);
        }

        uUpdates.push('updated_at = NOW()');
        uParams.push(userId);

        await client.query(`UPDATE users SET ${uUpdates.join(', ')} WHERE id = $${uIdx}`, uParams);
      }

      if (department || designation) {
        const fUpdates = [];
        const fParams = [];
        let fIdx = 1;

        if (department) {
          fUpdates.push(`department = $${fIdx++}`);
          fParams.push(department);
        }
        if (designation) {
          fUpdates.push(`designation = $${fIdx++}`);
          fParams.push(designation);
        }

        fUpdates.push('updated_at = NOW()');
        fParams.push(id);

        await client.query(`UPDATE faculty SET ${fUpdates.join(', ')} WHERE id = $${fIdx}`, fParams);
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

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Faculty profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacultyList,
  getFacultyById,
  createFaculty,
  updateFaculty,
};
