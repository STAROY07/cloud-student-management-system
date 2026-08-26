const { query } = require('../config/db');

const USER_PROFILE_COLUMNS = `u.id, u.name, u.email, u.role, u.status, u.must_change_password,
              f.id AS faculty_id, f.department AS faculty_department, f.designation, f.phone AS faculty_phone,
              s.id AS student_id, s.roll_no, s.department AS student_department, s.semester, s.phone AS student_phone`;

/**
 * Normalize a joined users/faculty/students row into the API user shape
 */
const serializeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  phone: row.student_phone || row.faculty_phone || null,
  mustChangePassword: !!row.must_change_password,
  facultyId: row.faculty_id || null,
  studentId: row.student_id || null,
  rollNo: row.roll_no || null,
  department: row.faculty_department || row.student_department || null,
  designation: row.designation || null,
  semester: row.semester || null,
});

/**
 * Load the joined profile row for a user id
 */
const findUserProfileById = async (userId) => {
  const userRes = await query(
    `SELECT ${USER_PROFILE_COLUMNS}
       FROM users u
       LEFT JOIN faculty f ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
    [userId]
  );

  return userRes.rows[0] || null;
};

module.exports = {
  USER_PROFILE_COLUMNS,
  serializeUser,
  findUserProfileById,
};
