const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createStudentSchema, updateStudentSchema } = require('../validators/student.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

// List students: Admin & Faculty
router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), studentController.getStudents);

// Student profile details: Admin, Faculty, or Student viewing self
router.get('/:id', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY, ROLES.STUDENT), studentController.getStudentById);

// Admin-only management routes
router.post('/', authorizeRoles(ROLES.ADMIN), validate(createStudentSchema), studentController.createStudent);
router.put('/:id', authorizeRoles(ROLES.ADMIN), validate(updateStudentSchema), studentController.updateStudent);
router.patch('/:id', authorizeRoles(ROLES.ADMIN), validate(updateStudentSchema), studentController.updateStudent);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), studentController.deleteStudent);

module.exports = router;
