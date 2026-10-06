import leaveService from "./leave.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class LeaveController {
  async getBalances(req, res, next) {
    try {
      const balances = await leaveService.getBalances(req.user.id, req.user.businessIds?.[0]);
      return res.status(200).json(ApiResponse.success(balances));
    } catch (error) {
      next(error);
    }
  }

  async getMyRequests(req, res, next) {
    try {
      const requests = await leaveService.getMyRequests(req.user.id);
      return res.status(200).json(ApiResponse.success(requests));
    } catch (error) {
      next(error);
    }
  }

  async apply(req, res, next) {
    try {
      const result = await leaveService.applyLeave({
        userId: req.user.id,
        leaveType: req.body.leaveType,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        reason: req.body.reason,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(201).json(ApiResponse.created(result, "Leave application submitted."));
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await leaveService.listLeaves({
        ...req.query,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.list(result.leaves, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async review(req, res, next) {
    try {
      const reviewed = await leaveService.reviewLeave(req.params.id, {
        status: req.body.status,
        reviewComment: req.body.reviewComment,
        reviewerId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(reviewed, "Leave review recorded."));
    } catch (error) {
      next(error);
    }
  }
}

export default new LeaveController();
