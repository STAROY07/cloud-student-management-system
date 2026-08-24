const { z } = require('zod');

const EXAM_TYPES = ['MIDTERM', 'FINAL', 'QUIZ', 'LAB', 'PRACTICAL'];
const EXAM_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const createExamSchema = {
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required.'),
    title: z.string().min(3, 'Exam title must be at least 3 characters.').max(150),
    examType: z.enum(EXAM_TYPES, { errorMap: () => ({ message: 'Invalid exam type. Must be MIDTERM, FINAL, QUIZ, LAB, or PRACTICAL.' }) }),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Exam date must be in YYYY-MM-DD format.'),
    startTime: z.string().min(1, 'Start time is required.'),
    endTime: z.string().min(1, 'End time is required.'),
    durationMinutes: z.number().int().positive().default(120),
    room: z.string().min(1, 'Room / Venue is required.').max(50),
    semester: z.number().int().min(1).max(8).default(5),
    academicYear: z.string().min(4, 'Academic year is required.').max(20).default('2024-2025'),
    instructions: z.string().max(1000).optional().nullable(),
  }),
};

const updateExamSchema = {
  params: z.object({
    id: z.string().min(1, 'Exam ID is required.'),
  }),
  body: z.object({
    title: z.string().min(3).max(150).optional(),
    examType: z.enum(EXAM_TYPES).optional(),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    room: z.string().max(50).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    academicYear: z.string().max(20).optional(),
    instructions: z.string().max(1000).optional().nullable(),
    status: z.enum(EXAM_STATUSES).optional(),
  }),
};

module.exports = {
  createExamSchema,
  updateExamSchema,
  EXAM_TYPES,
  EXAM_STATUSES,
};
