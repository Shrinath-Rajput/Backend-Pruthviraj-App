/**
 * Custom operational API Error class for consistent REST API error handling.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error description
   * @param {Array<any>} [errors=[]] - Detailed validation or contextual error items
   * @param {string} [stack=""] - Optional error stack trace
   */
  constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized access", errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = "Forbidden resource", errors = []) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = "Resource not found", errors = []) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = "Resource conflict", errors = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = "Unprocessable entity", errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = "Internal server error", errors = []) {
    return new ApiError(500, message, errors);
  }
}

export default ApiError;
