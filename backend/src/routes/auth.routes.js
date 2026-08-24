const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, changePasswordSchema, changeEmailSchema, updateProfileSchema } = require('../validators/auth.validator');

// Rate limiter for authentication endpoint to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, validate(updateProfileSchema), authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, validate(changePasswordSchema), authController.changePassword);
router.post('/change-email', authenticateToken, validate(changeEmailSchema), authController.changeEmail);

module.exports = router;
