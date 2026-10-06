import ExecutivePolicy from "./executive.model.js";
import User from "../auth/user.model.js";
import Site from "../site/site.model.js";
import Attendance from "../attendance/attendance.model.js";
import Leave from "../leave/leave.model.js";
import Payroll from "../payroll/payroll.model.js";

export class ExecutiveService {
  /**
   * Organization-level executive dashboard metrics
   */
  async getDashboardMetrics() {
    const today = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString("default", { month: "long" });

    const [
      totalEmployees,
      totalSupervisors,
      activeSites,
      todayAttendanceCount,
      pendingLeavesCount,
      currentMonthPayroll,
    ] = await Promise.all([
      User.countDocuments({ role: "EMPLOYEE", isActive: true }),
      User.countDocuments({ role: { $in: ["SUPERVISOR", "SUPER_SUPERVISOR"] }, isActive: true }),
      Site.countDocuments({ isActive: true }),
      Attendance.countDocuments({ date: today }),
      Leave.countDocuments({ status: "PENDING" }),
      Payroll.aggregate([
        { $match: { month: currentMonth, year: currentYear } },
        {
          $group: {
            _id: null,
            totalDisbursement: { $sum: "$netSalary" },
            processedCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const attendanceRate = totalEmployees > 0
      ? Math.round((todayAttendanceCount / totalEmployees) * 100)
      : 0;

    return {
      workforce: {
        totalEmployees,
        totalSupervisors,
        totalWorkforce: totalEmployees + totalSupervisors,
      },
      sites: {
        activeSitesCount: activeSites,
      },
      todayOperations: {
        date: today,
        presentCount: todayAttendanceCount,
        absentCount: Math.max(0, totalEmployees - todayAttendanceCount),
        attendanceRatePercent: attendanceRate,
      },
      pendingApprovals: {
        pendingLeaves: pendingLeavesCount,
      },
      monthlyPayroll: {
        month: currentMonth,
        year: currentYear,
        totalDisbursement: currentMonthPayroll[0]?.totalDisbursement || 0,
        processedCount: currentMonthPayroll[0]?.processedCount || 0,
      },
    };
  }

  /**
   * Attendance analytics across sites and date range
   */
  async getAttendanceAnalytics({ startDate, endDate, siteId }) {
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }
    if (siteId) {
      match.siteId = siteId;
    }

    const [statusBreakdown, geofenceCompliance] = await Promise.all([
      Attendance.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$punchInInsideGeofence",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      statusBreakdown,
      geofenceCompliance,
    };
  }

  /**
   * Payroll analytics across the financial year
   */
  async getPayrollAnalytics({ year }) {
    const targetYear = Number(year) || new Date().getFullYear();

    const monthlyTrends = await Payroll.aggregate([
      { $match: { year: targetYear } },
      {
        $group: {
          _id: "$month",
          totalNetSalary: { $sum: "$netSalary" },
          totalGross: { $sum: "$earnings.grossTotal" },
          totalDeductions: { $sum: "$deductions.totalDeductions" },
          employeeCount: { $sum: 1 },
        },
      },
    ]);

    return {
      year: targetYear,
      monthlyTrends,
    };
  }

  /**
   * Get organization geofence & operational policy
   */
  async getGeofencePolicy() {
    let policy = await ExecutivePolicy.findOne();
    if (!policy) {
      policy = await ExecutivePolicy.create({});
    }
    return policy;
  }

  /**
   * Update organization geofence policy and append to audit trail
   */
  async updateGeofencePolicy(policyData, adminUserId) {
    let policy = await ExecutivePolicy.findOne();
    if (!policy) {
      policy = new ExecutivePolicy();
    }

    Object.assign(policy, policyData);
    policy.updatedBy = adminUserId;

    policy.auditTrail.push({
      action: "POLICY_UPDATE",
      performedBy: adminUserId,
      targetResource: "ExecutivePolicy",
      details: `Updated geofence policy. Default radius: ${policy.defaultRadiusMeters}m. Strict: ${policy.strictGeofenceEnforcement}`,
      timestamp: new Date(),
    });

    await policy.save();
    return policy;
  }

  /**
   * Retrieve organization audit trail
   */
  async getAuditTrail({ page = 1, limit = 50 }) {
    const policy = await this.getGeofencePolicy();
    const skip = (page - 1) * limit;

    const auditTrail = policy.auditTrail
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + Number(limit));

    return {
      total: policy.auditTrail.length,
      page: Number(page),
      limit: Number(limit),
      records: auditTrail,
    };
  }
}

export default new ExecutiveService();
