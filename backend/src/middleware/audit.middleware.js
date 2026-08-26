const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Persists an audit log entry in PostgreSQL
 */
const recordAuditLog = async ({ actorId, action, entity, entityId = null, details = null, ipAddress = null }) => {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, entity, entityId ? String(entityId) : null, details ? JSON.stringify(details) : null, ipAddress]
    );
    logger.info(`Audit Log: [${action}] by actor ${actorId || 'SYSTEM'} on ${entity}:${entityId || 'N/A'}`);
  } catch (error) {
    // Audit writes must never break the request, but they must stay visible
    logger.error('Failed to write audit log', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      action,
      entity,
      entityId,
    });
  }
};

module.exports = {
  recordAuditLog,
};
