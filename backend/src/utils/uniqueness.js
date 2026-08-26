const ApiError = require('./apiError');

/**
 * Reject the request when `value` is already stored in `table.column`.
 *
 * The comparison is case-insensitive; pass `excludeId` when updating a record
 * so its own row is not treated as a collision. `executor` is either the
 * pooled `query` helper or a transaction client.
 */
const assertUnique = async (executor, { table, column, value, excludeId = null, code, message }) => {
  const params = [value];
  let sql = `SELECT id FROM ${table} WHERE LOWER(${column}) = LOWER($1)`;

  if (excludeId) {
    params.push(excludeId);
    sql += ' AND id != $2';
  }

  const existing = await executor(sql, params);
  if (existing.rowCount > 0) {
    throw ApiError.conflict(code, message);
  }
};

module.exports = {
  assertUnique,
};
