import { Site, SiteGovernance } from "../site/site.model.js";
import { AttendanceRecord, ShiftAllocation } from "../attendance/attendance.model.js";
import { LeaveApplication, LeaveBalance } from "../leave/leave.model.js";
import User from "../auth/user.model.js";
import attendanceService from "../attendance/attendance.service.js";
import ApiError from "../../common/ApiError.js";
import { redisService } from "../../config/redis.js";
import { calculateDistanceMeters } from "../../common/utils/geoSpatial.js";

export class SupervisorService {
  /**
   * List assigned managed sites for supervisor (Section 40)
   */
  async getManagedSites(supervisorId, allowedBusinessIds) {
    const governances = await SiteGovernance.find({
      $or: [{ primarySupervisorId: supervisorId }, { handoverSupervisorId: supervisorId }],
      businessId: { $in: allowedBusinessIds },
    }).populate("siteId", "siteCode siteName region centroid geofenceRadiusMeters");

    return governances.map((g) => ({
      siteId: g.siteId?._id,
      siteName: g.siteId?.siteName,
      siteCode: g.siteId?.siteCode,
      governanceStatus: g.governanceStatus,
      activeWorkersCount: g.activeWorkersCount || 0,
      activeShiftName: g.activeShiftName,
      lastHeartbeat: g.lastHeartbeat,
    }));
  }

  /**
   * Get single site 1:1 binding governance status
   */
  async getSiteGovernance(siteId, allowedBusinessIds) {
    const governance = await SiteGovernance.findOne({ siteId })
      .populate("primarySupervisorId", "fullName employeeCode phoneNumber")
      .populate("handoverSupervisorId", "fullName employeeCode phoneNumber");

    if (!governance) {
      throw ApiError.notFound("No governance binding found for this site.");
    }

    if (!allowedBusinessIds.includes(governance.businessId)) {
      throw ApiError.forbidden("Access denied to site governance.");
    }

    // Refresh heartbeat
    governance.lastHeartbeat = new Date();
    await governance.save();

    return {
      siteId: governance.siteId,
      primarySupervisor: governance.primarySupervisorId,
      governanceStatus: governance.governanceStatus,
      handoverSupervisor: governance.handoverSupervisorId,
      handoverInitiatedAt: governance.handoverInitiatedAt,
      activeWorkersCount: governance.activeWorkersCount,
      lastHeartbeat: governance.lastHeartbeat,
    };
  }

  /**
   * Site Handover Protocol with Redis Distributed Locking (Section 16 & 40)
   */
  async executeHandover({ siteId, action, newSupervisorId, currentUserId, allowedBusinessIds }) {
    const lockKey = `handover:${siteId}`;
    const lockToken = await redisService.acquireLock(lockKey, 15);
    if (!lockToken) {
      throw ApiError.conflict("A handover operation is currently in progress for this site. Please wait.");
    }

    try {
      const governance = await SiteGovernance.findOne({ siteId });
      if (!governance) throw ApiError.notFound("Site governance not found.");
      if (!allowedBusinessIds.includes(governance.businessId)) {
        throw ApiError.forbidden("Unauthorized business scope.");
      }

      if (action === "INITIATE") {
        if (governance.primarySupervisorId.toString() !== currentUserId.toString()) {
          throw ApiError.forbidden("Only the current primary supervisor can initiate handover.");
        }

        const incoming = await User.findById(newSupervisorId);
        if (!incoming || !["SUPERVISOR", "SUPER_SUPERVISOR"].includes(incoming.role)) {
          throw ApiError.badRequest("Invalid incoming supervisor identifier.");
        }

        governance.governanceStatus = "HANDOVER_PENDING";
        governance.handoverSupervisorId = newSupervisorId;
        governance.handoverInitiatedAt = new Date();
        await governance.save();

        return {
          siteId: governance.siteId,
          governanceStatus: governance.governanceStatus,
          message: "Handover initiated successfully.",
        };
      } else if (action === "CONFIRM") {
        if (
          !governance.handoverSupervisorId ||
          governance.handoverSupervisorId.toString() !== currentUserId.toString()
        ) {
          throw ApiError.forbidden("Only the designated incoming supervisor can confirm handover.");
        }

        // Complete 1:1 handover
        governance.primarySupervisorId = currentUserId;
        governance.handoverSupervisorId = null;
        governance.handoverInitiatedAt = null;
        governance.governanceStatus = "ACTIVE_ON_DUTY";
        governance.lastHeartbeat = new Date();
        await governance.save();

        return {
          siteId: governance.siteId,
          governanceStatus: governance.governanceStatus,
          primarySupervisor: governance.primarySupervisorId,
          message: "Handover confirmed. You are now the active primary supervisor for this site.",
        };
      } else {
        throw ApiError.badRequest("Invalid handover action. Must be 'INITIATE' or 'CONFIRM'.");
      }
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Crew roster list for active site & shift
   */
  async getCrew({ siteId, allowedBusinessIds }) {
    const todayStr = new Date().toISOString().split("T")[0];
    const site = await Site.findById(siteId);
    if (!site || !allowedBusinessIds.includes(site.businessId)) {
      throw ApiError.notFound("Site not found or unauthorized.");
    }

    const workers = await User.find({
      assignedSiteId: siteId,
      role: { $in: ["EMPLOYEE", "STAFF"] },
      isActive: true,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const attendances = await AttendanceRecord.find({
      siteId,
      punchTimestamp: { $gte: todayStart },
    });

    return workers.map((w) => {
      const punch = attendances.find((a) => a.userId.toString() === w._id.toString());
      return {
        id: w._id,
        name: w.fullName,
        employeeCode: w.employeeCode,
        role: w.role,
        status: punch ? "PRESENT" : "ABSENT",
        geofenceStatus: punch?.isInsideGeofence ? "INSIDE_GEOFENCE" : "OUTSIDE",
        timeIn: punch?.punchTimestamp || null,
        photoHash: punch?.photoHash || null,
      };
    });
  }

  /**
   * Batch check-in crew with GPS centroid stamping (Section 40)
   */
  async bulkAttendance({ siteId, shiftId, records, supervisorLat, supervisorLon, supervisorId, allowedBusinessIds }) {
    const site = await Site.findById(siteId);
    if (!site || !allowedBusinessIds.includes(site.businessId)) {
      throw ApiError.notFound("Site not found or unauthorized.");
    }

    let successCount = 0;
    for (const rec of records) {
      try {
        await attendanceService.overridePunch({
          supervisorId,
          workerId: rec.userId,
          action: rec.punchType || "CHECK_IN",
          overrideReason: "Bulk supervisor muster check-in",
          siteId,
          shiftId,
          allowedBusinessIds,
        });
        successCount++;
      } catch (err) {
        // Continue with others
      }
    }

    return {
      success: true,
      count: successCount,
      totalSubmitted: records.length,
    };
  }

  /**
   * Pending subordinate leaves for review
   */
  async getPendingLeaves(supervisorId, allowedBusinessIds) {
    const mySites = await SiteGovernance.find({
      primarySupervisorId: supervisorId,
      businessId: { $in: allowedBusinessIds },
    }).select("siteId");

    const siteIds = mySites.map((s) => s.siteId);

    const pending = await LeaveApplication.find({
      siteId: { $in: siteIds },
      status: "PENDING",
    }).populate("userId", "fullName employeeCode designation phoneNumber");

    return pending.map((l) => ({
      reqId: l._id,
      workerName: l.userId?.fullName,
      employeeCode: l.userId?.employeeCode,
      role: l.userId?.designation,
      dates: `${l.startDate.toISOString().split("T")[0]} to ${l.endDate.toISOString().split("T")[0]}`,
      totalDays: l.totalDays,
      leaveType: l.leaveType,
      reason: l.reason,
    }));
  }

  /**
   * Supervisor Review Subordinate Leave (Section 40)
   */
  async reviewLeave({ leaveId, status, replacementWorkerId, notes, supervisorId, allowedBusinessIds }) {
    const leave = await LeaveApplication.findById(leaveId);
    if (!leave) throw ApiError.notFound("Leave application not found.");

    if (!allowedBusinessIds.includes(leave.businessId)) {
      throw ApiError.forbidden("Unauthorized business scope.");
    }

    leave.status = status;
    leave.reviewedBySupervisorId = supervisorId;
    leave.reviewedAt = new Date();
    leave.reviewComment = notes;
    if (replacementWorkerId) leave.replacementWorkerId = replacementWorkerId;

    await leave.save();

    // If approved, deduct quota
    if (status === "APPROVED") {
      const year = new Date(leave.startDate).getFullYear();
      const balance = await LeaveBalance.findOne({ userId: leave.userId, year });
      if (balance) {
        const typeKey = `${leave.leaveType.toLowerCase()}Leave`;
        if (balance[typeKey]) {
          balance[typeKey].used += leave.totalDays;
          balance[typeKey].remaining = Math.max(0, balance[typeKey].total - balance[typeKey].used);
          await balance.save();
        }
      }
    }

    return {
      message: "Review recorded",
      status: leave.status,
    };
  }

  /**
   * Live worker distance from gate (Section 40)
   */
  async getLiveRoster({ siteId, allowedBusinessIds }) {
    const site = await Site.findById(siteId);
    if (!site || !allowedBusinessIds.includes(site.businessId)) {
      throw ApiError.notFound("Site not found.");
    }

    const workers = await User.find({
      assignedSiteId: siteId,
      role: { $in: ["EMPLOYEE", "STAFF"] },
      isActive: true,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const attendances = await AttendanceRecord.find({
      siteId,
      punchTimestamp: { $gte: todayStart },
    });

    return workers.map((w) => {
      const punch = attendances.find((a) => a.userId.toString() === w._id.toString());
      const coords = punch?.location?.coordinates || site.centroid.coordinates;
      const distance = calculateDistanceMeters(
        coords[1],
        coords[0],
        site.centroid.coordinates[1],
        site.centroid.coordinates[0]
      );

      return {
        id: w._id,
        name: w.fullName,
        employeeCode: w.employeeCode,
        location: coords,
        distance: distance,
        faceVerified: Boolean(punch?.biometricMatchScore && punch.biometricMatchScore >= 80),
        status: punch ? "ON_SITE" : "OFF_SITE",
      };
    });
  }
}

export default new SupervisorService();
