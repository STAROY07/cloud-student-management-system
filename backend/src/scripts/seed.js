const { pool, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');
const { ROLES, USER_STATUS, ATTENDANCE_STATUS } = require('../constants/roles');

async function runSeed() {
  logger.info('Starting database seeding...');

  await withTransaction(async (client) => {
    // 1. Clean existing seed data in reverse dependency order
    logger.info('Cleaning existing data for fresh seed...');
    await client.query('DELETE FROM marks');
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM enrollments');
    await client.query('DELETE FROM courses');
    await client.query('DELETE FROM students');
    await client.query('DELETE FROM faculty');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM users');

    const defaultAdminHash = await hashPassword('Admin@123');
    const defaultFacultyHash = await hashPassword('Faculty@123');
    const defaultStudentHash = await hashPassword('Student@123');

    // 2. Insert Admin User
    logger.info('Inserting Admin user...');
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['System Administrator', 'admin@university.edu', defaultAdminHash, ROLES.ADMIN, USER_STATUS.ACTIVE]
    );
    const adminId = adminRes.rows[0].id;

    // 3. Insert Faculty Users and Profiles
    logger.info('Inserting Faculty members...');
    const facultyUsers = [
      { name: 'Dr. Robert Smith', email: 'dr.smith@university.edu', empId: 'FAC-CS-001', dept: 'Computer Science', desig: 'Professor & HOD' },
      { name: 'Prof. Sarah Davis', email: 'prof.davis@university.edu', empId: 'FAC-IT-002', dept: 'Information Technology', desig: 'Associate Professor' },
      { name: 'Dr. Anita Patel', email: 'dr.patel@university.edu', empId: 'FAC-CS-003', dept: 'Computer Science', desig: 'Assistant Professor' }
    ];

    const facultyMap = {}; // name -> faculty.id
    for (const fac of facultyUsers) {
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [fac.name, fac.email, defaultFacultyHash, ROLES.FACULTY, USER_STATUS.ACTIVE]
      );
      const uId = userRes.rows[0].id;
      const facRes = await client.query(
        `INSERT INTO faculty (user_id, employee_id, department, designation)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [uId, fac.empId, fac.dept, fac.desig]
      );
      facultyMap[fac.name] = facRes.rows[0].id;
    }

    // 4. Insert Students Users and Profiles
    logger.info('Inserting Students...');
    const studentUsers = [
      { name: 'Alex Johnson', email: 'student.alex@university.edu', rollNo: 'CS2024-001', dept: 'Computer Science', sem: 5, year: 2022 },
      { name: 'Emma Williams', email: 'student.emma@university.edu', rollNo: 'CS2024-002', dept: 'Computer Science', sem: 5, year: 2022 },
      { name: 'Michael Brown', email: 'student.michael@university.edu', rollNo: 'CS2024-003', dept: 'Computer Science', sem: 5, year: 2022 },
      { name: 'Sophia Taylor', email: 'student.sophia@university.edu', rollNo: 'IT2024-001', dept: 'Information Technology', sem: 5, year: 2022 },
      { name: 'David Miller', email: 'student.david@university.edu', rollNo: 'CS2024-004', dept: 'Computer Science', sem: 5, year: 2022 }
    ];

    const studentMap = {}; // rollNo -> student.id
    for (const stu of studentUsers) {
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [stu.name, stu.email, defaultStudentHash, ROLES.STUDENT, USER_STATUS.ACTIVE]
      );
      const uId = userRes.rows[0].id;
      const stuRes = await client.query(
        `INSERT INTO students (user_id, roll_no, department, semester, admission_year)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [uId, stu.rollNo, stu.dept, stu.sem, stu.year]
      );
      studentMap[stu.rollNo] = stuRes.rows[0].id;
    }

    // 5. Insert Courses
    logger.info('Inserting Courses...');
    const courseList = [
      { code: 'CS501', name: 'Cloud Computing & Distributed Systems', credits: 4, dept: 'Computer Science', sem: 5, faculty: 'Dr. Robert Smith' },
      { code: 'CS502', name: 'Relational Database Architecture', credits: 3, dept: 'Computer Science', sem: 5, faculty: 'Dr. Anita Patel' },
      { code: 'CS503', name: 'Advanced Operating Systems', credits: 4, dept: 'Computer Science', sem: 5, faculty: 'Dr. Robert Smith' },
      { code: 'IT501', name: 'Network Security & Cryptography', credits: 3, dept: 'Information Technology', sem: 5, faculty: 'Prof. Sarah Davis' },
      { code: 'CS504', name: 'Software Engineering & Cloud Architecture', credits: 3, dept: 'Computer Science', sem: 5, faculty: 'Dr. Anita Patel' }
    ];

    const courseMap = {}; // code -> course.id
    for (const c of courseList) {
      const facId = facultyMap[c.faculty] || null;
      const cRes = await client.query(
        `INSERT INTO courses (code, name, credits, department, semester, faculty_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [c.code, c.name, c.credits, c.dept, c.sem, facId]
      );
      courseMap[c.code] = cRes.rows[0].id;
    }

    // 6. Enrollments (Academic Year 2024-2025)
    logger.info('Enrolling students in courses...');
    const academicYear = '2024-2025';
    const enrollmentMap = {}; // `${rollNo}_${courseCode}` -> enrollment.id

    const csRolls = ['CS2024-001', 'CS2024-002', 'CS2024-003', 'CS2024-004'];
    const csCourses = ['CS501', 'CS502', 'CS503', 'CS504'];

    for (const roll of csRolls) {
      const sId = studentMap[roll];
      for (const cCode of csCourses) {
        const cId = courseMap[cCode];
        const eRes = await client.query(
          `INSERT INTO enrollments (student_id, course_id, academic_year, status)
           VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
          [sId, cId, academicYear]
        );
        enrollmentMap[`${roll}_${cCode}`] = eRes.rows[0].id;
      }
    }

    // IT student enrollment
    const itStudentId = studentMap['IT2024-001'];
    const itCourseId = courseMap['IT501'];
    const itEnrollRes = await client.query(
      `INSERT INTO enrollments (student_id, course_id, academic_year, status)
       VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
      [itStudentId, itCourseId, academicYear]
    );
    enrollmentMap['IT2024-001_IT501'] = itEnrollRes.rows[0].id;

    // 7. Seed Attendance records
    logger.info('Inserting attendance records...');
    const attendanceDates = ['2026-08-01', '2026-08-05', '2026-08-10', '2026-08-15', '2026-08-20'];
    const markedByAdminUser = adminId;

    for (const roll of csRolls) {
      const eId = enrollmentMap[`${roll}_CS501`];
      for (let i = 0; i < attendanceDates.length; i++) {
        // Deterministic realistic attendance: Alex perfect, Emma missed one, etc.
        let status = ATTENDANCE_STATUS.PRESENT;
        if (roll === 'CS2024-002' && i === 2) status = ATTENDANCE_STATUS.ABSENT;
        if (roll === 'CS2024-003' && i === 1) status = ATTENDANCE_STATUS.LATE;
        if (roll === 'CS2024-004' && (i === 0 || i === 3)) status = ATTENDANCE_STATUS.ABSENT;

        await client.query(
          `INSERT INTO attendance (enrollment_id, date, status, marked_by)
           VALUES ($1, $2, $3, $4) ON CONFLICT (enrollment_id, date) DO UPDATE SET status = EXCLUDED.status`,
          [eId, attendanceDates[i], status, markedByAdminUser]
        );
      }
    }

    // 8. Seed Marks
    logger.info('Inserting marks...');
    const assessments = [
      { name: 'Midterm Exam 1', max: 50 },
      { name: 'Cloud Architecture Assignment', max: 20 },
      { name: 'Midterm Exam 2', max: 50 },
      { name: 'Final Practical Project', max: 100 }
    ];

    const studentMarksData = {
      'CS2024-001': [46.5, 19.0, 48.0, 95.0], // Alex Johnson
      'CS2024-002': [42.0, 18.5, 44.0, 89.5], // Emma Williams
      'CS2024-003': [38.5, 16.0, 39.0, 81.0], // Michael Brown
      'CS2024-004': [35.0, 14.5, 36.0, 74.0], // David Miller
    };

    for (const roll of csRolls) {
      const eId = enrollmentMap[`${roll}_CS501`];
      const scores = studentMarksData[roll];
      for (let i = 0; i < assessments.length; i++) {
        await client.query(
          `INSERT INTO marks (enrollment_id, assessment, score, max_score, entered_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (enrollment_id, assessment) DO UPDATE SET score = EXCLUDED.score`,
          [eId, assessments[i].name, scores[i], assessments[i].max, adminId]
        );
      }
    }

    // 9. Initial Audit Log
    logger.info('Recording initial system audit log...');
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        'SYSTEM_SEED_INITIALIZATION',
        'SYSTEM',
        adminId,
        JSON.stringify({ note: 'Initial university semester 5 database seed applied successfully' }),
        '127.0.0.1'
      ]
    );

    logger.info('Database seeded successfully with enterprise academic test dataset.');
  });
}

if (require.main === module) {
  runSeed()
    .then(() => {
      logger.info('Seed runner finished successfully');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed runner failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}

module.exports = runSeed;
