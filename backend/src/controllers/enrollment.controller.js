const { query, withTransaction } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const HTTP_STATUS = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

/**
 * Enroll single student in a course
 */
const createEnrollment = asyncHandler(async (req, res) => {
  const { studentId, courseId, academicYear } = req.body;

  const existing = await query(
    'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND academic_year = $3',
    [studentId, courseId, academicYear]
  );

  if (existing.rowCount > 0) {
    return sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      code: 'ALREADY_ENROLLED',
      message: 'Student is already enrolled in this course for this academic year.',
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

  return sendCreated(res, {
    message: 'Student enrolled successfully.',
    data: { enrollment: insertRes.rows[0] },
  });
});

/**
 * Bulk enroll students into courses
 */
const bulkEnroll = asyncHandler(async (req, res) => {
  const { studentIds, courseIds, academicYear } = req.body;

  const count = await withTransaction(async (client) => {
    let enrolledCount = 0;
    for (const sId of studentIds) {
      for (const cId of courseIds) {
        const insertRes = await client.query(
          `INSERT INTO enrollments (student_id, course_id, academic_year, status)
             VALUES ($1, $2, $3, 'ACTIVE')
             ON CONFLICT (student_id, course_id, academic_year) DO NOTHING RETURNING id`,
          [sId, cId, academicYear]
        );
        if (insertRes.rowCount > 0) enrolledCount++;
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

  return sendCreated(res, {
    message: `Enrolled successfully (${count} new active enrollments created).`,
  });
});

/**
 * Drop an enrollment
 */
const deleteEnrollment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM enrollments WHERE id = $1', [id]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'ENROLLMENT_DROPPED',
    entity: 'ENROLLMENTS',
    entityId: id,
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Enrollment dropped successfully.' });
});

module.exports = {
  createEnrollment,
  bulkEnroll,
  deleteEnrollment,
};
