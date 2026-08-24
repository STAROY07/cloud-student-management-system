const { z } = require('zod');

const recordAttendanceSchema = {
  body: z.object({
    courseId: z.string().min(1, 'Valid course ID is required.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD.'),
    records: z.array(
      z.object({
        enrollmentId: z.string().min(1, 'Valid enrollment ID is required.'),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      })
    ).min(1, 'At least one student attendance record is required.'),
  }),
};

module.exports = {
  recordAttendanceSchema,
};
