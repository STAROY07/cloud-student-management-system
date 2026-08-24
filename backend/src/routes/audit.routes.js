const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../constants/roles');

router.use(authenticateToken);

router.get('/', authorizeRoles(ROLES.ADMIN), auditController.getAuditLogs);

module.exports = router;
