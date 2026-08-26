import * as firebaseAuth from './firebaseAuth';
import * as firebaseDb from './firebaseDb';

/**
 * Rejects envelopes that report a failure so callers can never mistake an
 * unsuccessful response for a successful one.
 */
const assertSuccess = (name, result) => {
  if (result && result.success === false) {
    const { code, message } = result.error || {};
    console.error(`[API] ${name} returned an unsuccessful response:`, code, message);
    throw Object.assign(new Error(message || `${name} failed.`), { code });
  }
  return result;
};

const withFailureCheck = (methods) =>
  Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
      name,
      async (...args) => assertSuccess(name, await method(...args)),
    ])
  );

/**
 * Cloud Student Management System Unified API Interface
 * Powered by Firebase Authentication & Cloud Firestore
 */
export const api = withFailureCheck({
  // Authentication & Profile (Firebase Auth + Firestore)
  login: (credentials) => firebaseAuth.loginWithFirebase(credentials.email, credentials.password),
  getMe: () => firebaseAuth.getFirebaseMe(),
  updateProfile: (data) => firebaseAuth.updateFirebaseProfile(data),
  logout: () => firebaseAuth.logoutFromFirebase(),
  changePassword: (data) => firebaseAuth.changeFirebasePassword(data.currentPassword, data.newPassword),
  changeEmail: (data) => firebaseAuth.changeFirebaseEmail(data.newEmail, data.currentPassword),

  // Dashboard Aggregations (Cloud Firestore)
  getDashboard: () => firebaseDb.getDashboardStats(),

  // Students (Cloud Firestore)
  getStudents: (params) => firebaseDb.getStudents(params),
  getStudentById: (id) => firebaseDb.getStudentById(id),
  createStudent: (data) => firebaseDb.createStudent(data),
  updateStudent: (id, data) => firebaseDb.updateStudent(id, data),
  deleteStudent: (id) => firebaseDb.deleteStudent(id),

  // Faculty (Cloud Firestore)
  getFaculty: (params) => firebaseDb.getFaculty(params),
  getFacultyById: (id) => firebaseDb.getFacultyById(id),
  createFaculty: (data) => firebaseDb.createFaculty(data),
  updateFaculty: (id, data) => firebaseDb.updateFaculty(id, data),

  // Courses (Cloud Firestore)
  getCourses: (params) => firebaseDb.getCourses(params),
  getCourseById: (id) => firebaseDb.getCourseById(id),
  createCourse: (data) => firebaseDb.createCourse(data),
  updateCourse: (id, data) => firebaseDb.updateCourse(id, data),
  deleteCourse: (id) => firebaseDb.deleteCourse(id),

  // Enrollments (Cloud Firestore)
  createEnrollment: (data) => firebaseDb.createEnrollment(data),
  bulkEnroll: (data) => firebaseDb.bulkEnroll(data),
  deleteEnrollment: (id) => firebaseDb.deleteEnrollment(id),

  // Attendance (Cloud Firestore)
  getAttendance: (params) => firebaseDb.getAttendance(params),
  getCourseAttendanceSummary: (courseId) => firebaseDb.getCourseAttendanceSummary(courseId),
  recordAttendance: (data) => firebaseDb.recordAttendance(data),

  // Marks (Cloud Firestore)
  getMarks: (params) => firebaseDb.getMarks(params),
  getCourseMarkStats: (courseId) => firebaseDb.getCourseMarkStats(courseId),
  recordMarks: (data) => firebaseDb.recordMarks(data),

  // Reports (Cloud Firestore)
  getReports: (params) => firebaseDb.getAcademicReports(params),

  // Audit Logs (Cloud Firestore)
  getAuditLogs: (params) => firebaseDb.getAuditLogs(params),

  // Exams & Schedule (Cloud Firestore)
  getExams: (params) => firebaseDb.getExams(params),
  getUpcomingExams: () => firebaseDb.getUpcomingExams(),
  createExam: (data) => firebaseDb.createExam(data),
  updateExam: (id, data) => firebaseDb.updateExam(id, data),
  deleteExam: (id) => firebaseDb.deleteExam(id),

  // Health & Cloud Telemetry
  getHealth: () => firebaseDb.getHealth(),
});
