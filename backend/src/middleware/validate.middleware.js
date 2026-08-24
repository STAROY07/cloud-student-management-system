const { ZodError } = require('zod');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Validates request components (body, query, params) against Zod schema
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data supplied in request.',
            details: formattedErrors,
          },
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
};
