const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createFacultySchema, updateFacultySchema } = require('../validators/faculty.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), facultyController.getFacultyList);
router.get('/:id', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), facultyController.getFacultyById);
router.post('/', authorizeRoles(ROLES.ADMIN), validate(createFacultySchema), facultyController.createFaculty);
router.patch('/:id', authorizeRoles(ROLES.ADMIN), validate(updateFacultySchema), facultyController.updateFaculty);

module.exports = router;
