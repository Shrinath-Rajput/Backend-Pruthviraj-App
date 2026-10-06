/**
 * Standard Operational API Error Class
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {string} [errorCode="API_ERROR"] - Standard machine-readable error code
   * @param {Object|Array} [details={}] - Contextual details (e.g. breach info, validation items)
   * @param {string} [stack=""] - Stack trace
   */
  constructor(
    statusCode = 500,
    message = "Internal server error",
    errorCode = "INTERNAL_SERVER_ERROR",
    details = {},
    stack = ""
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad Request", details = {}, errorCode = "BAD_REQUEST") {
    return new ApiError(400, message, errorCode, details);
  }

  static unauthorized(message = "Unauthorized access", details = {}, errorCode = "UNAUTHORIZED") {
    return new ApiError(401, message, errorCode, details);
  }

  static forbidden(message = "Forbidden resource", details = {}, errorCode = "FORBIDDEN") {
    return new ApiError(403, message, errorCode, details);
  }

  static notFound(message = "Resource not found", details = {}, errorCode = "NOT_FOUND") {
    return new ApiError(404, message, errorCode, details);
  }

  static conflict(message = "Resource conflict", details = {}, errorCode = "CONFLICT") {
    return new ApiError(409, message, errorCode, details);
  }

  static unprocessable(
    message = "Unprocessable entity",
    details = {},
    errorCode = "UNPROCESSABLE_ENTITY"
  ) {
    return new ApiError(422, message, errorCode, details);
  }

  static geofenceBreach(
    message = "Physical presence verification failed.",
    details = {},
    errorCode = "GEOFENCE_PERIMETER_BREACH"
  ) {
    return new ApiError(422, message, errorCode, details);
  }

  static tooManyRequests(
    message = "Too many requests. Please try again later.",
    details = {},
    errorCode = "RATE_LIMIT_EXCEEDED"
  ) {
    return new ApiError(429, message, errorCode, details);
  }

  static internal(
    message = "Internal server error",
    details = {},
    errorCode = "INTERNAL_SERVER_ERROR"
  ) {
    return new ApiError(500, message, errorCode, details);
  }
}

export default ApiError;
