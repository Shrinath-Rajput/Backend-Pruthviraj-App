import supervisorService from "./supervisor.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class SupervisorController {
  async assignEmployee(req, res, next) {
    try {
      const { employeeId, siteId } = req.body;
      const result = await supervisorService.assignEmployeeToSite({
        employeeId,
        siteId,
        supervisorId: req.user.id,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Employee assigned successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getAssignedCrew(req, res, next) {
    try {
      const crew = await supervisorService.getAssignedCrew(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(crew, "Assigned crew retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getSites(req, res, next) {
    try {
      const sites = await supervisorService.getSupervisorSites(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(sites, "Supervised sites retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getLiveAttendance(req, res, next) {
    try {
      const report = await supervisorService.getCrewLiveAttendance(
        req.user.id,
        req.query.date
      );
      return res
        .status(200)
        .json(ApiResponse.success(report, "Live crew attendance report."));
    } catch (error) {
      next(error);
    }
  }

  async reviewLeave(req, res, next) {
    try {
      const { leaveId } = req.params;
      const { status, reviewComment } = req.body;
      const result = await supervisorService.reviewCrewLeave({
        supervisorId: req.user.id,
        leaveId,
        status,
        reviewComment,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, `Leave request has been ${status.toLowerCase()}.`));
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const metrics = await supervisorService.getSupervisorDashboardMetrics(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(metrics, "Supervisor dashboard metrics retrieved."));
    } catch (error) {
      next(error);
    }
  }
}

export default new SupervisorController();
