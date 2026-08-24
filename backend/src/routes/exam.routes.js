const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createExamSchema, updateExamSchema } = require('../validators/exam.validator');
const { ROLES } = require('../constants/roles');

// All exam routes require authentication
router.use(authenticateToken);

// View exams & upcoming exams (Role-filtered)
router.get('/', examController.getExams);
router.get('/upcoming', examController.getUpcomingExams);

// Schedule and manage exams (Admin & Faculty only)
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  validate(createExamSchema),
  examController.createExam
);

router.put(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  validate(updateExamSchema),
  examController.updateExam
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  examController.deleteExam
);

module.exports = router;
