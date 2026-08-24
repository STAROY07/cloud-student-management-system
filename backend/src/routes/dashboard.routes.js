const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, dashboardController.getDashboardStats);

module.exports = router;
