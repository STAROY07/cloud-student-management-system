const { checkDbHealth } = require('../config/db');
const config = require('../config/env');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Health check endpoint for Cloud Run and Google Cloud Monitoring probes
 */
const getHealthStatus = async (req, res) => {
  const dbHealth = await checkDbHealth();

  const isHealthy = dbHealth.healthy;
  const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  // Probes are unauthenticated, so production responses stay free of runtime
  // and environment details.
  if (config.isProduction) {
    return res.status(statusCode).json({
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      service: 'cloud-student-management-system',
      database: { status: dbHealth.status, healthy: dbHealth.healthy },
    });
  }

  const memoryUsage = process.memoryUsage();

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
