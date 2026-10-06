import payrollService from "./payroll.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class PayrollController {
  async processSalary(req, res, next) {
    try {
      const payroll = await payrollService.processMonthlySalary({
        ...req.body,
        processedBy: req.user.id,
      });
      return res
        .status(201)
        .json(ApiResponse.created(payroll, "Monthly payroll calculated and generated."));
    } catch (error) {
      next(error);
    }
  }

  async getMyPayroll(req, res, next) {
    try {
      const result = await payrollService.getPayrollRecords({
        employeeId: req.user.id,
        ...req.query,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Employee payroll history retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getAllPayroll(req, res, next) {
    try {
      const result = await payrollService.getPayrollRecords(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(result, "All payroll records retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async downloadSalarySlip(req, res, next) {
    try {
      const { id } = req.params;
      const { pdfBuffer, fileName } = await payrollService.generateSalarySlip(id);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  async markAsPaid(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentReference } = req.body;
      const updated = await payrollService.markAsPaid(id, paymentReference);
      return res
        .status(200)
        .json(ApiResponse.success(updated, "Payroll marked as paid."));
    } catch (error) {
      next(error);
    }
  }
}

export default new PayrollController();
