const { query } = require('../config/db');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Fetch system audit logs with filtering and pagination (Admin only)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { action, entity, search } = req.query;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (action) {
      conditions.push(`a.action ILIKE $${pIdx++}`);
      params.push(`%${action}%`);
    }

    if (entity) {
      conditions.push(`a.entity = $${pIdx++}`);
      params.push(entity);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR a.action ILIKE $${pIdx} OR a.entity_id ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(a.id) as total
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${whereClause}`,
      params
    );
    const totalRecords = parseInt(countRes.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    const logsRes = await query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip_address, a.created_at,
              u.id as actor_id, u.name as actor_name, u.email as actor_email, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx}`,
      dataParams
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        logs: logsRes.rows,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
