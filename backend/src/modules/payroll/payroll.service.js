import Payroll from "./payroll.model.js";
import User from "../auth/user.model.js";
import Attendance from "../attendance/attendance.model.js";
import Leave from "../leave/leave.model.js";
import ApiError from "../../common/ApiError.js";
import { generateSalarySlipPdf } from "../../common/utils/pdfGenerator.js";

export class PayrollService {
  /**
   * Process and calculate monthly salary for an employee based on attendance
   */
  async processMonthlySalary({
    employeeId,
    month,
    year,
    baseSalary = 30000,
    customAllowances = 0,
    customDeductions = 0,
    processedBy,
  }) {
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }

    // Month numeric index calculation (0-11)
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
    if (monthIndex === -1) {
      throw ApiError.badRequest(`Invalid month name '${month}'.`);
    }

    const startDateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const endDateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${daysInMonth}`;

    // Query attendance records for this month
    const attendanceRecords = await Attendance.find({
      employeeId,
      date: { $gte: startDateStr, $lte: endDateStr },
    });

    let presentDays = 0;
    let overtimeHours = 0;

    attendanceRecords.forEach((att) => {
      if (att.status === "PRESENT" || att.status === "MANUAL_OVERRIDE") {
        presentDays += 1;
      } else if (att.status === "HALF_DAY") {
        presentDays += 0.5;
      } else if (att.status === "OVERTIME") {
        presentDays += 1;
        overtimeHours += Math.max(0, (att.totalHoursWorked || 9) - 8);
      }
    });

    // Query approved leaves
    const approvedLeaves = await Leave.find({
      employeeId,
      status: "APPROVED",
      startDate: { $gte: new Date(startDateStr) },
      endDate: { $lte: new Date(endDateStr) },
    });

    const leaveDays = approvedLeaves.reduce((acc, curr) => acc + curr.totalDays, 0);
    const absentDays = Math.max(0, daysInMonth - (presentDays + leaveDays));

    // Earnings breakdown
    const basic = Math.round(baseSalary * 0.5);
    const hra = Math.round(baseSalary * 0.3);
    const standardAllowances = Math.round(baseSalary * 0.2) + Number(customAllowances);
    const overtimePay = Math.round(overtimeHours * (basic / (daysInMonth * 8)) * 1.5);
    const grossTotal = basic + hra + standardAllowances + overtimePay;

    // Deductions breakdown
    const providentFund = Math.round(basic * 0.12);
    const tax = grossTotal > 50000 ? Math.round(grossTotal * 0.1) : 0;
    const insurance = 500;
    const lossOfPayPenalty = Math.round((baseSalary / daysInMonth) * absentDays);
    const totalDeductions = providentFund + tax + insurance + lossOfPayPenalty + Number(customDeductions);

    const netSalary = Math.max(0, grossTotal - totalDeductions);

    // Create or update record
    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, month, year },
      {
        employeeId,
        month,
        year,
        workingDays: daysInMonth,
        presentDays,
        absentDays,
        leaveDays,
        overtimeHours,
        baseSalary,
        earnings: {
          basic,
          hra,
          allowances: standardAllowances,
          overtime: overtimePay,
          grossTotal,
        },
        deductions: {
          tax,
          providentFund,
          insurance,
          penalties: lossOfPayPenalty + Number(customDeductions),
          totalDeductions,
        },
        netSalary,
        status: "PROCESSED",
        processedBy,
      },
      { upsert: true, new: true }
    ).populate("employeeId", "name employeeCode email designation");

    return payroll;
  }

  /**
   * Get payroll records with filter & pagination
   */
  async getPayrollRecords({ employeeId, month, year, status, page = 1, limit = 20 }) {
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (month) query.month = month;
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Payroll.find(query)
        .populate("employeeId", "name employeeCode email designation")
        .populate("processedBy", "name employeeCode")
        .skip(skip)
        .limit(Number(limit))
        .sort({ year: -1, month: -1 }),
      Payroll.countDocuments(query),
    ]);

    return {
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate downloadable PDF salary slip
   */
  async generateSalarySlip(payrollId) {
    const payroll = await Payroll.findById(payrollId).populate("employeeId");
    if (!payroll) {
      throw ApiError.notFound("Payroll record not found.");
    }

    const employee = payroll.employeeId;

    const pdfBuffer = await generateSalarySlipPdf({
      employeeName: employee?.name || "Employee",
      employeeCode: employee?.employeeCode || "EMP-000",
      department: "Workforce Operations",
      designation: employee?.designation || "Staff",
      month: payroll.month,
      year: payroll.year,
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      overtimeHours: payroll.overtimeHours,
      earnings: payroll.earnings,
      deductions: payroll.deductions,
      netSalary: payroll.netSalary,
      generatedAt: payroll.updatedAt,
    });

    return {
      pdfBuffer,
      fileName: `SalarySlip_${employee?.employeeCode}_${payroll.month}_${payroll.year}.txt`,
    };
  }

  /**
   * Mark payroll status as PAID
   */
  async markAsPaid(payrollId, paymentReference) {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw ApiError.notFound("Payroll record not found.");
    }

    payroll.status = "PAID";
    payroll.paymentDate = new Date();
    payroll.paymentReference = paymentReference || `TXN-${Date.now()}`;

    await payroll.save();
    return payroll;
  }
}

export default new PayrollService();
