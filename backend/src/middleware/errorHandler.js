import ApiError from "../common/ApiError.js";
import environment from "../config/environment.js";

/**
 * Production Centralized Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-ApiError into ApiError instances
  if (!(error instanceof ApiError)) {
    // Mongoose CastError (invalid ObjectId)
    if (err.name === "CastError") {
      error = ApiError.notFound(
        `Resource not found with identifier: ${err.value}`,
        { path: err.path, value: err.value },
        "INVALID_IDENTIFIER"
      );
    }
    // Mongoose duplicate key error (code 11000)
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      error = ApiError.conflict(
        `Duplicate record detected for ${field}: '${err.keyValue[field]}'.`,
        { duplicateField: field, value: err.keyValue[field] },
        "DUPLICATE_KEY_ERROR"
      );
    }
    // Mongoose schema validation error
    else if (err.name === "ValidationError") {
      const details = {};
      Object.keys(err.errors || {}).forEach((key) => {
        details[key] = err.errors[key].message;
      });
      error = ApiError.badRequest(
        "Database schema validation failed.",
        details,
        "SCHEMA_VALIDATION_ERROR"
      );
    }
    // JWT Errors
    else if (err.name === "JsonWebTokenError") {
      error = ApiError.unauthorized("Invalid authentication token.", {}, "INVALID_TOKEN");
    } else if (err.name === "TokenExpiredError") {
      error = ApiError.unauthorized("Authentication token has expired.", {}, "TOKEN_EXPIRED");
    }
    // Multer upload errors
    else if (err.name === "MulterError") {
      error = ApiError.badRequest(
        `File upload error: ${err.message}`,
        { code: err.code, field: err.field },
        "FILE_UPLOAD_ERROR"
      );
    }
    // Fallback standard error
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || "Internal server error";
      error = new ApiError(
        statusCode,
        message,
        statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
        {},
        err.stack
      );
    }
  }

  const requestId = req.id || req.headers["x-request-id"] || `req_${Date.now()}`;
  const status = error.statusCode || 500;

  // Consistent Error Response Envelope as required by Section 44
  const errorResponse = {
    success: false,
    status,
    error: error.errorCode || "API_ERROR",
    message: error.message,
    details: error.details || {},
    timestamp: new Date().toISOString(),
    requestId,
    ...(environment.NODE_ENV === "development" && { stack: error.stack }),
  };

  if (status >= 500 && environment.NODE_ENV !== "test") {
    console.error(`[Unhandled Server Error] [${requestId}]:`, error);
  }

  return res.status(status).json(errorResponse);
};

export default errorHandler;
