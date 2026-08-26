const { query } = require('../config/db');
const { recordAuditLog } = require('../middleware/audit.middleware');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { buildUpdateSet, toSnakeCase } = require('../utils/sqlBuilder');
const { canManageCourse } = require('../utils/courseAccess');

const examNotFound = (res) =>
  sendError(res, {
    status: HTTP_STATUS.NOT_FOUND,
    code: 'EXAM_NOT_FOUND',
    message: 'Exam record not found.',
  });

/**
 * Get exams list filtered by role & course enrollment
 */
const getExams = asyncHandler(async (req, res) => {
  const { role, studentId, facultyId } = req.user;
  const { courseId, status } = req.query;

  let sql = `
      SELECT ex.id, ex.course_id, ex.title, ex.exam_type, ex.exam_date,
             ex.start_time, ex.end_time, ex.duration_minutes, ex.room,
             ex.semester, ex.academic_year, ex.instructions, ex.status,
             ex.created_at, ex.updated_at,
             c.code as course_code, c.name as course_name, c.credits,
             fu.name as faculty_name
      FROM exams ex
      JOIN courses c ON c.id = ex.course_id
      LEFT JOIN faculty f ON f.id = c.faculty_id
      LEFT JOIN users fu ON fu.id = f.user_id
    `;
  const params = [];

  if (role === ROLES.STUDENT) {
    sql += `
        JOIN enrollments e ON e.course_id = c.id
        WHERE e.student_id = $1 AND e.status = 'ACTIVE'
      `;
    params.push(studentId);
  } else if (role === ROLES.FACULTY) {
    sql += ` WHERE (c.faculty_id = $1 OR ex.created_by = $2)`;
    params.push(facultyId, req.user.id);
  }

  const scoped = params.length > 0;
  const conditions = [];

  if (courseId) {
    params.push(courseId);
    conditions.push(`ex.course_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`ex.status = $${params.length}`);
  }

  if (conditions.length > 0) {
    sql += scoped ? ` AND ${conditions.join(' AND ')}` : ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY ex.exam_date ASC, ex.start_time ASC`;

  const result = await query(sql, params);

  return sendSuccess(res, { data: { exams: result.rows } });
});

/**
 * Get upcoming nearest exams for user
 */
const getUpcomingExams = asyncHandler(async (req, res) => {
  const { role, studentId, facultyId } = req.user;

  let sql = `
      SELECT ex.id, ex.course_id, ex.title, ex.exam_type, ex.exam_date,
             ex.start_time, ex.end_time, ex.duration_minutes, ex.room,
             ex.semester, ex.academic_year, ex.instructions, ex.status,
             c.code as course_code, c.name as course_name, c.credits,
             fu.name as faculty_name
      FROM exams ex
      JOIN courses c ON c.id = ex.course_id
      LEFT JOIN faculty f ON f.id = c.faculty_id
      LEFT JOIN users fu ON fu.id = f.user_id
    `;
  const params = [];

  if (role === ROLES.STUDENT) {
    sql += `
        JOIN enrollments e ON e.course_id = c.id
        WHERE e.student_id = $1 AND e.status = 'ACTIVE' AND ex.status != 'CANCELLED'
      `;
    params.push(studentId);
  } else if (role === ROLES.FACULTY) {
    sql += ` WHERE (c.faculty_id = $1 OR ex.created_by = $2) AND ex.status != 'CANCELLED'`;
    params.push(facultyId, req.user.id);
  } else {
    sql += ` WHERE ex.status != 'CANCELLED'`;
  }

  sql += ` ORDER BY ex.exam_date ASC, ex.start_time ASC LIMIT 6`;

  const result = await query(sql, params);

  return sendSuccess(res, { data: { upcomingExams: result.rows } });
});

/**
 * Create / Schedule an Examination
 */
const createExam = asyncHandler(async (req, res) => {
  const {
    courseId,
    title,
    examType,
    examDate,
    startTime,
    endTime,
    durationMinutes,
    room,
    semester,
    academicYear,
    instructions,
  } = req.body;

  if (!(await canManageCourse(req.user, courseId))) {
    return sendError(res, {
      status: HTTP_STATUS.FORBIDDEN,
      code: 'UNAUTHORIZED_COURSE_FACULTY',
      message: 'You are only authorized to schedule exams for courses assigned to you.',
    });
  }

  // Schedule Conflict Detection:
  // 1. Check if venue/room is already booked for another active exam at overlapping times
  const venueConflict = await query(
    `SELECT id, title, exam_date, start_time, end_time, room 
       FROM exams 
       WHERE LOWER(room) = LOWER($1) AND exam_date = $2 AND status != 'CANCELLED'`,
    [room.trim(), examDate]
  );

  if (venueConflict.rowCount > 0) {
    const conflict = venueConflict.rows[0];
    return sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      code: 'VENUE_SCHEDULE_CONFLICT',
      message: `Venue conflict: Room "${room}" is already reserved for "${conflict.title}" on ${examDate} (${conflict.start_time} - ${conflict.end_time}). Please select another room or time.`,
    });
  }

  // 2. Check if the course already has an exam on that date
  const courseConflict = await query(
    `SELECT id, title FROM exams WHERE course_id = $1 AND exam_date = $2 AND status != 'CANCELLED'`,
    [courseId, examDate]
  );

  if (courseConflict.rowCount > 0) {
    return sendError(res, {
      status: HTTP_STATUS.CONFLICT,
      code: 'COURSE_EXAM_DATE_CONFLICT',
      message: `Course already has an active examination "${courseConflict.rows[0].title}" scheduled for ${examDate}.`,
    });
  }

  const insertRes = await query(
    `INSERT INTO exams (course_id, title, exam_type, exam_date, start_time, end_time, duration_minutes, room, semester, academic_year, instructions, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'UPCOMING')
       RETURNING *`,
    [
      courseId,
      title.trim(),
      examType,
      examDate,
      startTime.trim(),
      endTime.trim(),
      durationMinutes || 120,
      room.trim(),
      semester || 5,
      academicYear || '2024-2025',
      instructions ? instructions.trim() : null,
      req.user.id,
    ]
  );

  const exam = insertRes.rows[0];

  await recordAuditLog({
    actorId: req.user.id,
    action: 'EXAM_SCHEDULED',
    entity: 'EXAMS',
    entityId: exam.id,
    details: { title: exam.title, courseId, examDate, room: exam.room, examType },
    ipAddress: req.ip,
  });

  return sendCreated(res, {
    message: `Examination "${title}" scheduled successfully for ${examDate}.`,
    data: { exam },
  });
});

/**
 * Update an Examination
 */
const updateExam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const examCheck = await query('SELECT * FROM exams WHERE id = $1', [id]);
  if (examCheck.rowCount === 0) {
    return examNotFound(res);
  }

  const currentExam = examCheck.rows[0];

  if (!(await canManageCourse(req.user, currentExam.course_id))) {
    return sendError(res, {
      status: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN_EXAM_ACCESS',
      message: 'You can only update exams for your assigned courses.',
    });
  }

  const examSet = buildUpdateSet(
    Object.fromEntries(Object.entries(updates).map(([key, val]) => [toSnakeCase(key), val]))
  );

  await query(`UPDATE exams SET ${examSet.clause} WHERE id = $${examSet.nextIndex}`, [...examSet.params, id]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'EXAM_UPDATED',
    entity: 'EXAMS',
    entityId: id,
    details: updates,
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Exam schedule updated successfully.' });
});

/**
 * Cancel or Delete an Examination
 */
const deleteExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const examCheck = await query('SELECT * FROM exams WHERE id = $1', [id]);
  if (examCheck.rowCount === 0) {
    return examNotFound(res);
  }

  await query("UPDATE exams SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [id]);

  await recordAuditLog({
    actorId: req.user.id,
    action: 'EXAM_CANCELLED',
    entity: 'EXAMS',
    entityId: id,
    details: { title: examCheck.rows[0].title },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { message: 'Examination cancelled successfully.' });
});

module.exports = {
  getExams,
  getUpcomingExams,
  createExam,
  updateExam,
  deleteExam,
};
