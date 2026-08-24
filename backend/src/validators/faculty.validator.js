const { z } = require('zod');

const createFacultySchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Valid email is required.'),
    password: z.string().min(6).optional(),
    employeeId: z.string().min(2, 'Employee ID is required.'),
    department: z.string().min(2, 'Department is required.'),
    designation: z.string().min(2, 'Designation is required.'),
  }),
};

const updateFacultySchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    department: z.string().min(2).optional(),
    designation: z.string().min(2).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  }),
};

module.exports = {
  createFacultySchema,
  updateFacultySchema,
};
