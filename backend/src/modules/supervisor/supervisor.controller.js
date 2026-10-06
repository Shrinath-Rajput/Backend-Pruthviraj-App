import supervisorService from "./supervisor.service.js";
import attendanceService from "../attendance/attendance.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class SupervisorController {
  async getSites(req, res, next) {
    try {
      const sites = await supervisorService.getManagedSites(req.user.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(sites));
    } catch (error) {
      next(error);
    }
  }

  async getSiteGovernance(req, res, next) {
    try {
      const governance = await supervisorService.getSiteGovernance(req.params.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(governance));
    } catch (error) {
      next(error);
    }
  }

  async handoverSite(req, res, next) {
    try {
      const { action, newSupervisorId } = req.body;
      const result = await supervisorService.executeHandover({
        siteId: req.params.id,
        action,
        newSupervisorId,
        currentUserId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async getCrew(req, res, next) {
    try {
      const crew = await supervisorService.getCrew({
        siteId: req.query.siteId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(crew));
    } catch (error) {
      next(error);
    }
  }

  async bulkAttendance(req, res, next) {
    try {
      const result = await supervisorService.bulkAttendance({
        ...req.body,
        supervisorId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, "Bulk crew attendance recorded."));
    } catch (error) {
      next(error);
    }
  }

  async getPendingLeaves(req, res, next) {
    try {
      const leaves = await supervisorService.getPendingLeaves(req.user.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(leaves));
    } catch (error) {
      next(error);
    }
  }

  async reviewLeave(req, res, next) {
    try {
      const result = await supervisorService.reviewLeave({
        leaveId: req.params.id,
        ...req.body,
        supervisorId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async getLiveRoster(req, res, next) {
    try {
      const roster = await supervisorService.getLiveRoster({
        siteId: req.query.siteId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(roster));
    } catch (error) {
      next(error);
    }
  }

  async overridePunch(req, res, next) {
    try {
      const result = await attendanceService.overridePunch({
        supervisorId: req.user.id,
        workerId: req.body.workerId,
        action: req.body.action,
        overrideReason: req.body.overrideReason,
        siteId: req.body.siteId,
        shiftId: req.body.shiftId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, "Override verified and chained."));
    } catch (error) {
      next(error);
    }
  }
}

export default new SupervisorController();
