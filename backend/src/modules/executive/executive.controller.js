import executiveService from "./executive.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class ExecutiveController {
  async getDashboardMetrics(req, res, next) {
    try {
      const metrics = await executiveService.getDashboardMetrics();
      return res
        .status(200)
        .json(ApiResponse.success(metrics, "Executive dashboard metrics retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceAnalytics(req, res, next) {
    try {
      const analytics = await executiveService.getAttendanceAnalytics(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(analytics, "Attendance analytics retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getPayrollAnalytics(req, res, next) {
    try {
      const analytics = await executiveService.getPayrollAnalytics(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(analytics, "Payroll analytics retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getGeofencePolicy(req, res, next) {
    try {
      const policy = await executiveService.getGeofencePolicy();
      return res
        .status(200)
        .json(ApiResponse.success(policy, "Geofence policy retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async updateGeofencePolicy(req, res, next) {
    try {
      const updated = await executiveService.updateGeofencePolicy(
        req.body,
        req.user.id
      );
      return res
        .status(200)
        .json(ApiResponse.success(updated, "Geofence policy updated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getAuditTrail(req, res, next) {
    try {
      const auditTrail = await executiveService.getAuditTrail(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(auditTrail, "Audit trail records retrieved."));
    } catch (error) {
      next(error);
    }
  }
}

export default new ExecutiveController();
