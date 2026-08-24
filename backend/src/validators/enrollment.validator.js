const { z } = require('zod');

const createEnrollmentSchema = {
  body: z.object({
    studentId: z.string().uuid('Valid student ID is required.'),
    courseId: z.string().uuid('Valid course ID is required.'),
    academicYear: z.string().min(4, 'Academic year is required (e.g. 2024-2025).'),
  }),
};

const bulkEnrollSchema = {
  body: z.object({
    studentIds: z.array(z.string().uuid()).min(1, 'At least one student is required.'),
    courseIds: z.array(z.string().uuid()).min(1, 'At least one course is required.'),
    academicYear: z.string().min(4, 'Academic year is required.'),
  }),
};

module.exports = {
  createEnrollmentSchema,
  bulkEnrollSchema,
};
