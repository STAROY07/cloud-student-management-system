const { query } = require('../config/db');
const { ROLES } = require('../constants/roles');

/**
 * Whether the user may manage the given course.
 * Faculty are restricted to the courses assigned to them; other roles
 * (admins) reach this helper only through admin-guarded routes.
 */
const canManageCourse = async (user, courseId) => {
  if (user.role !== ROLES.FACULTY) return true;

  const courseCheck = await query('SELECT faculty_id FROM courses WHERE id = $1', [courseId]);
  return courseCheck.rowCount > 0 && courseCheck.rows[0].faculty_id === user.facultyId;
};

module.exports = {
  canManageCourse,
};
