// Complete Realistic Academic Mock Store for Demonstration & Offline Hosting

const STORAGE_KEY = 'cloud_sms_demo_store';

const initialStore = {
  users: [
    {
      id: 'usr-admin-1',
      name: 'System Administrator',
      email: 'admin@university.edu',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-fac-1',
      name: 'Dr. Robert Smith',
      email: 'dr.smith@university.edu',
      role: 'FACULTY',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-fac-2',
      name: 'Prof. Sarah Davis',
      email: 'prof.davis@university.edu',
      role: 'FACULTY',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-fac-3',
      name: 'Dr. Anita Patel',
      email: 'dr.patel@university.edu',
      role: 'FACULTY',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-stu-1',
      name: 'Alex Johnson',
      email: 'student.alex@university.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-stu-2',
      name: 'Emma Williams',
      email: 'student.emma@university.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-stu-3',
      name: 'Michael Brown',
      email: 'student.michael@university.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-stu-4',
      name: 'Sophia Taylor',
      email: 'student.sophia@university.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'usr-stu-5',
      name: 'David Miller',
      email: 'student.david@university.edu',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
    },
  ],

  faculty: [
    {
      id: 'fac-1',
      user_id: 'usr-fac-1',
      name: 'Dr. Robert Smith',
      email: 'dr.smith@university.edu',
      employee_id: 'FAC-CS-001',
      department: 'Computer Science',
      designation: 'Professor & HOD',
      status: 'ACTIVE',
    },
    {
      id: 'fac-2',
      user_id: 'usr-fac-2',
      name: 'Prof. Sarah Davis',
      email: 'prof.davis@university.edu',
      employee_id: 'FAC-IT-002',
      department: 'Information Technology',
      designation: 'Associate Professor',
      status: 'ACTIVE',
    },
    {
      id: 'fac-3',
      user_id: 'usr-fac-3',
      name: 'Dr. Anita Patel',
      email: 'dr.patel@university.edu',
      employee_id: 'FAC-CS-003',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      status: 'ACTIVE',
    },
  ],

  students: [
    {
      id: 'stu-1',
      user_id: 'usr-stu-1',
      name: 'Alex Johnson',
      email: 'student.alex@university.edu',
      phone: '+1 (555) 234-5678',
      roll_no: 'CS2024-001',
      department: 'Computer Science',
      semester: 5,
      admission_year: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-2',
      user_id: 'usr-stu-2',
      name: 'Emma Williams',
      email: 'student.emma@university.edu',
      phone: '+1 (555) 345-6789',
      roll_no: 'CS2024-002',
      department: 'Computer Science',
      semester: 5,
      admission_year: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-3',
      user_id: 'usr-stu-3',
      name: 'Michael Brown',
      email: 'student.michael@university.edu',
      phone: '+1 (555) 456-7890',
      roll_no: 'CS2024-003',
      department: 'Computer Science',
      semester: 5,
      admission_year: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-4',
      user_id: 'usr-stu-4',
      name: 'Sophia Taylor',
      email: 'student.sophia@university.edu',
      phone: '+1 (555) 567-8901',
      roll_no: 'IT2024-001',
      department: 'Information Technology',
      semester: 5,
      admission_year: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-5',
      user_id: 'usr-stu-5',
      name: 'David Miller',
      email: 'student.david@university.edu',
      phone: '+1 (555) 678-9012',
      roll_no: 'CS2024-004',
      department: 'Computer Science',
      semester: 5,
      admission_year: 2022,
      status: 'ACTIVE',
    },
  ],

  courses: [
    {
      id: 'crs-1',
      code: 'CS501',
      name: 'Cloud Computing & Distributed Systems',
      credits: 4,
      department: 'Computer Science',
      semester: 5,
      faculty_id: 'fac-1',
      faculty_name: 'Dr. Robert Smith',
      description: 'Covers Google Cloud Run, Cloud SQL, IAM, microservices architecture, and load balancing.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-2',
      code: 'CS502',
      name: 'Relational Database Architecture',
      credits: 3,
      department: 'Computer Science',
      semester: 5,
      faculty_id: 'fac-3',
      faculty_name: 'Dr. Anita Patel',
      description: 'Advanced PostgreSQL indexing, transactions, ACID compliance, and query performance tuning.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-3',
      code: 'CS503',
      name: 'Advanced Operating Systems',
      credits: 4,
      department: 'Computer Science',
      semester: 5,
      faculty_id: 'fac-1',
      faculty_name: 'Dr. Robert Smith',
      description: 'Concurrency models, Linux kernel internals, virtualization, and container runtime environments.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-4',
      code: 'IT501',
      name: 'Network Security & Cryptography',
      credits: 3,
      department: 'Information Technology',
      semester: 5,
      faculty_id: 'fac-2',
      faculty_name: 'Prof. Sarah Davis',
      description: 'Zero Trust architecture, TLS 1.3, public key infrastructure, and JWT authentication flows.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-5',
      code: 'CS504',
      name: 'Software Engineering & Cloud Architecture',
      credits: 3,
      department: 'Computer Science',
      semester: 5,
      faculty_id: 'fac-3',
      faculty_name: 'Dr. Anita Patel',
      description: 'CI/CD automation, clean architectural patterns, 12-factor cloud apps, and agile workflows.',
      status: 'ACTIVE',
    },
  ],

  enrollments: [
    { id: 'enr-1', student_id: 'stu-1', course_id: 'crs-1', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-2', student_id: 'stu-1', course_id: 'crs-2', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-3', student_id: 'stu-1', course_id: 'crs-3', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-4', student_id: 'stu-1', course_id: 'crs-5', academic_year: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-5', student_id: 'stu-2', course_id: 'crs-1', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-6', student_id: 'stu-2', course_id: 'crs-2', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-7', student_id: 'stu-2', course_id: 'crs-3', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-8', student_id: 'stu-2', course_id: 'crs-5', academic_year: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-9', student_id: 'stu-3', course_id: 'crs-1', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-10', student_id: 'stu-3', course_id: 'crs-2', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-11', student_id: 'stu-3', course_id: 'crs-3', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-12', student_id: 'stu-3', course_id: 'crs-5', academic_year: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-13', student_id: 'stu-4', course_id: 'crs-4', academic_year: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-14', student_id: 'stu-5', course_id: 'crs-1', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-15', student_id: 'stu-5', course_id: 'crs-2', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-16', student_id: 'stu-5', course_id: 'crs-3', academic_year: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-17', student_id: 'stu-5', course_id: 'crs-5', academic_year: '2024-2025', status: 'ACTIVE' },
  ],

  attendance: [
    { id: 'att-1', enrollment_id: 'enr-1', date: '2026-08-01', status: 'PRESENT' },
    { id: 'att-2', enrollment_id: 'enr-1', date: '2026-08-05', status: 'PRESENT' },
    { id: 'att-3', enrollment_id: 'enr-1', date: '2026-08-10', status: 'PRESENT' },
    { id: 'att-4', enrollment_id: 'enr-1', date: '2026-08-15', status: 'PRESENT' },
    { id: 'att-5', enrollment_id: 'enr-1', date: '2026-08-20', status: 'PRESENT' },

    { id: 'att-6', enrollment_id: 'enr-5', date: '2026-08-01', status: 'PRESENT' },
    { id: 'att-7', enrollment_id: 'enr-5', date: '2026-08-05', status: 'PRESENT' },
    { id: 'att-8', enrollment_id: 'enr-5', date: '2026-08-10', status: 'ABSENT' },
    { id: 'att-9', enrollment_id: 'enr-5', date: '2026-08-15', status: 'PRESENT' },
    { id: 'att-10', enrollment_id: 'enr-5', date: '2026-08-20', status: 'PRESENT' },

    { id: 'att-11', enrollment_id: 'enr-9', date: '2026-08-01', status: 'PRESENT' },
    { id: 'att-12', enrollment_id: 'enr-9', date: '2026-08-05', status: 'LATE' },
    { id: 'att-13', enrollment_id: 'enr-9', date: '2026-08-10', status: 'PRESENT' },
    { id: 'att-14', enrollment_id: 'enr-9', date: '2026-08-15', status: 'PRESENT' },
    { id: 'att-15', enrollment_id: 'enr-9', date: '2026-08-20', status: 'PRESENT' },

    { id: 'att-16', enrollment_id: 'enr-14', date: '2026-08-01', status: 'ABSENT' },
    { id: 'att-17', enrollment_id: 'enr-14', date: '2026-08-05', status: 'PRESENT' },
    { id: 'att-18', enrollment_id: 'enr-14', date: '2026-08-10', status: 'PRESENT' },
    { id: 'att-19', enrollment_id: 'enr-14', date: '2026-08-15', status: 'ABSENT' },
    { id: 'att-20', enrollment_id: 'enr-14', date: '2026-08-20', status: 'PRESENT' },
  ],

  marks: [
    { id: 'mrk-1', enrollment_id: 'enr-1', assessment: 'Midterm Exam 1', score: 46.5, max_score: 50, created_at: '2026-08-10T10:00:00Z' },
    { id: 'mrk-2', enrollment_id: 'enr-1', assessment: 'Cloud Architecture Assignment', score: 19.0, max_score: 20, created_at: '2026-08-15T12:00:00Z' },
    { id: 'mrk-3', enrollment_id: 'enr-1', assessment: 'Midterm Exam 2', score: 48.0, max_score: 50, created_at: '2026-08-20T14:00:00Z' },
    { id: 'mrk-4', enrollment_id: 'enr-1', assessment: 'Final Practical Project', score: 95.0, max_score: 100, created_at: '2026-08-24T16:00:00Z' },

    { id: 'mrk-5', enrollment_id: 'enr-5', assessment: 'Midterm Exam 1', score: 42.0, max_score: 50, created_at: '2026-08-10T10:00:00Z' },
    { id: 'mrk-6', enrollment_id: 'enr-5', assessment: 'Cloud Architecture Assignment', score: 18.5, max_score: 20, created_at: '2026-08-15T12:00:00Z' },
    { id: 'mrk-7', enrollment_id: 'enr-5', assessment: 'Midterm Exam 2', score: 44.0, max_score: 50, created_at: '2026-08-20T14:00:00Z' },
    { id: 'mrk-8', enrollment_id: 'enr-5', assessment: 'Final Practical Project', score: 89.5, max_score: 100, created_at: '2026-08-24T16:00:00Z' },

    { id: 'mrk-9', enrollment_id: 'enr-9', assessment: 'Midterm Exam 1', score: 38.5, max_score: 50, created_at: '2026-08-10T10:00:00Z' },
    { id: 'mrk-10', enrollment_id: 'enr-9', assessment: 'Cloud Architecture Assignment', score: 16.0, max_score: 20, created_at: '2026-08-15T12:00:00Z' },
    { id: 'mrk-11', enrollment_id: 'enr-9', assessment: 'Midterm Exam 2', score: 39.0, max_score: 50, created_at: '2026-08-20T14:00:00Z' },
    { id: 'mrk-12', enrollment_id: 'enr-9', assessment: 'Final Practical Project', score: 81.0, max_score: 100, created_at: '2026-08-24T16:00:00Z' },
  ],

  exams: [
    {
      id: 'ex-1',
      course_id: 'crs-1',
      course_code: 'CS501',
      course_name: 'Cloud Computing & Distributed Systems',
      title: 'Semester 5 Midterm Examination',
      exam_type: 'MIDTERM',
      exam_date: '2026-09-15',
      start_time: '10:00 AM',
      end_time: '12:00 PM',
      duration_minutes: 120,
      room: 'Cloud Systems Lab 302',
      semester: 5,
      academic_year: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'Bring your student ID card. Laptop with secure browser environment allowed.',
      created_at: '2026-08-01T09:00:00Z',
    },
    {
      id: 'ex-2',
      course_id: 'crs-2',
      course_code: 'CS502',
      course_name: 'Relational Database Architecture',
      title: 'Database Practical Evaluation',
      exam_type: 'PRACTICAL',
      exam_date: '2026-09-18',
      start_time: '02:00 PM',
      end_time: '04:30 PM',
      duration_minutes: 150,
      room: 'Database Lab 104',
      semester: 5,
      academic_year: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'PostgreSQL CLI query optimization and index design problems.',
      created_at: '2026-08-02T09:00:00Z',
    },
    {
      id: 'ex-3',
      course_id: 'crs-4',
      course_code: 'IT501',
      course_name: 'Network Security & Cryptography',
      title: 'Final Theory Assessment',
      exam_type: 'FINAL',
      exam_date: '2026-10-05',
      start_time: '09:30 AM',
      end_time: '12:30 PM',
      duration_minutes: 180,
      room: 'Hall A',
      semester: 5,
      academic_year: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'Comprehensive semester examination.',
      created_at: '2026-08-05T09:00:00Z',
    },
  ],

  auditLogs: [
    {
      id: 'aud-1',
      action: 'SYSTEM_SEED_INITIALIZATION',
      entity: 'SYSTEM',
      entity_id: 'admin-1',
      actor_name: 'System Administrator',
      actor_role: 'ADMIN',
      created_at: '2026-08-25T14:00:00Z',
      details: { note: 'Cloud SMS online showcase environment active' },
    },
    {
      id: 'aud-2',
      action: 'USER_LOGIN',
      entity: 'USER',
      entity_id: 'usr-admin-1',
      actor_name: 'System Administrator',
      actor_role: 'ADMIN',
      created_at: '2026-08-25T14:10:00Z',
      details: { ip: '127.0.0.1', method: 'SECURE_JWT' },
    },
  ],
};

// Retrieve or initialize store in localStorage
function getStore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore error and return fresh clone
  }
  const fresh = JSON.parse(JSON.stringify(initialStore));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch (e) {}
  return fresh;
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {}
}

// Current active session user
function getCurrentMockUser() {
  try {
    const savedUser = localStorage.getItem('sms_user_data');
    if (savedUser) return JSON.parse(savedUser);
  } catch (e) {}
  return null;
}

// Mock API Handler Dispatcher
export const handleMockRequest = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const store = getStore();

  // Artificial short delay for realistic snappy response
  await new Promise((res) => setTimeout(res, 80));

  // 1. AUTH ENDPOINTS
  if (endpoint.startsWith('/auth/login') && method === 'POST') {
    const { email } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    let user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      if (cleanEmail.includes('admin')) user = store.users.find((u) => u.role === 'ADMIN');
      else if (cleanEmail.includes('faculty') || cleanEmail.includes('smith')) user = store.users.find((u) => u.role === 'FACULTY');
      else if (cleanEmail.includes('student') || cleanEmail.includes('alex')) user = store.users.find((u) => u.role === 'STUDENT');
      else user = store.users[0]; // fallback
    }

    let extra = {};
    if (user.role === 'FACULTY') {
      const fac = store.faculty.find((f) => f.user_id === user.id) || store.faculty[0];
      extra.facultyId = fac?.id;
    } else if (user.role === 'STUDENT') {
      const stu = store.students.find((s) => s.user_id === user.id) || store.students[0];
      extra.studentId = stu?.id;
      extra.rollNo = stu?.roll_no;
    }

    const authData = {
      user: { ...user, ...extra },
      token: `demo-jwt-token-${user.id}-${Date.now()}`,
    };

    localStorage.setItem('sms_user_data', JSON.stringify(authData.user));
    return { success: true, data: authData };
  }

  if (endpoint.startsWith('/auth/me')) {
    const user = getCurrentMockUser() || store.users[0];
    return { success: true, data: { user } };
  }

  if (endpoint.startsWith('/auth/profile') && method === 'PUT') {
    const current = getCurrentMockUser() || store.users[0];
    const updated = { ...current, ...body };
    localStorage.setItem('sms_user_data', JSON.stringify(updated));
    return { success: true, data: { user: updated } };
  }

  if (endpoint.startsWith('/auth/logout')) {
    return { success: true, message: 'Logged out successfully' };
  }

  // 2. DASHBOARD
  if (endpoint.startsWith('/dashboard')) {
    const currentUser = getCurrentMockUser() || store.users[0];
    const role = currentUser.role || 'ADMIN';

    if (role === 'ADMIN') {
      return {
        success: true,
        data: {
          role: 'ADMIN',
          kpis: {
            totalStudents: store.students.length,
            totalFaculty: store.faculty.length,
            totalCourses: store.courses.length,
            activeEnrollments: store.enrollments.length,
            overallAttendanceRate: 92.5,
          },
          departmentDistribution: [
            { department: 'Computer Science', student_count: '4' },
            { department: 'Information Technology', student_count: '1' },
          ],
          recentActivity: store.auditLogs.slice(0, 8),
        },
      };
    }

    if (role === 'FACULTY') {
      const assigned = store.courses.filter((c) => c.faculty_id === 'fac-1' || c.faculty_name?.includes('Smith'));
      return {
        success: true,
        data: {
          role: 'FACULTY',
          kpis: {
            assignedCoursesCount: assigned.length || 2,
            totalStudentsAssigned: 4,
            courseAttendanceRate: 94.0,
          },
          assignedCourses: assigned.map((c) => ({ ...c, enrolled_students: 4 })),
          recentMarks: store.marks.slice(0, 6).map((m) => ({
            ...m,
            course_code: 'CS501',
            student_name: 'Alex Johnson',
          })),
        },
      };
    }

    if (role === 'STUDENT') {
      const studentCourses = store.courses.slice(0, 4);
      return {
        success: true,
        data: {
          role: 'STUDENT',
          kpis: {
            enrolledCoursesCount: studentCourses.length,
            overallAttendance: 95.0,
            totalClasses: 20,
            attendedClasses: 19,
          },
          enrolledCourses: studentCourses,
          courseAttendance: studentCourses.map((c) => ({
            course_code: c.code,
            course_name: c.name,
            total_classes: 5,
            attended_classes: 5,
            percentage: 100,
          })),
          marks: store.marks.slice(0, 4).map((m) => ({
            ...m,
            course_code: 'CS501',
            course_name: 'Cloud Computing & Distributed Systems',
          })),
        },
      };
    }
  }

  // 3. EXAMS
  if (endpoint.startsWith('/exams/upcoming')) {
    return { success: true, data: { upcomingExams: store.exams } };
  }

  if (endpoint.startsWith('/exams')) {
    if (method === 'GET') {
      return { success: true, data: { exams: store.exams } };
    }
    if (method === 'POST') {
      const newExam = {
        id: `ex-${Date.now()}`,
        ...body,
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
      };
      store.exams.unshift(newExam);
      saveStore(store);
      return { success: true, data: { exam: newExam } };
    }
    if (method === 'DELETE') {
      const id = endpoint.split('/')[2];
      store.exams = store.exams.filter((e) => e.id !== id);
      saveStore(store);
      return { success: true, message: 'Exam deleted successfully' };
    }
  }

  // 4. STUDENTS
  if (endpoint.startsWith('/students')) {
    const parts = endpoint.split('?')[0].split('/');
    const studentId = parts[2];

    if (studentId && method === 'GET') {
      const student = store.students.find((s) => s.id === studentId) || store.students[0];
      const enrolledCourses = store.courses.slice(0, 4);
      const studentAttendance = store.attendance.filter((a) => a.enrollment_id === 'enr-1');
      const studentMarks = store.marks.filter((m) => m.enrollment_id === 'enr-1');

      return {
        success: true,
        data: {
          student,
          enrolledCourses,
          attendanceRecords: studentAttendance,
          marksRecords: studentMarks,
          stats: {
            totalEnrolledCourses: enrolledCourses.length,
            overallAttendanceRate: 95.0,
            averageMarksPercentage: 92.4,
          },
        },
      };
    }

    if (studentId && (method === 'PATCH' || method === 'PUT')) {
      const idx = store.students.findIndex((s) => s.id === studentId);
      if (idx !== -1) {
        store.students[idx] = { ...store.students[idx], ...body };
        saveStore(store);
        return { success: true, data: { student: store.students[idx] } };
      }
    }

    if (studentId && method === 'DELETE') {
      store.students = store.students.filter((s) => s.id !== studentId);
      saveStore(store);
      return { success: true, message: 'Student removed successfully' };
    }

    if (method === 'POST') {
      const newStu = {
        id: `stu-${Date.now()}`,
        user_id: `usr-${Date.now()}`,
        name: body.name || 'New Student',
        email: body.email || 'student@university.edu',
        phone: body.phone || '+1 555 000-0000',
        roll_no: body.rollNo || `CS2026-${Math.floor(100 + Math.random() * 900)}`,
        department: body.department || 'Computer Science',
        semester: Number(body.semester) || 5,
        admission_year: Number(body.admissionYear) || 2024,
        status: 'ACTIVE',
      };
      store.students.unshift(newStu);
      saveStore(store);
      return { success: true, data: { student: newStu } };
    }

    // List students with search and pagination
    const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
    const search = (urlParams.get('search') || '').toLowerCase();
    const dept = urlParams.get('department') || '';
    const sem = urlParams.get('semester') || '';

    let filtered = [...store.students];
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.roll_no.toLowerCase().includes(search)
      );
    }
    if (dept) filtered = filtered.filter((s) => s.department === dept);
    if (sem) filtered = filtered.filter((s) => s.semester === Number(sem));

    return {
      success: true,
      data: {
        students: filtered,
        pagination: {
          page: 1,
          limit: 10,
          totalRecords: filtered.length,
          totalPages: 1,
        },
      },
    };
  }

  // 5. FACULTY
  if (endpoint.startsWith('/faculty')) {
    const parts = endpoint.split('?')[0].split('/');
    const facultyId = parts[2];

    if (facultyId && method === 'GET') {
      const fac = store.faculty.find((f) => f.id === facultyId) || store.faculty[0];
      const assignedCourses = store.courses.filter((c) => c.faculty_id === fac.id);
      return {
        success: true,
        data: {
          faculty: fac,
          assignedCourses,
        },
      };
    }

    if (method === 'POST') {
      const newFac = {
        id: `fac-${Date.now()}`,
        user_id: `usr-${Date.now()}`,
        name: body.name || 'New Faculty',
        email: body.email || 'faculty@university.edu',
        employee_id: body.employeeId || `FAC-CS-${Math.floor(100 + Math.random() * 900)}`,
        department: body.department || 'Computer Science',
        designation: body.designation || 'Assistant Professor',
        status: 'ACTIVE',
      };
      store.faculty.unshift(newFac);
      saveStore(store);
      return { success: true, data: { faculty: newFac } };
    }

    return {
      success: true,
      data: {
        faculty: store.faculty,
        pagination: { page: 1, limit: 10, totalRecords: store.faculty.length, totalPages: 1 },
      },
    };
  }

  // 6. COURSES
  if (endpoint.startsWith('/courses')) {
    const parts = endpoint.split('?')[0].split('/');
    const courseId = parts[2];

    if (courseId && method === 'GET') {
      const course = store.courses.find((c) => c.id === courseId) || store.courses[0];
      const enrolledStudents = store.students.map((s) => ({
        id: s.id,
        enrollment_id: `enr-${s.id}`,
        name: s.name,
        roll_no: s.roll_no,
        email: s.email,
        department: s.department,
        status: 'ACTIVE',
      }));
      return {
        success: true,
        data: {
          course,
          enrolledStudents,
        },
      };
    }

    if (method === 'POST') {
      const newCourse = {
        id: `crs-${Date.now()}`,
        code: body.code || `CS${Math.floor(500 + Math.random() * 100)}`,
        name: body.name || 'New Course',
        credits: Number(body.credits) || 3,
        department: body.department || 'Computer Science',
        semester: Number(body.semester) || 5,
        faculty_id: body.facultyId || 'fac-1',
        faculty_name: 'Dr. Robert Smith',
        status: 'ACTIVE',
      };
      store.courses.unshift(newCourse);
      saveStore(store);
      return { success: true, data: { course: newCourse } };
    }

    if (courseId && method === 'DELETE') {
      store.courses = store.courses.filter((c) => c.id !== courseId);
      saveStore(store);
      return { success: true, message: 'Course deleted successfully' };
    }

    return {
      success: true,
      data: {
        courses: store.courses,
        pagination: { page: 1, limit: 10, totalRecords: store.courses.length, totalPages: 1 },
      },
    };
  }

  // 7. ATTENDANCE
  if (endpoint.startsWith('/attendance/course')) {
    return {
      success: true,
      data: {
        summary: {
          totalClasses: 5,
          overallRate: 92.5,
          studentSummaries: store.students.map((s) => ({
            student_id: s.id,
            student_name: s.name,
            roll_no: s.roll_no,
            present_count: 5,
            total_count: 5,
            percentage: 100,
          })),
        },
      },
    };
  }

  if (endpoint.startsWith('/attendance')) {
    if (method === 'POST') {
      return { success: true, message: 'Attendance recorded successfully' };
    }
    return {
      success: true,
      data: {
        attendance: store.attendance,
      },
    };
  }

  // 8. MARKS
  if (endpoint.startsWith('/marks/course')) {
    return {
      success: true,
      data: {
        stats: {
          average: 84.5,
          highest: 96.0,
          lowest: 68.0,
          totalAssessed: store.students.length,
        },
      },
    };
  }

  if (endpoint.startsWith('/marks')) {
    if (method === 'POST') {
      return { success: true, message: 'Marks submitted successfully' };
    }
    return {
      success: true,
      data: {
        marks: store.marks,
      },
    };
  }

  // 9. REPORTS
  if (endpoint.startsWith('/reports')) {
    return {
      success: true,
      data: {
        academicYear: '2024-2025',
        departmentSummary: [
          {
            department: 'Computer Science',
            total_students: 4,
            active_courses: 4,
            avg_marks_percentage: 88.5,
            avg_attendance_rate: 93.0,
          },
          {
            department: 'Information Technology',
            total_students: 1,
            active_courses: 1,
            avg_marks_percentage: 85.0,
            avg_attendance_rate: 90.0,
          },
        ],
        coursePerformance: store.courses.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          department: c.department,
          semester: c.semester,
          faculty_lead: c.faculty_name,
          enrolled_count: 4,
          course_avg_percentage: 86.4,
          course_attendance_rate: 92.0,
          total_assessments_recorded: 4,
        })),
        topStudents: store.students.map((s, i) => ({
          id: s.id,
          roll_no: s.roll_no,
          student_name: s.name,
          department: s.department,
          semester: s.semester,
          aggregate_score: (94.5 - i * 3.2).toFixed(2),
          attendance_rate: (98 - i * 2.0).toFixed(1),
        })),
      },
    };
  }

  // 10. AUDIT LOGS
  if (endpoint.startsWith('/audit-logs')) {
    return {
      success: true,
      data: {
        logs: store.auditLogs,
      },
    };
  }

  // 11. ENROLLMENTS
  if (endpoint.startsWith('/enrollments')) {
    return { success: true, message: 'Enrollment updated successfully' };
  }

  // 12. HEALTH
  if (endpoint.startsWith('/health')) {
    return {
      success: true,
      data: {
        status: 'UP',
        mode: 'DEMO_SHOWCASE',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Default fallback
  return { success: true, data: {} };
};
