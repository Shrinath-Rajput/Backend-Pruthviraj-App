/**
 * Standard Production API Response Class
 */
export class ApiResponse {
  /**
   * @param {number} statusCode
   * @param {any} data
   * @param {string} message
   * @param {Object} [meta={}]
   */
  constructor(statusCode, data, message = "Success", meta = {}) {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 300;
    this.message = message;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  static success(data = {}, message = "Request processed successfully", meta = {}) {
    return new ApiResponse(200, data, message, meta);
  }

  static created(data = {}, message = "Resource created successfully", meta = {}) {
    return new ApiResponse(201, data, message, meta);
  }

  static list(items = [], pagination = {}, message = "Records retrieved successfully", meta = {}) {
    return new ApiResponse(200, items, message, {
      ...pagination,
      ...meta,
    });
  }

  static accepted(data = {}, message = "Request accepted for background processing", meta = {}) {
    return new ApiResponse(202, data, message, meta);
  }
}

export default ApiResponse;
