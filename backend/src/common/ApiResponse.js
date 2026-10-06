/**
 * Standard API Response payload wrapper.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {any} data - Response payload data
   * @param {string} [message="Success"] - Informational message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }

  static success(data, message = "Request successful") {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = "Resource created successfully") {
    return new ApiResponse(201, data, message);
  }

  static accepted(data, message = "Request accepted for processing") {
    return new ApiResponse(202, data, message);
  }
}

export default ApiResponse;
