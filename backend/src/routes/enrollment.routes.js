const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createEnrollmentSchema, bulkEnrollSchema } = require('../validators/enrollment.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.post('/', authorizeRoles(ROLES.ADMIN), validate(createEnrollmentSchema), enrollmentController.createEnrollment);
router.post('/bulk', authorizeRoles(ROLES.ADMIN), validate(bulkEnrollSchema), enrollmentController.bulkEnroll);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), enrollmentController.deleteEnrollment);

module.exports = router;
