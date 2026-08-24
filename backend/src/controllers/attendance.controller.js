const { query, withTransaction } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Fetch class roster with attendance status for a specific course and date
 */
const getAttendance = async (req, res, next) => {
  try {
    const { courseId, date, studentId } = req.query;

    // RBAC: If student, enforce viewing own attendance
    if (req.user.role === ROLES.STUDENT) {
      const studentAttendance = await query(
        `SELECT a.id, a.date, a.status, a.created_at,
                c.id as course_id, c.code as course_code, c.name as course_name,
                u.name as marked_by_name
         FROM attendance a
         JOIN enrollments e ON e.id = a.enrollment_id
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = a.marked_by
         WHERE e.student_id = $1 ${courseId ? 'AND c.id = $2' : ''}
         ORDER BY a.date DESC`,
        courseId ? [req.user.studentId, courseId] : [req.user.studentId]
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          records: studentAttendance.rows,
        },
      });
    }

    if (!courseId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'MISSING_COURSE_ID', message: 'courseId query parameter is required.' },
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch full active roster for this course, joining any existing attendance on that date
    const rosterRes = await query(
      `SELECT e.id as enrollment_id, e.academic_year,
              s.id as student_id, s.roll_no, s.department, s.semester,
              u.name as student_name, u.email as student_email,
              a.id as attendance_id, a.status as attendance_status, a.updated_at
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = $2
       WHERE e.course_id = $1 AND e.status = 'ACTIVE'
       ORDER BY s.roll_no ASC`,
      [courseId, targetDate]
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        courseId,
        date: targetDate,
        records: rosterRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk submit/update daily attendance
 */
const recordAttendance = async (req, res, next) => {
  try {
    const { courseId, date, records } = req.body;

    // RBAC: If faculty, check that this course is assigned to them
    if (req.user.role === ROLES.FACULTY) {
      const courseCheck = await query('SELECT faculty_id FROM courses WHERE id = $1', [courseId]);
      if (courseCheck.rowCount === 0 || courseCheck.rows[0].faculty_id !== req.user.facultyId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_COURSE_FACULTY',
            message: 'You are only authorized to submit attendance for your assigned courses.',
          },
        });
      }
    }

    await withTransaction(async (client) => {
      for (const rec of records) {
        await client.query(
          `INSERT INTO attendance (enrollment_id, date, status, marked_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (enrollment_id, date)
           DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = NOW()`,
          [rec.enrollmentId, date, rec.status, req.user.id]
        );
      }
    });

    await recordAuditLog({
      actorId: req.user.id,
      action: 'ATTENDANCE_RECORDED',
      entity: 'ATTENDANCE',
      entityId: courseId,
      details: { courseId, date, count: records.length },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Attendance for ${records.length} students recorded successfully for ${date}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Course attendance aggregated summary
 */
const getCourseAttendanceSummary = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const summaryRes = await query(
      `SELECT 
         s.roll_no, u.name as student_name,
         COUNT(a.id) as total_sessions,
         COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as present_count,
         COUNT(a.id) FILTER (WHERE a.status = 'ABSENT') as absent_count,
         COUNT(a.id) FILTER (WHERE a.status = 'LATE') as late_count,
         ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as attendance_percentage
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance a ON a.enrollment_id = e.id
       WHERE e.course_id = $1 AND e.status = 'ACTIVE'
       GROUP BY s.id, u.id, s.roll_no, u.name
       ORDER BY s.roll_no ASC`,
      [courseId]
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        courseId,
        summary: summaryRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  recordAttendance,
  getCourseAttendanceSummary,
};
