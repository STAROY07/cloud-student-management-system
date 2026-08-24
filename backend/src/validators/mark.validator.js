const { z } = require('zod');

const recordMarksSchema = {
  body: z.object({
    courseId: z.string().min(1, 'Valid course ID is required.'),
    assessment: z.string().min(2, 'Assessment name is required.').max(100),
    maxScore: z.number().positive('Max score must be positive.'),
    records: z.array(
      z.object({
        enrollmentId: z.string().min(1, 'Valid enrollment ID is required.'),
        score: z.number().min(0, 'Score cannot be negative.'),
      })
    ).min(1, 'At least one student mark entry is required.'),
  }).refine((data) => {
    return data.records.every((r) => r.score <= data.maxScore);
  }, {
    message: 'Student score cannot exceed the maximum score.',
    path: ['records'],
  }),
};

module.exports = {
  recordMarksSchema,
};
