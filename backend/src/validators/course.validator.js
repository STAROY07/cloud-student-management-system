const { z } = require('zod');

const createCourseSchema = {
  body: z.object({
    code: z.string().min(2, 'Course code is required.').max(20),
    name: z.string().min(2, 'Course name is required.').max(150),
    credits: z.number().int().min(1, 'Credits must be at least 1.').max(10),
    department: z.string().min(2, 'Department is required.'),
    semester: z.number().int().min(1).max(8),
    facultyId: z.string().uuid('Invalid faculty ID.').nullable().optional(),
  }),
};

const updateCourseSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    credits: z.number().int().min(1).max(10).optional(),
    department: z.string().min(2).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    facultyId: z.string().uuid().nullable().optional(),
  }),
};

module.exports = {
  createCourseSchema,
  updateCourseSchema,
};
