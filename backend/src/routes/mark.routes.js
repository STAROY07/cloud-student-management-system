const express = require('express');
const router = express.Router();
const markController = require('../controllers/mark.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { recordMarksSchema } = require('../validators/mark.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', markController.getMarks);
router.get('/course/:courseId/stats', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), markController.getCourseMarkStats);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), validate(recordMarksSchema), markController.recordMarks);

module.exports = router;
