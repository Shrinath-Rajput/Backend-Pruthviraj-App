import ApiError from "../common/ApiError.js";

/**
 * Universal Zod validation middleware
 * Validates body, query, and params before business logic execution
 * @param {import("zod").ZodSchema | { body?: import("zod").ZodSchema, query?: import("zod").ZodSchema, params?: import("zod").ZodSchema }} schema
 * @param {'body' | 'query' | 'params'} [defaultSource='body']
 */
export const validate = (schema, defaultSource = "body") => {
  return (req, res, next) => {
    try {
      // If schema is an object with body, query, or params keys
      if (schema && (schema.body || schema.query || schema.params)) {
        if (schema.params) {
          const paramsResult = schema.params.safeParse(req.params);
          if (!paramsResult.success) {
            return next(formatZodError(paramsResult.error, "URL parameters"));
          }
          req.params = paramsResult.data;
        }

        if (schema.query) {
          const queryResult = schema.query.safeParse(req.query);
          if (!queryResult.success) {
            return next(formatZodError(queryResult.error, "Query parameters"));
          }
          req.query = queryResult.data;
        }

        if (schema.body) {
          const bodyResult = schema.body.safeParse(req.body);
          if (!bodyResult.success) {
            return next(formatZodError(bodyResult.error, "Request body"));
          }
          req.body = bodyResult.data;
        }

        return next();
      }

      // Single schema targeted at defaultSource
      const parsed = schema.safeParse(req[defaultSource]);
      if (!parsed.success) {
        return next(formatZodError(parsed.error, defaultSource));
      }

      req[defaultSource] = parsed.data;
      next();
    } catch (error) {
      next(ApiError.internal(`Schema validation encountered an unhandled error: ${error.message}`));
    }
  };
};

function formatZodError(zodError, sourceName) {
  const details = {};
  zodError.errors.forEach((err) => {
    const field = err.path.join(".") || "field";
    details[field] = err.message;
  });

  return ApiError.badRequest(
    `Invalid ${sourceName}: ${Object.values(details).join(", ")}`,
    details,
    "VALIDATION_ERROR"
  );
}

export default validate;
