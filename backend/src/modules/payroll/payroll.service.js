import { PayrollRun, SalarySlip, ComplianceRecord } from "./payroll.model.js";
import { AttendanceRecord } from "../attendance/attendance.model.js";
import User from "../auth/user.model.js";
import ApiError from "../../common/ApiError.js";
import { generateSalarySlipPdf } from "../../common/utils/pdfGenerator.js";
import uploadService from "../upload/upload.service.js";
import { hashSha256 } from "../../common/utils/cryptoHash.js";
import environment from "../../config/environment.js";

export class PayrollService {
  /**
   * Real Statutory Calculation Engine (Section 27, 29, 52)
   * Uses integer paise arithmetic exclusively
   */
  calculateWorkerSalary({ worker, attendanceRecords, scheduledDays, monthIndex }) {
    let daysWorked = 0;
    let overtimeHours = 0;

    attendanceRecords.forEach((att) => {
      if (att.punchType === "CHECK_IN") {
        if (att.verificationStatus === "VERIFIED" || att.isManualOverride) {
          daysWorked += 1;
        } else if (att.verificationStatus === "FLAGGED_BREACH") {
          daysWorked += 0.5;
        }
      }
    });

    const baseSalaryPaise = worker.salaryConfig?.baseSalaryPaise || 2500000; // INR 25,000.00
    const basicPayPaise = Math.round(baseSalaryPaise * 0.5);
    const hraPaise = Math.round(baseSalaryPaise * 0.3);
    const conveyancePaise = Math.round(baseSalaryPaise * 0.2);

    // Overtime calculation
    const otRatePerHour = worker.salaryConfig?.otRatePerHourPaise || Math.round((basicPayPaise / (scheduledDays * 8)) * 1.5);
    const overtimeBonusPaise = Math.round(overtimeHours * otRatePerHour);

    const grossAmountPaise = basicPayPaise + hraPaise + conveyancePaise + overtimeBonusPaise;

    // Statutory Compliance Deductions (Section 29)
    // 1. PF: 12% of basic
    const pfPaise = Math.round(basicPayPaise * (environment.COMPLIANCE.PF_PERCENT_EMPLOYEE / 100));

    // 2. ESIC: 0.75% if gross <= INR 21,000 (2,100,000 paise)
    const esiPaise = grossAmountPaise <= environment.COMPLIANCE.ESIC_GROSS_LIMIT_PAISE
      ? Math.round(grossAmountPaise * (environment.COMPLIANCE.ESIC_PERCENT_EMPLOYEE / 100))
      : 0;

    // 3. Professional Tax (Maharashtra Slabs)
    let ptPaise = 0;
    if (grossAmountPaise > 1000000) { // Gross > INR 10,000
      ptPaise = monthIndex === 1 ? environment.COMPLIANCE.PT_FEBRUARY_PAISE : environment.COMPLIANCE.PT_STANDARD_MONTHLY_PAISE;
    }

    // Loss of pay for unattended days
    const absentDays = Math.max(0, scheduledDays - daysWorked);
    const lossOfPayPaise = Math.round((baseSalaryPaise / scheduledDays) * absentDays);

    const totalDeductionsPaise = pfPaise + esiPaise + ptPaise + lossOfPayPaise;
    const netAmountPaise = Math.max(0, grossAmountPaise - totalDeductionsPaise);

    return {
      daysScheduled: scheduledDays,
      daysWorked,
      overtimeHours,
      earnings: {
        basicPay: basicPayPaise,
        hra: hraPaise,
        conveyance: conveyancePaise,
        overtimeBonus: overtimeBonusPaise,
        grossAmount: grossAmountPaise,
      },
      deductions: {
        pf: pfPaise,
        esi: esiPaise,
        professionalTax: ptPaise,
        advances: 0,
        loans: 0,
        lossOfPay: lossOfPayPaise,
        totalDeductions: totalDeductionsPaise,
      },
      netAmount: netAmountPaise,
    };
  }

  /**
   * Execute Payroll Run Workflow (Section 27)
   */
  async processPayrollRun({ businessId, payPeriod, year, monthIndex = 9, allowedBusinessIds }) {
    if (!allowedBusinessIds.includes(businessId)) {
      throw ApiError.forbidden("Unauthorized business for payroll processing.");
    }

    const periodYear = Number(year) || new Date().getFullYear();
    const periodStart = new Date(Date.UTC(periodYear, monthIndex, 1));
    const periodEnd = new Date(Date.UTC(periodYear, monthIndex + 1, 0, 23, 59, 59));
    const scheduledDays = new Date(periodYear, monthIndex + 1, 0).getDate();

    let payrollRun = await PayrollRun.findOne({ businessId, payPeriod });
    if (!payrollRun) {
      payrollRun = await PayrollRun.create({
        businessId,
        payPeriod,
        periodStart,
        periodEnd,
        status: "CALCULATING",
      });
    }

    // Find all workers in business
    const workers = await User.find({
      businessIds: businessId,
      isActive: true,
      role: { $in: ["EMPLOYEE", "STAFF", "SUPERVISOR"] },
    });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const worker of workers) {
      const attendance = await AttendanceRecord.find({
        userId: worker._id,
        punchTimestamp: { $gte: periodStart, $lte: periodEnd },
      });

      const calc = this.calculateWorkerSalary({
        worker,
        attendanceRecords: attendance,
        scheduledDays,
        monthIndex,
      });

      // Digital Seal
      const sha256Seal = hashSha256(
        `${worker._id}:${payPeriod}:${calc.earnings.grossAmount}:${calc.netAmount}`
      );

      // Generate PDF in memory (Section 28)
      const pdfBuffer = await generateSalarySlipPdf({
        companyName: worker.companyName || "Pruthviraj Enterprises",
        employee: worker.toObject(),
        payPeriod,
        periodStart,
        periodEnd,
        daysScheduled: calc.daysScheduled,
        daysWorked: calc.daysWorked,
        overtimeHours: calc.overtimeHours,
        earnings: calc.earnings,
        deductions: calc.deductions,
        netAmount: calc.netAmount,
        status: "SLIP_READY",
        sha256Seal,
      });

      // Save Payslip PDF locally and store link in MongoDB
      const savedPdf = await uploadService.saveUpload({
        buffer: pdfBuffer,
        originalName: `slip_${worker.employeeCode}_${payPeriod}.pdf`,
        mimeType: "application/pdf",
        folder: "payslips",
        businessId,
        uploadedBy: worker._id,
        entityType: "PAYSLIP",
      });
      const pdfStorageUrl = savedPdf.url;

      await SalarySlip.findOneAndUpdate(
        { userId: worker._id, payPeriod },
        {
          payrollRunId: payrollRun._id,
          userId: worker._id,
          businessId,
          siteId: worker.assignedSiteId || null,
          payPeriod,
          periodStart,
          periodEnd,
          daysScheduled: calc.daysScheduled,
          daysWorked: calc.daysWorked,
          overtimeHours: calc.overtimeHours,
          earnings: calc.earnings,
          deductions: calc.deductions,
          netAmount: calc.netAmount,
          status: "SLIP_READY",
          pdfStorageUrl,
          sha256Seal,
        },
        { upsert: true, new: true }
      );

      // Save statutory records
      if (calc.deductions.pf > 0) {
        await ComplianceRecord.create({
          businessId,
          userId: worker._id,
          period: payPeriod,
          type: "PF",
          amountPaise: calc.deductions.pf,
          dueDate: new Date(Date.UTC(periodYear, monthIndex + 1, 15)),
        });
      }
      if (calc.deductions.esi > 0) {
        await ComplianceRecord.create({
          businessId,
          userId: worker._id,
          period: payPeriod,
          type: "ESIC",
          amountPaise: calc.deductions.esi,
          dueDate: new Date(Date.UTC(periodYear, monthIndex + 1, 15)),
        });
      }

      totalGross += calc.earnings.grossAmount;
      totalDeductions += calc.deductions.totalDeductions;
      totalNet += calc.netAmount;
    }

    payrollRun.totalGrossPaise = totalGross;
    payrollRun.totalDeductionsPaise = totalDeductions;
    payrollRun.totalNetPaise = totalNet;
    payrollRun.totalEmployees = workers.length;
    payrollRun.status = "PENDING_APPROVAL";
    await payrollRun.save();

    return payrollRun;
  }

  /**
   * Approve Payroll Run (Workflow)
   */
  async approvePayrollRun(runId, approverId, allowedBusinessIds) {
    const run = await PayrollRun.findById(runId);
    if (!run) throw ApiError.notFound("Payroll run not found.");
    if (!allowedBusinessIds.includes(run.businessId)) {
      throw ApiError.forbidden("Unauthorized business scope.");
    }

    run.status = "APPROVED";
    run.approvedBy = approverId;
    run.approvedAt = new Date();
    await run.save();
    return run;
  }

  /**
   * Disburse Payroll Run
   */
  async disbursePayrollRun(runId, allowedBusinessIds) {
    const run = await PayrollRun.findById(runId);
    if (!run) throw ApiError.notFound("Payroll run not found.");
    if (!allowedBusinessIds.includes(run.businessId)) {
      throw ApiError.forbidden("Unauthorized business scope.");
    }

    run.status = "DISBURSED";
    run.disbursedAt = new Date();
    await run.save();

    await SalarySlip.updateMany(
      { payrollRunId: run._id },
      { status: "DISBURSED", disbursalDate: new Date() }
    );

    return run;
  }

  /**
   * Get employee payslips list (Section 4.4 in PDF)
   */
  async getEmployeeSlips(userId) {
    const slips = await SalarySlip.find({ userId }).sort({ periodStart: -1 });

    return slips.map((s) => ({
      id: s._id,
      month: s.payPeriod.split(" ")[0],
      period: s.payPeriod,
      grossAmount: s.earnings.grossAmount / 100, // format to INR
      netAmount: s.netAmount / 100,
      status: s.status,
    }));
  }

  /**
   * Full payslip breakdown (Section 4.4 in PDF)
   */
  async getSlipDetails(slipId, userId, allowedBusinessIds) {
    const slip = await SalarySlip.findById(slipId).populate("userId");
    if (!slip) throw ApiError.notFound("Salary slip not found.");

    if (userId && slip.userId._id.toString() !== userId.toString()) {
      if (!allowedBusinessIds.includes(slip.businessId)) {
        throw ApiError.forbidden("Access denied to salary slip.");
      }
    }

    return {
      id: slip._id,
      employeeDetails: {
        fullName: slip.userId?.fullName,
        employeeCode: slip.userId?.employeeCode,
        designation: slip.userId?.designation,
        bankAccountMasked: slip.userId?.bankDetails?.accountNumberMasked || "••••••4892",
      },
      earnings: {
        basicPay: slip.earnings.basicPay / 100,
        hra: slip.earnings.hra / 100,
        conveyance: slip.earnings.conveyance / 100,
        overtimeBonus: slip.earnings.overtimeBonus / 100,
        grossAmount: slip.earnings.grossAmount / 100,
      },
      deductions: {
        pf: slip.deductions.pf / 100,
        esi: slip.deductions.esi / 100,
        professionalTax: slip.deductions.professionalTax / 100,
        totalDeductions: slip.deductions.totalDeductions / 100,
      },
      netPay: slip.netAmount / 100,
      pdfUrl: slip.pdfStorageUrl,
      sha256Seal: slip.sha256Seal,
    };
  }

  /**
   * Generate binary stream of PDF payslip
   */
  async getSlipPdfBuffer(slipId, userId, allowedBusinessIds) {
    const slip = await SalarySlip.findById(slipId).populate("userId");
    if (!slip) throw ApiError.notFound("Salary slip not found.");

    return await generateSalarySlipPdf({
      companyName: slip.userId?.companyName || "Pruthviraj Enterprises",
      employee: slip.userId.toObject(),
      payPeriod: slip.payPeriod,
      periodStart: slip.periodStart,
      periodEnd: slip.periodEnd,
      daysScheduled: slip.daysScheduled,
      daysWorked: slip.daysWorked,
      overtimeHours: slip.overtimeHours,
      earnings: slip.earnings,
      deductions: slip.deductions,
      netAmount: slip.netAmount,
      status: slip.status,
      sha256Seal: slip.sha256Seal,
    });
  }
}

export default new PayrollService();
