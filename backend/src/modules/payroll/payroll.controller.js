import payrollService from "./payroll.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class PayrollController {
  async getEmployeeSlips(req, res, next) {
    try {
      const targetUserId = req.query.userId || req.user.id;
      const slips = await payrollService.getEmployeeSlips(targetUserId);
      return res.status(200).json(ApiResponse.success(slips));
    } catch (error) {
      next(error);
    }
  }

  async getSlipDetails(req, res, next) {
    try {
      const slip = await payrollService.getSlipDetails(
        req.params.id,
        req.user.id,
        req.allowedBusinessIds
      );
      return res.status(200).json(ApiResponse.success(slip));
    } catch (error) {
      next(error);
    }
  }

  async downloadSlipPdf(req, res, next) {
    try {
      const pdfBuffer = await payrollService.getSlipPdfBuffer(
        req.params.id,
        req.user.id,
        req.allowedBusinessIds
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payslip_${req.params.id}.pdf"`
      );
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  async processPayroll(req, res, next) {
    try {
      const result = await payrollService.processPayrollRun({
        businessId: req.body.businessId,
        payPeriod: req.body.payPeriod,
        year: req.body.year,
        monthIndex: req.body.monthIndex,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(result, "Payroll calculation completed."));
    } catch (error) {
      next(error);
    }
  }

  async approvePayroll(req, res, next) {
    try {
      const result = await payrollService.approvePayrollRun(
        req.body.runId,
        req.user.id,
        req.allowedBusinessIds
      );
      return res.status(200).json(ApiResponse.success(result, "Payroll run approved."));
    } catch (error) {
      next(error);
    }
  }

  async disbursePayroll(req, res, next) {
    try {
      const result = await payrollService.disbursePayrollRun(
        req.body.runId,
        req.allowedBusinessIds
      );
      return res.status(200).json(ApiResponse.success(result, "Payroll marked as disbursed."));
    } catch (error) {
      next(error);
    }
  }
}

export default new PayrollController();
