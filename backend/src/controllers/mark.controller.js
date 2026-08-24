const { query, withTransaction } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Fetch marks for a course and assessment or student
 */
const getMarks = async (req, res, next) => {
  try {
    const { courseId, assessment, studentId } = req.query;

    // RBAC: If student, return only their own marks
    if (req.user.role === ROLES.STUDENT) {
      const studentMarks = await query(
        `SELECT m.id, m.assessment, m.score, m.max_score, m.created_at, m.updated_at,
                ROUND((m.score / m.max_score) * 100, 1) as percentage,
                c.id as course_id, c.code as course_code, c.name as course_name, c.credits,
                u.name as entered_by_name
         FROM marks m
         JOIN enrollments e ON e.id = m.enrollment_id
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = m.entered_by
         WHERE e.student_id = $1 ${courseId ? 'AND c.id = $2' : ''}
         ORDER BY c.code ASC, m.assessment ASC`,
        courseId ? [req.user.studentId, courseId] : [req.user.studentId]
      );

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          marks: studentMarks.rows,
        },
      });
    }

    if (!courseId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'MISSING_COURSE_ID', message: 'courseId query parameter is required.' },
      });
    }

    // Fetch roster with any marks entered for this assessment
    const marksRes = await query(
      `SELECT e.id as enrollment_id, e.academic_year,
              s.id as student_id, s.roll_no, s.department, s.semester,
              u.name as student_name, u.email as student_email,
              m.id as mark_id, m.assessment, m.score, m.max_score, m.updated_at
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN marks m ON m.enrollment_id = e.id ${assessment ? 'AND m.assessment = $2' : ''}
       WHERE e.course_id = $1 AND e.status = 'ACTIVE'
       ORDER BY s.roll_no ASC`,
      assessment ? [courseId, assessment] : [courseId]
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        courseId,
        assessment: assessment || null,
        records: marksRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk submit/update assessment marks
 */
const recordMarks = async (req, res, next) => {
  try {
    const { courseId, assessment, maxScore, records } = req.body;

    // RBAC: If faculty, check that course is assigned to them
    if (req.user.role === ROLES.FACULTY) {
      const courseCheck = await query('SELECT faculty_id FROM courses WHERE id = $1', [courseId]);
      if (courseCheck.rowCount === 0 || courseCheck.rows[0].faculty_id !== req.user.facultyId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_COURSE_FACULTY',
            message: 'You are only authorized to enter marks for your assigned courses.',
          },
        });
      }
    }

    await withTransaction(async (client) => {
      for (const rec of records) {
        await client.query(
          `INSERT INTO marks (enrollment_id, assessment, score, max_score, entered_by, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (enrollment_id, assessment)
           DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score, entered_by = EXCLUDED.entered_by, updated_at = NOW()`,
          [rec.enrollmentId, assessment, rec.score, maxScore, req.user.id]
        );
      }
    });

    await recordAuditLog({
      actorId: req.user.id,
      action: 'MARKS_RECORDED',
      entity: 'MARKS',
      entityId: courseId,
      details: { courseId, assessment, maxScore, count: records.length },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Marks for ${assessment} (${records.length} students) saved successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assessment summary & statistics for a course
 */
const getCourseMarkStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const statsRes = await query(
      `SELECT 
         m.assessment,
         m.max_score,
         COUNT(m.id) as student_count,
         ROUND(AVG(m.score), 2) as average_score,
         MIN(m.score) as min_score,
         MAX(m.score) as max_score,
         ROUND(AVG(m.score) * 100.0 / m.max_score, 1) as average_percentage,
         COUNT(m.id) FILTER (WHERE (m.score / m.max_score) >= 0.5) as passed_count,
         ROUND(COUNT(m.id) FILTER (WHERE (m.score / m.max_score) >= 0.5) * 100.0 / NULLIF(COUNT(m.id), 0), 1) as pass_rate
       FROM marks m
       JOIN enrollments e ON e.id = m.enrollment_id
       WHERE e.course_id = $1
       GROUP BY m.assessment, m.max_score
       ORDER BY m.assessment ASC`,
      [courseId]
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        courseId,
        assessments: statsRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMarks,
  recordMarks,
  getCourseMarkStats,
};
