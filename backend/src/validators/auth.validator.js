const { z } = require('zod');

const loginSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid academic email address.').min(1, 'Email is required.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  }),
};

const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Full name must be at least 2 characters.').max(100),
    phone: z.string().min(7).max(20).regex(/^[+0-9\s-()]+$/).optional().nullable(),
  }),
};

const changeEmailSchema = {
  body: z.object({
    newEmail: z.string().email('Valid university email address is required.').max(100),
    currentPassword: z.string().min(1, 'Current password is required to verify identity.'),
  }),
};

module.exports = {
  loginSchema,
  changePasswordSchema,
  changeEmailSchema,
  updateProfileSchema,
};
