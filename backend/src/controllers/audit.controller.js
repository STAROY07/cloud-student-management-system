const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { buildFilters } = require('../utils/sqlBuilder');

/**
 * Fetch system audit logs with filtering and pagination (Admin only)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
  const { action, entity, search } = req.query;

  const filters = buildFilters([
    { value: action ? `%${action}%` : undefined, condition: (p) => `a.action ILIKE ${p}` },
    { value: entity, condition: (p) => `a.entity = ${p}` },
    {
      value: search ? `%${search}%` : undefined,
      condition: (p) => `(u.name ILIKE ${p} OR u.email ILIKE ${p} OR a.action ILIKE ${p} OR a.entity_id ILIKE ${p})`,
    },
  ]);

  const whereClause = filters.clause();

  const countRes = await query(
    `SELECT COUNT(a.id) as total
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${whereClause}`,
    filters.params
  );
  const totalRecords = parseInt(countRes.rows[0].total, 10);

  const logsRes = await query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip_address, a.created_at,
              u.id as actor_id, u.name as actor_name, u.email as actor_email, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${filters.nextIndex} OFFSET $${filters.nextIndex + 1}`,
    [...filters.params, limit, offset]
  );

  return sendSuccess(res, {
    data: {
      logs: logsRes.rows,
      pagination: buildPaginationMeta({ page, limit, totalRecords }),
    },
  });
});

module.exports = {
  getAuditLogs,
};
