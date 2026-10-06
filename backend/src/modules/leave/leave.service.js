import Leave from "./leave.model.js";
import ApiError from "../../common/ApiError.js";

const ANNUAL_LEAVE_QUOTA = {
  CASUAL: 12,
  SICK: 10,
  EARNED: 15,
  UNPAID: 30,
};

export class LeaveService {
  /**
   * Apply for employee leave
   */
  async applyLeave({ employeeId, leaveType, startDate, endDate, reason, documentUrl }) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw ApiError.badRequest("Leave start date cannot be after end date.");
    }

    // Check for conflicting approved or pending leaves in same date window
    const overlapping = await Leave.findOne({
      employeeId,
      status: { $in: ["PENDING", "APPROVED"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      throw ApiError.conflict("An active or pending leave request already overlaps with these dates.");
    }

    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      documentUrl,
      status: "PENDING",
    });

    return leave;
  }

  /**
   * Fetch leave history for an employee or all (for supervisors/executives)
   */
  async getLeaveHistory({ employeeId, status, page = 1, limit = 20 }) {
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .populate("employeeId", "name employeeCode email designation")
        .populate("reviewedBy", "name employeeCode")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Leave.countDocuments(query),
    ]);

    return {
      leaves,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate leave balance for current calendar year
   */
  async getLeaveBalance(employeeId) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const approvedLeaves = await Leave.find({
      employeeId,
      status: "APPROVED",
      startDate: { $gte: startOfYear, $lte: endOfYear },
    });

    const used = {
      CASUAL: 0,
      SICK: 0,
      EARNED: 0,
      UNPAID: 0,
    };

    approvedLeaves.forEach((leave) => {
      if (used[leave.leaveType] !== undefined) {
        used[leave.leaveType] += leave.totalDays;
      }
    });

    const balance = {
      CASUAL: Math.max(0, ANNUAL_LEAVE_QUOTA.CASUAL - used.CASUAL),
      SICK: Math.max(0, ANNUAL_LEAVE_QUOTA.SICK - used.SICK),
      EARNED: Math.max(0, ANNUAL_LEAVE_QUOTA.EARNED - used.EARNED),
      UNPAID: Math.max(0, ANNUAL_LEAVE_QUOTA.UNPAID - used.UNPAID),
    };

    return {
      year: currentYear,
      quota: ANNUAL_LEAVE_QUOTA,
      used,
      balance,
    };
  }

  /**
   * Cancel a pending leave application
   */
  async cancelLeave(leaveId, employeeId) {
    const leave = await Leave.findOne({ _id: leaveId, employeeId });
    if (!leave) {
      throw ApiError.notFound("Leave request not found.");
    }

    if (leave.status !== "PENDING") {
      throw ApiError.badRequest(`Cannot cancel leave with status '${leave.status}'.`);
    }

    leave.status = "CANCELLED";
    await leave.save();

    return leave;
  }

  /**
   * Approve or reject a leave request
   */
  async updateLeaveStatus({ leaveId, status, reviewedBy, reviewComment }) {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw ApiError.notFound("Leave request not found.");
    }

    leave.status = status;
    leave.reviewedBy = reviewedBy;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment || null;

    await leave.save();
    return leave;
  }
}

export default new LeaveService();
