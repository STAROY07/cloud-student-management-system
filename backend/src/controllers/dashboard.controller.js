const { query } = require('../config/db');
const { ROLES } = require('../constants/roles');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Aggregates role-specific KPIs from PostgreSQL
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const { role, id: userId, facultyId, studentId } = req.user;

    if (role === ROLES.ADMIN) {
      // 1. Admin KPIs
      const [
        studentsCount,
        facultyCount,
        coursesCount,
        enrollmentsCount,
        attendanceStats,
        recentActivity,
        deptDistribution,
      ] = await Promise.all([
        query('SELECT COUNT(*) as count FROM students'),
        query('SELECT COUNT(*) as count FROM faculty'),
        query('SELECT COUNT(*) as count FROM courses'),
        query('SELECT COUNT(*) as count FROM enrollments WHERE status = \'ACTIVE\''),
        query(`
          SELECT 
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE status = 'PRESENT') as present_count,
            ROUND(COUNT(*) FILTER (WHERE status = 'PRESENT') * 100.0 / NULLIF(COUNT(*), 0), 1) as overall_rate
          FROM attendance
        `),
        query(`
          SELECT a.id, a.action, a.entity, a.entity_id, a.created_at, u.name as actor_name, u.role as actor_role
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.actor_id
          ORDER BY a.created_at DESC
          LIMIT 8
        `),
        query(`
          SELECT department, COUNT(*) as student_count
          FROM students
          GROUP BY department
          ORDER BY student_count DESC
        `),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          role: ROLES.ADMIN,
          kpis: {
            totalStudents: parseInt(studentsCount.rows[0].count, 10),
            totalFaculty: parseInt(facultyCount.rows[0].count, 10),
            totalCourses: parseInt(coursesCount.rows[0].count, 10),
            activeEnrollments: parseInt(enrollmentsCount.rows[0].count, 10),
            overallAttendanceRate: parseFloat(attendanceStats.rows[0]?.overall_rate || 0),
          },
          departmentDistribution: deptDistribution.rows,
          recentActivity: recentActivity.rows,
        },
      });
    }

    if (role === ROLES.FACULTY) {
      // 2. Faculty KPIs
      const [
        assignedCourses,
        assignedStudentsCount,
        attendanceStats,
        recentMarks,
      ] = await Promise.all([
        query(`
          SELECT c.id, c.code, c.name, c.credits, c.department, c.semester,
                 COUNT(e.id) as enrolled_students
          FROM courses c
          LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
          WHERE c.faculty_id = $1
          GROUP BY c.id
          ORDER BY c.code ASC
        `, [facultyId]),
        query(`
          SELECT COUNT(DISTINCT e.student_id) as count
          FROM courses c
          JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
          WHERE c.faculty_id = $1
        `, [facultyId]),
        query(`
          SELECT 
            COUNT(a.id) as total_records,
            COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as present_count,
            ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as rate
          FROM courses c
          JOIN enrollments e ON e.course_id = c.id
          JOIN attendance a ON a.enrollment_id = e.id
          WHERE c.faculty_id = $1
        `, [facultyId]),
        query(`
          SELECT m.id, m.assessment, m.score, m.max_score, m.created_at,
                 c.code as course_code, u.name as student_name
          FROM marks m
          JOIN enrollments e ON e.id = m.enrollment_id
          JOIN courses c ON c.id = e.course_id
          JOIN students s ON s.id = e.student_id
          JOIN users u ON u.id = s.user_id
          WHERE c.faculty_id = $1
          ORDER BY m.created_at DESC
          LIMIT 6
        `, [facultyId]),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          role: ROLES.FACULTY,
          kpis: {
            assignedCoursesCount: assignedCourses.rowCount,
            totalStudentsAssigned: parseInt(assignedStudentsCount.rows[0]?.count || 0, 10),
            courseAttendanceRate: parseFloat(attendanceStats.rows[0]?.rate || 0),
          },
          assignedCourses: assignedCourses.rows,
          recentMarks: recentMarks.rows,
        },
      });
    }

    if (role === ROLES.STUDENT) {
      // 3. Student KPIs
      const [
        enrolledCourses,
        attendanceSummary,
        courseAttendanceBreakdown,
        marksSummary,
      ] = await Promise.all([
        query(`
          SELECT c.id, c.code, c.name, c.credits, c.department, u.name as faculty_name
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          LEFT JOIN faculty f ON f.id = c.faculty_id
          LEFT JOIN users u ON u.id = f.user_id
          WHERE e.student_id = $1 AND e.status = 'ACTIVE'
          ORDER BY c.code ASC
        `, [studentId]),
        query(`
          SELECT 
            COUNT(a.id) as total_classes,
            COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as attended_classes,
            ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as percentage
          FROM enrollments e
          JOIN attendance a ON a.enrollment_id = e.id
          WHERE e.student_id = $1
        `, [studentId]),
        query(`
          SELECT 
            c.code as course_code,
            c.name as course_name,
            COUNT(a.id) as total_classes,
            COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') as attended_classes,
            ROUND(COUNT(a.id) FILTER (WHERE a.status = 'PRESENT') * 100.0 / NULLIF(COUNT(a.id), 0), 1) as percentage
          FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          LEFT JOIN attendance a ON a.enrollment_id = e.id
          WHERE e.student_id = $1 AND e.status = 'ACTIVE'
          GROUP BY c.id, c.code, c.name
          ORDER BY c.code ASC
        `, [studentId]),
        query(`
          SELECT m.id, m.assessment, m.score, m.max_score, c.code as course_code, c.name as course_name
          FROM marks m
          JOIN enrollments e ON e.id = m.enrollment_id
          JOIN courses c ON c.id = e.course_id
          WHERE e.student_id = $1
          ORDER BY m.created_at DESC
        `, [studentId]),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          role: ROLES.STUDENT,
          kpis: {
            enrolledCoursesCount: enrolledCourses.rowCount,
            overallAttendance: parseFloat(attendanceSummary.rows[0]?.percentage || 0),
            totalClasses: parseInt(attendanceSummary.rows[0]?.total_classes || 0, 10),
            attendedClasses: parseInt(attendanceSummary.rows[0]?.attended_classes || 0, 10),
          },
          enrolledCourses: enrolledCourses.rows,
          courseAttendance: courseAttendanceBreakdown.rows,
          marks: marksSummary.rows,
        },
      });
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: { code: 'INVALID_ROLE', message: 'Unknown user role' },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
