import ApiError from "../common/ApiError.js";
import environment from "../config/environment.js";

/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Transform non-ApiError into ApiError instances
  if (!(error instanceof ApiError)) {
    // Mongoose bad ObjectId / CastError
    if (err.name === "CastError") {
      const message = `Resource not found with ID: ${err.value}`;
      error = ApiError.notFound(message);
    }
    // Mongoose duplicate key error (code 11000)
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {}).join(", ");
      const message = `Duplicate field value entered for [${field}]. Please use another value.`;
      error = ApiError.conflict(message);
    }
    // Mongoose schema validation error
    else if (err.name === "ValidationError") {
      const errors = Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = ApiError.badRequest("Database validation error", errors);
    }
    // JWT errors
    else if (err.name === "JsonWebTokenError") {
      error = ApiError.unauthorized("Invalid authentication token.");
    } else if (err.name === "TokenExpiredError") {
      error = ApiError.unauthorized("Authentication token has expired.");
    }
    // Fallback internal error
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(environment.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};

export default errorHandler;
