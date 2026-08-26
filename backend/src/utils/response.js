const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Send the standard success envelope: { success, message?, data? }
 */
const sendSuccess = (res, { data, message, status = HTTP_STATUS.OK } = {}) => {
  const body = { success: true };
  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
};

/**
 * Send the standard success envelope with a 201 Created status
 */
const sendCreated = (res, { data, message } = {}) =>
  sendSuccess(res, { data, message, status: HTTP_STATUS.CREATED });

/**
 * Send the standard error envelope: { success: false, error: { code, message } }
 */
const sendError = (res, { status, code, message }) =>
  res.status(status).json({
    success: false,
    error: { code, message },
  });

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
};
