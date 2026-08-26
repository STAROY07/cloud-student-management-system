const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { buildFilters } = require('../utils/sqlBuilder');

/**
 * Generate academic reports from live database data
 */
const getAcademicReports = asyncHandler(async (req, res) => {
  const { department, semester, academicYear = '2024-2025' } = req.query;

  const filters = buildFilters(
    [
      { value: department, condition: (p) => `s.department = ${p}` },
      { value: semester ? parseInt(semester, 10) : undefined, condition: (p) => `s.semester = ${p}` },
    ],
    { startIndex: 2 }
  );

  const params = [academicYear, ...filters.params];
  const whereClause = filters.clause('AND');

  // 1. Department Enrollment & Performance Summary
  const deptSummaryRes = await query(`
      SELECT 
        s.department,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT e.course_id) as active_courses,
        ROUND(AVG(m.score * 100.0 / NULLIF(m.max_score, 0)), 1) as avg_marks_percentage,
        ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as avg_attendance_rate
      FROM students s
      JOIN enrollments e ON e.student_id = s.id AND e.academic_year = $1
      LEFT JOIN marks m ON m.enrollment_id = e.id
      LEFT JOIN attendance a ON a.enrollment_id = e.id
      WHERE 1=1 ${whereClause}
      GROUP BY s.department
      ORDER BY s.department ASC
    `, params);

  // 2. Course-wise Performance Roster
  const coursePerformanceRes = await query(`
      SELECT 
        c.id, c.code, c.name, c.department, c.semester,
        fu.name as faculty_lead,
        COUNT(DISTINCT e.id) as enrolled_count,
        ROUND(AVG(m.score * 100.0 / NULLIF(m.max_score, 0)), 1) as course_avg_percentage,
        ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as course_attendance_rate,
        COUNT(DISTINCT m.id) as total_assessments_recorded
      FROM courses c
      LEFT JOIN faculty f ON f.id = c.faculty_id
      LEFT JOIN users fu ON fu.id = f.user_id
      JOIN enrollments e ON e.course_id = c.id AND e.academic_year = $1
      LEFT JOIN students s ON s.id = e.student_id
      LEFT JOIN marks m ON m.enrollment_id = e.id
      LEFT JOIN attendance a ON a.enrollment_id = e.id
      WHERE 1=1 ${whereClause}
      GROUP BY c.id, fu.name
      ORDER BY c.code ASC
    `, params);

  // 3. Top Performing Students
  const topStudentsRes = await query(`
      SELECT 
        s.id, s.roll_no, u.name as student_name, s.department, s.semester,
        ROUND(AVG(m.score * 100.0 / NULLIF(m.max_score, 0)), 2) as aggregate_score,
        ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as attendance_rate
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN enrollments e ON e.student_id = s.id AND e.academic_year = $1
      LEFT JOIN marks m ON m.enrollment_id = e.id
      LEFT JOIN attendance a ON a.enrollment_id = e.id
      WHERE 1=1 ${whereClause}
      GROUP BY s.id, u.name
      HAVING COUNT(m.id) > 0
      ORDER BY aggregate_score DESC
      LIMIT 10
    `, params);

  return sendSuccess(res, {
    data: {
      academicYear,
      departmentSummary: deptSummaryRes.rows,
      coursePerformance: coursePerformanceRes.rows,
      topStudents: topStudentsRes.rows,
    },
  });
});

module.exports = {
  getAcademicReports,
};
