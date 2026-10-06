import executiveService from "./executive.service.js";
import payrollService from "../payroll/payroll.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class ExecutiveController {
  async getOverview(req, res, next) {
    try {
      const overview = await executiveService.getOverview({
        region: req.query.region,
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(overview));
    } catch (error) {
      next(error);
    }
  }

  async getBusinessPerformance(req, res, next) {
    try {
      const performance = await executiveService.getBusinessPerformance({
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(performance));
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsTrends(req, res, next) {
    try {
      const trends = await executiveService.getAnalyticsTrends({
        range: req.query.range,
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(trends));
    } catch (error) {
      next(error);
    }
  }

  async getPlantsHeatmap(req, res, next) {
    try {
      const heatmap = await executiveService.getPlantsHeatmap({
        region: req.query.region,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(heatmap));
    } catch (error) {
      next(error);
    }
  }

  async getApprovals(req, res, next) {
    try {
      const approvals = await executiveService.getApprovals({
        businessId: req.query.businessId,
        status: req.query.status,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(approvals));
    } catch (error) {
      next(error);
    }
  }

  async processApproval(req, res, next) {
    try {
      const result = await executiveService.processApproval({
        approvalId: req.params.id,
        action: req.body.action,
        comment: req.body.comment,
        approverId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, `Approval marked as ${result.status}.`));
    } catch (error) {
      next(error);
    }
  }

  async getBilling(req, res, next) {
    try {
      const billing = await executiveService.getBillingSummary({
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(billing));
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req, res, next) {
    try {
      const invoice = await executiveService.createInvoice(req.body, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(invoice, "Invoice generated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getExpenses(req, res, next) {
    try {
      const expenses = await executiveService.getExpensesSummary({
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(expenses));
    } catch (error) {
      next(error);
    }
  }

  async createExpense(req, res, next) {
    try {
      const expense = await executiveService.createExpense(
        req.body,
        req.user.id,
        req.allowedBusinessIds
      );
      return res.status(201).json(ApiResponse.created(expense, "Expense logged and queued for approval."));
    } catch (error) {
      next(error);
    }
  }

  async getCompliance(req, res, next) {
    try {
      const compliance = await executiveService.getComplianceSummary({
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(compliance));
    } catch (error) {
      next(error);
    }
  }

  async getViolations(req, res, next) {
    try {
      const violations = await executiveService.getViolations({
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(violations));
    } catch (error) {
      next(error);
    }
  }

  async getPolicy(req, res, next) {
    try {
      const policy = await executiveService.getPolicy();
      return res.status(200).json(ApiResponse.success(policy));
    } catch (error) {
      next(error);
    }
  }

  async updatePolicy(req, res, next) {
    try {
      const updated = await executiveService.updatePolicy(req.body, req.user.id);
      return res.status(200).json(ApiResponse.success(updated.updatedPolicy, "Policy updated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async triggerAuditExport(req, res, next) {
    try {
      const result = await executiveService.triggerAuditExport({
        ...req.body,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(202).json(ApiResponse.accepted(result, "Master audit report generation initiated."));
    } catch (error) {
      next(error);
    }
  }

  async getAuditJob(req, res, next) {
    try {
      const job = await executiveService.getAuditJob(req.params.id);
      return res.status(200).json(ApiResponse.success(job));
    } catch (error) {
      next(error);
    }
  }

  async exportTally(req, res, next) {
    try {
      const result = await executiveService.exportToTally({
        ...req.body,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  async seedData(req, res, next) {
    try {
      const result = await executiveService.seedDatabase();
      return res.status(200).json(ApiResponse.success(result, "Database seeded."));
    } catch (error) {
      next(error);
    }
  }
}

export default new ExecutiveController();
