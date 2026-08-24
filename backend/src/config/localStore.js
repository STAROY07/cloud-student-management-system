const { hashPassword } = require('../utils/password');
const { ROLES, USER_STATUS, ATTENDANCE_STATUS } = require('../constants/roles');
const logger = require('../utils/logger');

class LocalRelationalStore {
  constructor() {
    this.users = [];
    this.faculty = [];
    this.students = [];
    this.courses = [];
    this.enrollments = [];
    this.attendance = [];
    this.marks = [];
    this.exams = [];
    this.auditLogs = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    logger.info('Initializing local relational database with seed data...');

    const adminHash = await hashPassword('Admin@123');
    const facultyHash = await hashPassword('Faculty@123');
    const studentHash = await hashPassword('Student@123');

    // 1. Users
    const uAdmin = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'System Administrator',
      email: 'admin@university.edu',
      password_hash: adminHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uFac1 = {
      id: '22222222-2222-2222-2222-222222222221',
      name: 'Dr. Robert Smith',
      email: 'dr.smith@university.edu',
      password_hash: facultyHash,
      role: ROLES.FACULTY,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uFac2 = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Prof. Sarah Davis',
      email: 'prof.davis@university.edu',
      password_hash: facultyHash,
      role: ROLES.FACULTY,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uFac3 = {
      id: '22222222-2222-2222-2222-222222222223',
      name: 'Dr. Anita Patel',
      email: 'dr.patel@university.edu',
      password_hash: facultyHash,
      role: ROLES.FACULTY,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uStu1 = {
      id: '33333333-3333-3333-3333-333333333331',
      name: 'Alex Johnson',
      email: 'student.alex@university.edu',
      password_hash: studentHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uStu2 = {
      id: '33333333-3333-3333-3333-333333333332',
      name: 'Emma Williams',
      email: 'student.emma@university.edu',
      password_hash: studentHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uStu3 = {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Michael Brown',
      email: 'student.michael@university.edu',
      password_hash: studentHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uStu4 = {
      id: '33333333-3333-3333-3333-333333333334',
      name: 'Sophia Taylor',
      email: 'student.sophia@university.edu',
      password_hash: studentHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    const uStu5 = {
      id: '33333333-3333-3333-3333-333333333335',
      name: 'David Miller',
      email: 'student.david@university.edu',
      password_hash: studentHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      must_change_password: false,
      created_at: new Date('2026-08-01T08:00:00Z'),
      updated_at: new Date('2026-08-01T08:00:00Z'),
    };

    this.users = [uAdmin, uFac1, uFac2, uFac3, uStu1, uStu2, uStu3, uStu4, uStu5];

    // 2. Faculty profiles
    this.faculty = [
      { id: 'f1111111-1111-1111-1111-111111111111', user_id: uFac1.id, employee_id: 'FAC-CS-001', department: 'Computer Science', designation: 'Professor & HOD', phone: '+1 (555) 019-2831', created_at: new Date() },
      { id: 'f2222222-2222-2222-2222-222222222222', user_id: uFac2.id, employee_id: 'FAC-IT-002', department: 'Information Technology', designation: 'Associate Professor', phone: '+1 (555) 019-2832', created_at: new Date() },
      { id: 'f3333333-3333-3333-3333-333333333333', user_id: uFac3.id, employee_id: 'FAC-CS-003', department: 'Computer Science', designation: 'Assistant Professor', phone: '+1 (555) 019-2833', created_at: new Date() },
    ];

    // 3. Student profiles
    this.students = [
      { id: 's1111111-1111-1111-1111-111111111111', user_id: uStu1.id, roll_no: 'CS2024-001', department: 'Computer Science', semester: 5, admission_year: 2022, phone: '+1 (555) 012-3451', created_at: new Date() },
      { id: 's2222222-2222-2222-2222-222222222222', user_id: uStu2.id, roll_no: 'CS2024-002', department: 'Computer Science', semester: 5, admission_year: 2022, phone: '+1 (555) 012-3452', created_at: new Date() },
      { id: 's3333333-3333-3333-3333-333333333333', user_id: uStu3.id, roll_no: 'CS2024-003', department: 'Computer Science', semester: 5, admission_year: 2022, phone: '+1 (555) 012-3453', created_at: new Date() },
      { id: 's4444444-4444-4444-4444-444444444444', user_id: uStu4.id, roll_no: 'IT2024-001', department: 'Information Technology', semester: 5, admission_year: 2022, phone: '+1 (555) 012-3454', created_at: new Date() },
      { id: 's5555555-5555-5555-5555-555555555555', user_id: uStu5.id, roll_no: 'CS2024-004', department: 'Computer Science', semester: 5, admission_year: 2022, phone: '+1 (555) 012-3455', created_at: new Date() },
    ];

    // 4. Courses
    this.courses = [
      { id: 'c1111111-1111-1111-1111-111111111111', code: 'CS501', name: 'Cloud Computing & Distributed Systems', credits: 4, department: 'Computer Science', semester: 5, faculty_id: this.faculty[0].id, created_at: new Date() },
      { id: 'c2222222-2222-2222-2222-222222222222', code: 'CS502', name: 'Relational Database Architecture', credits: 3, department: 'Computer Science', semester: 5, faculty_id: this.faculty[2].id, created_at: new Date() },
      { id: 'c3333333-3333-3333-3333-333333333333', code: 'CS503', name: 'Advanced Operating Systems', credits: 4, department: 'Computer Science', semester: 5, faculty_id: this.faculty[0].id, created_at: new Date() },
      { id: 'c4444444-4444-4444-4444-444444444444', code: 'IT501', name: 'Network Security & Cryptography', credits: 3, department: 'Information Technology', semester: 5, faculty_id: this.faculty[1].id, created_at: new Date() },
      { id: 'c5555555-5555-5555-5555-555555555555', code: 'CS504', name: 'Software Engineering & Cloud Architecture', credits: 3, department: 'Computer Science', semester: 5, faculty_id: this.faculty[2].id, created_at: new Date() },
    ];

    // 5. Enrollments
    const academicYear = '2024-2025';
    let enrollIdx = 1;
    for (const stu of this.students.filter(s => s.department === 'Computer Science')) {
      for (const crs of this.courses.filter(c => c.department === 'Computer Science')) {
        this.enrollments.push({
          id: `e0000000-0000-0000-0000-${String(enrollIdx++).padStart(12, '0')}`,
          student_id: stu.id,
          course_id: crs.id,
          academic_year: academicYear,
          status: 'ACTIVE',
          created_at: new Date(),
        });
      }
    }

    // IT student enrollment
    this.enrollments.push({
      id: `e0000000-0000-0000-0000-${String(enrollIdx++).padStart(12, '0')}`,
      student_id: this.students[3].id,
      course_id: this.courses[3].id,
      academic_year: academicYear,
      status: 'ACTIVE',
      created_at: new Date(),
    });

    // 6. Attendance records
    const attendanceDates = ['2026-08-01', '2026-08-05', '2026-08-10', '2026-08-15', '2026-08-20'];
    let attIdx = 1;
    const cs501Enrollments = this.enrollments.filter(e => e.course_id === this.courses[0].id);

    for (const enr of cs501Enrollments) {
      for (let i = 0; i < attendanceDates.length; i++) {
        let status = ATTENDANCE_STATUS.PRESENT;
        if (enr.student_id === this.students[1].id && i === 2) status = ATTENDANCE_STATUS.ABSENT;
        if (enr.student_id === this.students[2].id && i === 1) status = ATTENDANCE_STATUS.LATE;
        if (enr.student_id === this.students[4].id && (i === 0 || i === 3)) status = ATTENDANCE_STATUS.ABSENT;

        this.attendance.push({
          id: `a0000000-0000-0000-0000-${String(attIdx++).padStart(12, '0')}`,
          enrollment_id: enr.id,
          date: attendanceDates[i],
          status,
          marked_by: uAdmin.id,
          created_at: new Date(attendanceDates[i]),
          updated_at: new Date(attendanceDates[i]),
        });
      }
    }

    // 7. Marks
    const assessments = [
      { name: 'Midterm Exam 1', max: 50 },
      { name: 'Cloud Architecture Assignment', max: 20 },
      { name: 'Midterm Exam 2', max: 50 },
      { name: 'Final Practical Project', max: 100 }
    ];

    const studentScores = {
      [this.students[0].id]: [46.5, 19.0, 48.0, 95.0], // Alex Johnson
      [this.students[1].id]: [42.0, 18.5, 44.0, 89.5], // Emma Williams
      [this.students[2].id]: [38.5, 16.0, 39.0, 81.0], // Michael Brown
      [this.students[4].id]: [35.0, 14.5, 36.0, 74.0], // David Miller
    };

    let markIdx = 1;
    for (const enr of cs501Enrollments) {
      const scores = studentScores[enr.student_id];
      if (scores) {
        for (let i = 0; i < assessments.length; i++) {
          this.marks.push({
            id: `m0000000-0000-0000-0000-${String(markIdx++).padStart(12, '0')}`,
            enrollment_id: enr.id,
            assessment: assessments[i].name,
            score: scores[i],
            max_score: assessments[i].max,
            entered_by: uAdmin.id,
            created_at: new Date('2026-08-15'),
            updated_at: new Date('2026-08-15'),
          });
        }
      }
    }

    // 8. Exams Schedule
    this.exams = [
      {
        id: 'ex-0001',
        course_id: this.courses[0].id, // CS501
        title: 'Midterm Examination',
        exam_type: 'MIDTERM',
        exam_date: '2026-09-15',
        start_time: '10:00 AM',
        end_time: '12:00 PM',
        duration_minutes: 120,
        room: 'Hall A-204',
        semester: 5,
        academic_year: '2024-2025',
        instructions: 'Bring student ID card. Closed book examination. Non-programmable calculator allowed.',
        created_by: uFac1.id,
        status: 'UPCOMING',
        created_at: new Date('2026-08-10'),
        updated_at: new Date('2026-08-10'),
      },
      {
        id: 'ex-0002',
        course_id: this.courses[1].id, // CS502
        title: 'Database Architecture Practical',
        exam_type: 'PRACTICAL',
        exam_date: '2026-09-20',
        start_time: '02:00 PM',
        end_time: '05:00 PM',
        duration_minutes: 180,
        room: 'Lab B-301',
        semester: 5,
        academic_year: '2024-2025',
        instructions: 'Practical hands-on SQL query tuning and PostgreSQL indexing benchmark exam.',
        created_by: uFac3.id,
        status: 'UPCOMING',
        created_at: new Date('2026-08-10'),
        updated_at: new Date('2026-08-10'),
      },
      {
        id: 'ex-0003',
        course_id: this.courses[2].id, // CS503
        title: 'Midterm Theory Exam',
        exam_type: 'MIDTERM',
        exam_date: '2026-09-25',
        start_time: '11:00 AM',
        end_time: '01:00 PM',
        duration_minutes: 120,
        room: 'Room C-102',
        semester: 5,
        academic_year: '2024-2025',
        instructions: 'Distributed operating system kernel architecture and memory virtualization.',
        created_by: uFac1.id,
        status: 'UPCOMING',
        created_at: new Date('2026-08-10'),
        updated_at: new Date('2026-08-10'),
      },
      {
        id: 'ex-0004',
        course_id: this.courses[4].id, // CS504
        title: 'Cloud Architecture Final Review',
        exam_type: 'FINAL',
        exam_date: '2026-10-05',
        start_time: '09:00 AM',
        end_time: '12:00 PM',
        duration_minutes: 180,
        room: 'Auditorium 1',
        semester: 5,
        academic_year: '2024-2025',
        instructions: 'Comprehensive exam on microservice patterns and distributed fault tolerance.',
        created_by: uFac3.id,
        status: 'UPCOMING',
        created_at: new Date('2026-08-10'),
        updated_at: new Date('2026-08-10'),
      },
      {
        id: 'ex-0005',
        course_id: this.courses[3].id, // IT501
        title: 'Network Security Midterm Exam',
        exam_type: 'MIDTERM',
        exam_date: '2026-09-18',
        start_time: '10:00 AM',
        end_time: '12:00 PM',
        duration_minutes: 120,
        room: 'Room D-205',
        semester: 5,
        academic_year: '2024-2025',
        instructions: 'Asymmetric cryptography algorithms and TLS handshakes.',
        created_by: uFac2.id,
        status: 'UPCOMING',
        created_at: new Date('2026-08-10'),
        updated_at: new Date('2026-08-10'),
      },
    ];

    // 9. Audit logs
    this.auditLogs = [
      {
        id: 'aud-0001',
        actor_id: uAdmin.id,
        action: 'SYSTEM_SEED_INITIALIZATION',
        entity: 'SYSTEM',
        entityId: uAdmin.id,
        details: { note: 'Initial university semester 5 database seed applied successfully' },
        ip_address: '127.0.0.1',
        created_at: new Date(),
      }
    ];

    this.initialized = true;
    logger.info('Local relational database initialized successfully with 5 students, 3 faculty, 5 courses, and full grades/attendance.');
  }
}

const localStore = new LocalRelationalStore();

module.exports = localStore;
