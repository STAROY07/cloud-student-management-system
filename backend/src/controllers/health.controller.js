const { checkDbHealth } = require('../config/db');
const config = require('../config/env');
const logger = require('../utils/logger');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Health check endpoint for Cloud Run and Google Cloud Monitoring probes
 */
const getHealthStatus = async (req, res) => {
  let dbHealth;
  try {
    dbHealth = await checkDbHealth();
  } catch (error) {
    logger.error('Health probe failed while checking the database', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      service: 'cloud-student-management-system',
      environment: config.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      database: { status: 'DOWN', healthy: false, error: error.message },
    });
  }

  const memoryUsage = process.memoryUsage();

  const isHealthy = dbHealth.healthy;
  const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return res.status(statusCode).json({
    status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    timestamp: new Date().toISOString(),
    service: 'cloud-student-management-system',
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    },
  });
};

module.exports = {
  getHealthStatus,
};
