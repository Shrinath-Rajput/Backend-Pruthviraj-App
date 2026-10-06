import { LeaveBalance, LeaveApplication } from "./leave.model.js";
import User from "../auth/user.model.js";
import ApiError from "../../common/ApiError.js";

export class LeaveService {
  /**
   * Get or initialize available leave quotas for user
   */
  async getBalances(userId, businessId) {
    const year = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({ userId, year });

    if (!balance) {
      balance = await LeaveBalance.create({
        userId,
        businessId: businessId || "pruthviraj-enterprises",
        year,
        casualLeave: { total: 12, used: 0, remaining: 12 },
        sickLeave: { total: 10, used: 0, remaining: 10 },
        earnedLeave: { total: 15, used: 0, remaining: 15 },
      });
    }

    return {
      year: balance.year,
      casualRemaining: balance.casualLeave.remaining,
      sickRemaining: balance.sickLeave.remaining,
      earnedRemaining: balance.earnedLeave.remaining,
      details: {
        casual: balance.casualLeave,
        sick: balance.sickLeave,
        earned: balance.earnedLeave,
      },
    };
  }

  /**
   * Personal leave request history
   */
  async getMyRequests(userId) {
    const requests = await LeaveApplication.find({ userId }).sort({ appliedAt: -1 });

    return requests.map((r) => ({
      id: r._id,
      type: r.leaveType,
      dates: `${r.startDate.toISOString().split("T")[0]} to ${r.endDate.toISOString().split("T")[0]}`,
      days: r.totalDays,
      status: r.status,
      reason: r.reason,
      appliedAt: r.appliedAt,
      reviewComment: r.reviewComment,
    }));
  }

  /**
   * Submit new leave application with overlap & negative quota prevention (Section 26)
   */
  async applyLeave({ userId, leaveType, startDate, endDate, reason, allowedBusinessIds }) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ApiError.badRequest("Invalid date format. Please provide valid dates.");
    }

    if (end < start) {
      throw ApiError.badRequest("Leave end date cannot precede start date.");
    }

    // Calculate inclusive days (excluding weekends if needed, standard day diff)
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found.");

    const businessId = user.businessIds?.[0] || allowedBusinessIds[0] || "pruthviraj-enterprises";

    // Prevent overlapping leaves
    const overlapping = await LeaveApplication.findOne({
      userId,
      status: { $in: ["PENDING", "APPROVED"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      throw ApiError.conflict(
        `Leave request overlaps with existing application from ${overlapping.startDate.toISOString().split("T")[0]} to ${overlapping.endDate.toISOString().split("T")[0]}.`
      );
    }

    // Prevent negative balance
    const year = start.getFullYear();
    const balance = await this.getBalances(userId, businessId);
    const typeKey = `${leaveType.toLowerCase()}Remaining`;

    if (balance[typeKey] < totalDays) {
      throw ApiError.badRequest(
        `Insufficient leave balance for ${leaveType} leave. Requested: ${totalDays} days, Remaining: ${balance[typeKey]} days.`
      );
    }

    const application = await LeaveApplication.create({
      userId,
      businessId,
      siteId: user.assignedSiteId || null,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: "PENDING",
      appliedAt: new Date(),
    });

    return {
      applicationId: application._id,
      status: application.status,
      totalDays: application.totalDays,
    };
  }

  /**
   * List all leave requests for administration / HR
   */
  async listLeaves({ businessId, siteId, status, page = 1, limit = 20, allowedBusinessIds }) {
    const query = { businessId: { $in: allowedBusinessIds } };
    if (businessId && allowedBusinessIds.includes(businessId)) query.businessId = businessId;
    if (siteId) query.siteId = siteId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [leaves, total] = await Promise.all([
      LeaveApplication.find(query)
        .populate("userId", "fullName employeeCode designation phoneNumber")
        .populate("siteId", "siteName siteCode")
        .skip(skip)
        .limit(Number(limit))
        .sort({ appliedAt: -1 }),
      LeaveApplication.countDocuments(query),
    ]);

    return {
      leaves,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Review leave application (Approve / Reject)
   */
  async reviewLeave(leaveId, { status, reviewComment, reviewerId, allowedBusinessIds }) {
    const application = await LeaveApplication.findById(leaveId);
    if (!application) throw ApiError.notFound("Leave application not found.");

    if (!allowedBusinessIds.includes(application.businessId)) {
      throw ApiError.forbidden("Access denied to leave application in unauthorized business.");
    }

    application.status = status;
    application.reviewedBySupervisorId = reviewerId;
    application.reviewedAt = new Date();
    application.reviewComment = reviewComment;
    await application.save();

    if (status === "APPROVED") {
      const year = new Date(application.startDate).getFullYear();
      const balance = await LeaveBalance.findOne({ userId: application.userId, year });
      if (balance) {
        const typeKey = `${application.leaveType.toLowerCase()}Leave`;
        if (balance[typeKey]) {
          balance[typeKey].used += application.totalDays;
          balance[typeKey].remaining = Math.max(0, balance[typeKey].total - balance[typeKey].used);
          await balance.save();
        }
      }
    }

    return application;
  }
}

export default new LeaveService();
