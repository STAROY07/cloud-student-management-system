/**
 * Build SQL filter conditions with sequential positional placeholders.
 *
 * Each filter is `{ value, condition }` where `condition` receives the
 * placeholder assigned to its value, e.g.
 *   { value: search, condition: (p) => `(u.name ILIKE ${p} OR u.email ILIKE ${p})` }
 *
 * Filters whose value is undefined, null or an empty string are skipped.
 */
const buildFilters = (filters, { startIndex = 1 } = {}) => {
  const conditions = [];
  const params = [];

  for (const { value, condition } of filters) {
    if (value === undefined || value === null || value === '') continue;
    params.push(value);
    conditions.push(condition(`$${startIndex + params.length - 1}`));
  }

  return {
    conditions,
    params,
    nextIndex: startIndex + params.length,
    /** Joined conditions prefixed with `keyword`, or '' when nothing matched */
    clause: (keyword = 'WHERE') => (conditions.length > 0 ? `${keyword} ${conditions.join(' AND ')}` : ''),
  };
};

/**
 * Build the `SET` clause of an UPDATE statement from a column/value map.
 *
 * Columns whose value is `undefined` are omitted, so callers can pass the
 * whole payload and let absent fields keep their stored value. `updated_at`
 * is always refreshed unless `touchUpdatedAt` is false.
 */
const buildUpdateSet = (columnValues, { startIndex = 1, touchUpdatedAt = true } = {}) => {
  const assignments = [];
  const params = [];

  for (const [column, value] of Object.entries(columnValues)) {
    if (value === undefined) continue;
    params.push(value);
    assignments.push(`${column} = $${startIndex + params.length - 1}`);
  }

  const hasUpdates = assignments.length > 0;
  if (touchUpdatedAt) assignments.push('updated_at = NOW()');

  return {
    hasUpdates,
    params,
    clause: assignments.join(', '),
    nextIndex: startIndex + params.length,
  };
};

/**
 * Convert a camelCase payload key into its snake_case column name
 */
const toSnakeCase = (key) => key.replace(/([A-Z])/g, '_$1').toLowerCase();

module.exports = {
  buildFilters,
  buildUpdateSet,
  toSnakeCase,
};
