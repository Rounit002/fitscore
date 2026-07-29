const { z } = require('zod');

const formatIssues = (error) => error.issues.map((issue) => ({
  path: issue.path.join('.'),
  message: issue.message,
}));

const validateRequest = ({ body, query, params } = {}) => (req, res, next) => {
  try {
    if (body) req.body = body.parse(req.body ?? {});
    if (query) req.validatedQuery = query.parse(req.query);
    if (params) req.validatedParams = params.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: formatIssues(error) });
    }
    return next(error);
  }
};

module.exports = { validateRequest };
