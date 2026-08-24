const { z } = require('zod');

const createStudentSchema = {
  body: z.object({
    name: z.string().min(2, 'Full name must be at least 2 characters.'),
    email: z.string().email('Valid university email is required.'),
    phone: z.string().min(7, 'Phone number must be at least 7 digits.').max(20, 'Phone number is too long.').regex(/^[+0-9\s-()]+$/, 'Invalid phone number format.'),
    password: z.string().min(6, 'Temporary password must be at least 6 characters.'),
    rollNo: z.string().min(2, 'Roll number is required.').max(50),
    department: z.string().min(2, 'Department is required.'),
    semester: z.number().int().min(1).max(8),
    admissionYear: z.number().int().min(2000).max(2100),
  }),
};

const updateStudentSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).regex(/^[+0-9\s-()]+$/).optional(),
    department: z.string().min(2).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    admissionYear: z.number().int().min(2000).max(2100).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  }),
};

module.exports = {
  createStudentSchema,
  updateStudentSchema,
};
