import ApiError from "../common/ApiError.js";

/**
 * Higher-order middleware function to validate Express requests with Zod schemas
 * @param {import("zod").ZodSchema} schema - Zod validation schema
 * @param {'body' | 'query' | 'params'} [source='body'] - Request segment to validate
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);

      if (!parsed.success) {
        const errorDetails = parsed.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return next(
          ApiError.badRequest(
            `Validation error in request ${source}: ${errorDetails.map((e) => e.message).join(", ")}`,
            errorDetails
          )
        );
      }

      // Replace with sanitized/validated data
      req[source] = parsed.data;
      next();
    } catch (error) {
      next(ApiError.internal(`Schema validation failed: ${error.message}`));
    }
  };
};

export default validate;
