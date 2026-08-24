const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.FACULTY), reportController.getAcademicReports);

module.exports = router;
