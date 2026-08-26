/**
 * Parse and clamp `page` / `limit` query parameters
 */
const parsePagination = (queryParams = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(queryParams.limit, 10) || defaultLimit));

  return { page, limit, offset: (page - 1) * limit };
};

/**
 * Build the pagination metadata block returned alongside paginated payloads
 */
const buildPaginationMeta = ({ page, limit, totalRecords }) => ({
  page,
  limit,
  totalRecords,
  totalPages: Math.ceil(totalRecords / limit) || 1,
});

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
