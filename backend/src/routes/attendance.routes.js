const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { recordAttendanceSchema } = require('../validators/attendance.validator');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', attendanceController.getAttendance);
router.get('/course/:courseId/summary', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), attendanceController.getCourseAttendanceSummary);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), validate(recordAttendanceSchema), attendanceController.recordAttendance);

module.exports = router;
