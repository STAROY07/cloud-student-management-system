import { doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const SEED_FLAG_DOC = 'system_metadata/seed_status';

export const INITIAL_SEED_DATA = {
  faculty: [
    {
      id: 'fac-1',
      userId: 'usr-fac-1',
      employeeId: 'FAC-CS-001',
      name: 'Dr. Robert Smith',
      email: 'dr.smith@university.edu',
      phone: '+1 (555) 111-2233',
      department: 'Computer Science',
      designation: 'Professor & HOD',
      status: 'ACTIVE',
    },
    {
      id: 'fac-2',
      userId: 'usr-fac-2',
      employeeId: 'FAC-IT-002',
      name: 'Prof. Sarah Davis',
      email: 'prof.davis@university.edu',
      phone: '+1 (555) 222-3344',
      department: 'Information Technology',
      designation: 'Associate Professor',
      status: 'ACTIVE',
    },
    {
      id: 'fac-3',
      userId: 'usr-fac-3',
      employeeId: 'FAC-CS-003',
      name: 'Dr. Anita Patel',
      email: 'dr.patel@university.edu',
      phone: '+1 (555) 333-4455',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      status: 'ACTIVE',
    },
  ],

  students: [
    {
      id: 'stu-1',
      userId: 'usr-stu-1',
      rollNo: 'CS2024-001',
      name: 'Alex Johnson',
      email: 'student.alex@university.edu',
      phone: '+1 (555) 234-5678',
      department: 'Computer Science',
      semester: 5,
      admissionYear: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-2',
      userId: 'usr-stu-2',
      rollNo: 'CS2024-002',
      name: 'Emma Williams',
      email: 'student.emma@university.edu',
      phone: '+1 (555) 345-6789',
      department: 'Computer Science',
      semester: 5,
      admissionYear: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-3',
      userId: 'usr-stu-3',
      rollNo: 'CS2024-003',
      name: 'Michael Brown',
      email: 'student.michael@university.edu',
      phone: '+1 (555) 456-7890',
      department: 'Computer Science',
      semester: 5,
      admissionYear: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-4',
      userId: 'usr-stu-4',
      rollNo: 'IT2024-001',
      name: 'Sophia Taylor',
      email: 'student.sophia@university.edu',
      phone: '+1 (555) 567-8901',
      department: 'Information Technology',
      semester: 5,
      admissionYear: 2022,
      status: 'ACTIVE',
    },
    {
      id: 'stu-5',
      userId: 'usr-stu-5',
      rollNo: 'CS2024-004',
      name: 'David Miller',
      email: 'student.david@university.edu',
      phone: '+1 (555) 678-9012',
      department: 'Computer Science',
      semester: 5,
      admissionYear: 2022,
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
      facultyId: 'fac-1',
      facultyName: 'Dr. Robert Smith',
      description: 'Covers Cloud Run, Firestore, IAM, distributed architecture, and security policies.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-2',
      code: 'CS502',
      name: 'Relational Database Architecture',
      credits: 3,
      department: 'Computer Science',
      semester: 5,
      facultyId: 'fac-3',
      facultyName: 'Dr. Anita Patel',
      description: 'Transactions, indexing, query execution planning, and high availability systems.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-3',
      code: 'CS503',
      name: 'Advanced Operating Systems',
      credits: 4,
      department: 'Computer Science',
      semester: 5,
      facultyId: 'fac-1',
      facultyName: 'Dr. Robert Smith',
      description: 'Process synchronization, memory management, container virtualization, and kernel modules.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-4',
      code: 'IT501',
      name: 'Network Security & Cryptography',
      credits: 3,
      department: 'Information Technology',
      semester: 5,
      facultyId: 'fac-2',
      facultyName: 'Prof. Sarah Davis',
      description: 'Zero Trust architecture, TLS, asymmetric cryptography, and authentication tokens.',
      status: 'ACTIVE',
    },
    {
      id: 'crs-5',
      code: 'CS504',
      name: 'Software Engineering & Cloud Architecture',
      credits: 3,
      department: 'Computer Science',
      semester: 5,
      facultyId: 'fac-3',
      facultyName: 'Dr. Anita Patel',
      description: 'CI/CD automation, cloud patterns, clean architecture, and deployment pipelines.',
      status: 'ACTIVE',
    },
  ],

  enrollments: [
    { id: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-2', studentId: 'stu-1', courseId: 'crs-2', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-3', studentId: 'stu-1', courseId: 'crs-3', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-4', studentId: 'stu-1', courseId: 'crs-5', academicYear: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-6', studentId: 'stu-2', courseId: 'crs-2', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-7', studentId: 'stu-2', courseId: 'crs-3', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-8', studentId: 'stu-2', courseId: 'crs-5', academicYear: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-10', studentId: 'stu-3', courseId: 'crs-2', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-11', studentId: 'stu-3', courseId: 'crs-3', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-12', studentId: 'stu-3', courseId: 'crs-5', academicYear: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-13', studentId: 'stu-4', courseId: 'crs-4', academicYear: '2024-2025', status: 'ACTIVE' },

    { id: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-15', studentId: 'stu-5', courseId: 'crs-2', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-16', studentId: 'stu-5', courseId: 'crs-3', academicYear: '2024-2025', status: 'ACTIVE' },
    { id: 'enr-17', studentId: 'stu-5', courseId: 'crs-5', academicYear: '2024-2025', status: 'ACTIVE' },
  ],

  attendance: [
    { id: 'att-1', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', date: '2026-08-01', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-2', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', date: '2026-08-05', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-3', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', date: '2026-08-10', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-4', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', date: '2026-08-15', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-5', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', date: '2026-08-20', status: 'PRESENT', markedBy: 'admin' },

    { id: 'att-6', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', date: '2026-08-01', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-7', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', date: '2026-08-05', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-8', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', date: '2026-08-10', status: 'ABSENT', markedBy: 'admin' },
    { id: 'att-9', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', date: '2026-08-15', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-10', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', date: '2026-08-20', status: 'PRESENT', markedBy: 'admin' },

    { id: 'att-11', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', date: '2026-08-01', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-12', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', date: '2026-08-05', status: 'LATE', markedBy: 'admin' },
    { id: 'att-13', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', date: '2026-08-10', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-14', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', date: '2026-08-15', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-15', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', date: '2026-08-20', status: 'PRESENT', markedBy: 'admin' },

    { id: 'att-16', enrollmentId: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', date: '2026-08-01', status: 'ABSENT', markedBy: 'admin' },
    { id: 'att-17', enrollmentId: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', date: '2026-08-05', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-18', enrollmentId: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', date: '2026-08-10', status: 'PRESENT', markedBy: 'admin' },
    { id: 'att-19', enrollmentId: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', date: '2026-08-15', status: 'ABSENT', markedBy: 'admin' },
    { id: 'att-20', enrollmentId: 'enr-14', studentId: 'stu-5', courseId: 'crs-1', date: '2026-08-20', status: 'PRESENT', markedBy: 'admin' },
  ],

  marks: [
    { id: 'mrk-1', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', assessment: 'Midterm Exam 1', score: 46.5, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-2', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', assessment: 'Cloud Architecture Assignment', score: 19.0, maxScore: 20, enteredBy: 'admin' },
    { id: 'mrk-3', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', assessment: 'Midterm Exam 2', score: 48.0, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-4', enrollmentId: 'enr-1', studentId: 'stu-1', courseId: 'crs-1', assessment: 'Final Practical Project', score: 95.0, maxScore: 100, enteredBy: 'admin' },

    { id: 'mrk-5', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', assessment: 'Midterm Exam 1', score: 42.0, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-6', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', assessment: 'Cloud Architecture Assignment', score: 18.5, maxScore: 20, enteredBy: 'admin' },
    { id: 'mrk-7', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', assessment: 'Midterm Exam 2', score: 44.0, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-8', enrollmentId: 'enr-5', studentId: 'stu-2', courseId: 'crs-1', assessment: 'Final Practical Project', score: 89.5, maxScore: 100, enteredBy: 'admin' },

    { id: 'mrk-9', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', assessment: 'Midterm Exam 1', score: 38.5, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-10', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', assessment: 'Cloud Architecture Assignment', score: 16.0, maxScore: 20, enteredBy: 'admin' },
    { id: 'mrk-11', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', assessment: 'Midterm Exam 2', score: 39.0, maxScore: 50, enteredBy: 'admin' },
    { id: 'mrk-12', enrollmentId: 'enr-9', studentId: 'stu-3', courseId: 'crs-1', assessment: 'Final Practical Project', score: 81.0, maxScore: 100, enteredBy: 'admin' },
  ],

  exams: [
    {
      id: 'ex-1',
      courseId: 'crs-1',
      courseCode: 'CS501',
      courseName: 'Cloud Computing & Distributed Systems',
      title: 'Semester 5 Midterm Examination',
      examType: 'MIDTERM',
      examDate: '2026-09-15',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      durationMinutes: 120,
      room: 'Cloud Systems Lab 302',
      semester: 5,
      academicYear: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'Bring student ID card. Laptop with secure browser environment allowed.',
      createdBy: 'admin',
    },
    {
      id: 'ex-2',
      courseId: 'crs-2',
      courseCode: 'CS502',
      courseName: 'Relational Database Architecture',
      title: 'Database Practical Evaluation',
      examType: 'PRACTICAL',
      examDate: '2026-09-18',
      startTime: '02:00 PM',
      endTime: '04:30 PM',
      durationMinutes: 150,
      room: 'Database Lab 104',
      semester: 5,
      academicYear: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'PostgreSQL CLI query optimization and index design problems.',
      createdBy: 'admin',
    },
    {
      id: 'ex-3',
      courseId: 'crs-4',
      courseCode: 'IT501',
      courseName: 'Network Security & Cryptography',
      title: 'Final Theory Assessment',
      examType: 'FINAL',
      examDate: '2026-10-05',
      startTime: '09:30 AM',
      endTime: '12:30 PM',
      durationMinutes: 180,
      room: 'Hall A',
      semester: 5,
      academicYear: '2024-2025',
      status: 'SCHEDULED',
      instructions: 'Comprehensive semester examination.',
      createdBy: 'admin',
    },
  ],

  auditLogs: [
    {
      id: 'aud-1',
      actorId: 'admin',
      actorName: 'System Administrator',
      actorRole: 'ADMIN',
      action: 'SYSTEM_FIREBASE_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: 'firebase-core',
      details: { note: 'Cloud Student Management System Firebase data layer initialized' },
      ipAddress: '127.0.0.1',
    },
  ],
};

let seedPromise = null;

/**
 * Ensures Firestore is populated with the initial university catalog and data records.
 */
export const ensureFirestoreSeeded = async () => {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      // Check if already seeded in Firestore
      const flagRef = doc(db, 'system_metadata', 'seed_status');
      const flagSnap = await getDoc(flagRef);
      if (flagSnap.exists() && flagSnap.data()?.seeded) {
        return true;
      }

      // Check if courses already exist
      const coursesSnap = await getDocs(collection(db, 'courses'));
      if (!coursesSnap.empty) {
        await setDoc(flagRef, { seeded: true, timestamp: serverTimestamp() }, { merge: true });
        return true;
      }

      console.info('[Firebase] Seeding baseline academic data into Cloud Firestore...');
      const batch = writeBatch(db);

      // Seed Faculty
      INITIAL_SEED_DATA.faculty.forEach((fac) => {
        const ref = doc(db, 'faculty', fac.id);
        batch.set(ref, { ...fac, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Students
      INITIAL_SEED_DATA.students.forEach((stu) => {
        const ref = doc(db, 'students', stu.id);
        batch.set(ref, { ...stu, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Courses
      INITIAL_SEED_DATA.courses.forEach((crs) => {
        const ref = doc(db, 'courses', crs.id);
        batch.set(ref, { ...crs, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Enrollments
      INITIAL_SEED_DATA.enrollments.forEach((enr) => {
        const ref = doc(db, 'enrollments', enr.id);
        batch.set(ref, { ...enr, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Attendance
      INITIAL_SEED_DATA.attendance.forEach((att) => {
        const ref = doc(db, 'attendance', att.id);
        batch.set(ref, { ...att, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Marks
      INITIAL_SEED_DATA.marks.forEach((mrk) => {
        const ref = doc(db, 'marks', mrk.id);
        batch.set(ref, { ...mrk, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Exams
      INITIAL_SEED_DATA.exams.forEach((ex) => {
        const ref = doc(db, 'exams', ex.id);
        batch.set(ref, { ...ex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Seed Audit Logs
      INITIAL_SEED_DATA.auditLogs.forEach((aud) => {
        const ref = doc(db, 'audit_logs', aud.id);
        batch.set(ref, { ...aud, createdAt: serverTimestamp() });
      });

      // Flag as seeded
      batch.set(flagRef, { seeded: true, timestamp: serverTimestamp() });

      await batch.commit();
      console.info('[Firebase] Firestore baseline seeding completed successfully.');
      return true;
    } catch (err) {
      console.warn('[Firebase] Firestore seed check or commit notice:', err.message);
      return false;
    }
  })();

  return seedPromise;
};
