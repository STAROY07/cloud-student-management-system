const test = require('node:test');
const assert = require('node:assert');
const {
  loginSchema,
  changePasswordSchema,
  changeEmailSchema,
  updateProfileSchema,
} = require('../src/validators/auth.validator');
const { recordAttendanceSchema } = require('../src/validators/attendance.validator');
const { createCourseSchema, updateCourseSchema } = require('../src/validators/course.validator');
const { createEnrollmentSchema, bulkEnrollSchema } = require('../src/validators/enrollment.validator');
const {
  createExamSchema,
  updateExamSchema,
  EXAM_TYPES,
  EXAM_STATUSES,
} = require('../src/validators/exam.validator');
const { createFacultySchema, updateFacultySchema } = require('../src/validators/faculty.validator');
const { recordMarksSchema } = require('../src/validators/mark.validator');
const { createStudentSchema, updateStudentSchema } = require('../src/validators/student.validator');

const UUID = '123e4567-e89b-42d3-a456-426614174000';

test('Request validator schemas', async (t) => {
  await t.test('accept valid authentication payloads and reject invalid credentials', async () => {
    const login = await loginSchema.body.parseAsync({
      email: 'student@university.edu',
      password: 'secret123',
    });
    assert.strictEqual(login.email, 'student@university.edu');
    assert.throws(() => loginSchema.body.parse({ email: 'invalid', password: 'short' }));

    assert.doesNotThrow(() => changePasswordSchema.body.parse({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    }));
    assert.doesNotThrow(() => changeEmailSchema.body.parse({
      newEmail: 'new@university.edu',
      currentPassword: 'old-secret',
    }));
    assert.doesNotThrow(() => updateProfileSchema.body.parse({
      name: 'Alex Johnson',
      phone: '+1 (555) 123-4567',
    }));
  });

  await t.test('validate student and faculty create/update payloads', () => {
    const student = createStudentSchema.body.parse({
      name: 'Alex Johnson',
      email: 'alex@university.edu',
      phone: '+1 555 123 4567',
      password: 'secret123',
      rollNo: 'CS-001',
      department: 'Computer Science',
      semester: 5,
      admissionYear: 2024,
    });
    assert.strictEqual(student.semester, 5);
    assert.throws(() => createStudentSchema.body.parse({ ...student, semester: 9 }));
    assert.deepStrictEqual(updateStudentSchema.body.parse({ status: 'SUSPENDED' }), {
      status: 'SUSPENDED',
    });

    const faculty = createFacultySchema.body.parse({
      name: 'Dr. Smith',
      email: 'smith@university.edu',
      employeeId: 'FAC-001',
      department: 'Computer Science',
      designation: 'Professor',
    });
    assert.strictEqual(faculty.employeeId, 'FAC-001');
    assert.throws(() => updateFacultySchema.body.parse({ email: 'invalid' }));
  });

  await t.test('validate course and enrollment payloads', () => {
    const course = createCourseSchema.body.parse({
      code: 'CS501',
      name: 'Cloud Computing',
      credits: 4,
      department: 'Computer Science',
      semester: 5,
      facultyId: UUID,
    });
    assert.strictEqual(course.credits, 4);
    assert.deepStrictEqual(updateCourseSchema.body.parse({ facultyId: null }), {
      facultyId: null,
    });
    assert.throws(() => createCourseSchema.body.parse({ ...course, credits: 11 }));

    assert.doesNotThrow(() => createEnrollmentSchema.body.parse({
      studentId: UUID,
      courseId: UUID,
      academicYear: '2024-2025',
    }));
    assert.doesNotThrow(() => bulkEnrollSchema.body.parse({
      studentIds: [UUID],
      courseIds: [UUID],
      academicYear: '2024-2025',
    }));
    assert.throws(() => bulkEnrollSchema.body.parse({
      studentIds: [],
      courseIds: [UUID],
      academicYear: '2024-2025',
    }));
  });

  await t.test('validate attendance and mark boundaries', () => {
    assert.doesNotThrow(() => recordAttendanceSchema.body.parse({
      courseId: UUID,
      date: '2026-08-26',
      records: [{ enrollmentId: UUID, status: 'PRESENT' }],
    }));
    assert.throws(() => recordAttendanceSchema.body.parse({
      courseId: UUID,
      date: '26-08-2026',
      records: [{ enrollmentId: UUID, status: 'PRESENT' }],
    }));

    assert.doesNotThrow(() => recordMarksSchema.body.parse({
      courseId: UUID,
      assessment: 'Midterm',
      maxScore: 50,
      records: [{ enrollmentId: UUID, score: 49.5 }],
    }));
    assert.throws(() => recordMarksSchema.body.parse({
      courseId: UUID,
      assessment: 'Midterm',
      maxScore: 50,
      records: [{ enrollmentId: UUID, score: 51 }],
    }));
  });

  await t.test('validate exam defaults, enum values, and updates', () => {
    const exam = createExamSchema.body.parse({
      courseId: UUID,
      title: 'Cloud Computing Midterm',
      examType: 'MIDTERM',
      examDate: '2026-09-15',
      startTime: '10:00',
      endTime: '12:00',
      room: 'A-204',
    });
    assert.strictEqual(exam.durationMinutes, 120);
    assert.strictEqual(exam.semester, 5);
    assert.ok(EXAM_TYPES.includes(exam.examType));
    assert.ok(EXAM_STATUSES.includes('CANCELLED'));

    assert.deepStrictEqual(updateExamSchema.body.parse({ status: 'COMPLETED' }), {
      status: 'COMPLETED',
    });
    assert.deepStrictEqual(updateExamSchema.params.parse({ id: 'exam-1' }), {
      id: 'exam-1',
    });
    assert.throws(() => createExamSchema.body.parse({ ...exam, examType: 'UNKNOWN' }));
  });
});
