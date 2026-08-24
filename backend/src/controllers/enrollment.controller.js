const { query, withTransaction } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Enroll single student in a course
 */
const createEnrollment = async (req, res, next) => {
  try {
    const { studentId, courseId, academicYear } = req.body;

    const existing = await query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND academic_year = $3',
      [studentId, courseId, academicYear]
    );

    if (existing.rowCount > 0) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: { code: 'ALREADY_ENROLLED', message: 'Student is already enrolled in this course for this academic year.' },
      });
    }

    const insertRes = await query(
      `INSERT INTO enrollments (student_id, course_id, academic_year, status)
       VALUES ($1, $2, $3, 'ACTIVE') RETURNING *`,
      [studentId, courseId, academicYear]
    );

    await recordAuditLog({
      actorId: req.user.id,
      action: 'ENROLLMENT_CREATED',
      entity: 'ENROLLMENTS',
      entityId: insertRes.rows[0].id,
      details: { studentId, courseId, academicYear },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { enrollment: insertRes.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk enroll students into courses
 */
const bulkEnroll = async (req, res, next) => {
  try {
    const { studentIds, courseIds, academicYear } = req.body;

    const count = await withTransaction(async (client) => {
      let enrolledCount = 0;
      for (const sId of studentIds) {
        for (const cId of courseIds) {
          const res = await client.query(
            `INSERT INTO enrollments (student_id, course_id, academic_year, status)
             VALUES ($1, $2, $3, 'ACTIVE')
             ON CONFLICT (student_id, course_id, academic_year) DO NOTHING RETURNING id`,
            [sId, cId, academicYear]
          );
          if (res.rowCount > 0) enrolledCount++;
        }
      }
      return enrolledCount;
    });

    await recordAuditLog({
      actorId: req.user.id,
      action: 'BULK_ENROLLMENT_CREATED',
      entity: 'ENROLLMENTS',
      details: { students: studentIds.length, courses: courseIds.length, newEnrollments: count },
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `Enrolled successfully (${count} new active enrollments created).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Drop an enrollment
 */
const deleteEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM enrollments WHERE id = $1', [id]);

    await recordAuditLog({
      actorId: req.user.id,
      action: 'ENROLLMENT_DROPPED',
      entity: 'ENROLLMENTS',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Enrollment dropped successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnrollment,
  bulkEnroll,
  deleteEnrollment,
};
