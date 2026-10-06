import leaveService from "./leave.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class LeaveController {
  async applyLeave(req, res, next) {
    try {
      const leave = await leaveService.applyLeave({
        employeeId: req.user.id,
        ...req.body,
      });
      return res
        .status(201)
        .json(ApiResponse.created(leave, "Leave application submitted successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getMyLeaves(req, res, next) {
    try {
      const result = await leaveService.getLeaveHistory({
        employeeId: req.user.id,
        ...req.query,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Leave history retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getMyLeaveBalance(req, res, next) {
    try {
      const balance = await leaveService.getLeaveBalance(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(balance, "Leave balance retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async cancelLeave(req, res, next) {
    try {
      const leave = await leaveService.cancelLeave(req.params.id, req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(leave, "Leave request cancelled."));
    } catch (error) {
      next(error);
    }
  }

  async getAllLeaves(req, res, next) {
    try {
      const result = await leaveService.getLeaveHistory(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(result, "All leave requests retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async updateLeaveStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reviewComment } = req.body;
      const updated = await leaveService.updateLeaveStatus({
        leaveId: id,
        status,
        reviewedBy: req.user.id,
        reviewComment,
      });
      return res
        .status(200)
        .json(ApiResponse.success(updated, `Leave status updated to ${status}.`));
    } catch (error) {
      next(error);
    }
  }
}

export default new LeaveController();
