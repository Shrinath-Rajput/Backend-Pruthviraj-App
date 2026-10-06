import User from "../auth/user.model.js";
import Site from "../site/site.model.js";
import Attendance from "../attendance/attendance.model.js";
import Leave from "../leave/leave.model.js";
import ApiError from "../../common/ApiError.js";

export class SupervisorService {
  /**
   * Assign an employee to a site and supervisor
   */
  async assignEmployeeToSite({ employeeId, siteId, supervisorId }) {
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw ApiError.notFound("Employee not found.");
    }

    const site = await Site.findById(siteId);
    if (!site) {
      throw ApiError.notFound("Work site not found.");
    }

    employee.siteId = siteId;
    employee.assignedSupervisorId = supervisorId;
    await employee.save();

    return employee;
  }

  /**
   * List all crew members assigned to this supervisor
   */
  async getAssignedCrew(supervisorId) {
    const crew = await User.find({ assignedSupervisorId: supervisorId, isActive: true })
      .populate("siteId", "name code location radiusMeters")
      .select("-password");

    return crew;
  }

  /**
   * Get all sites supervised by this supervisor
   */
  async getSupervisorSites(supervisorId) {
    const sites = await Site.find({ assignedSupervisorId: supervisorId, isActive: true });
    return sites;
  }

  /**
   * Supervise live attendance of crew members today
   */
  async getCrewLiveAttendance(supervisorId, queryDate) {
    const date = queryDate || new Date().toISOString().split("T")[0];

    // Find all crew members under this supervisor
    const crew = await User.find({ assignedSupervisorId: supervisorId, isActive: true });
    const crewIds = crew.map((c) => c._id);

    // Fetch attendance for these crew members
    const attendanceRecords = await Attendance.find({
      employeeId: { $in: crewIds },
      date,
    }).populate("siteId", "name code");

    const attendanceMap = new Map();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(rec.employeeId.toString(), rec);
    });

    const report = crew.map((member) => {
      const attendance = attendanceMap.get(member._id.toString());
      return {
        employee: {
          id: member._id,
          name: member.name,
          employeeCode: member.employeeCode,
          designation: member.designation,
          phone: member.phone,
        },
        hasPunchedIn: !!attendance,
        hasPunchedOut: !!attendance?.punchOutTime,
        punchInTime: attendance?.punchInTime || null,
        punchOutTime: attendance?.punchOutTime || null,
        status: attendance ? attendance.status : "ABSENT",
        isInsideGeofence: attendance?.punchInInsideGeofence ?? false,
      };
    });

    return {
      date,
      totalCrew: crew.length,
      presentCount: attendanceRecords.length,
      absentCount: crew.length - attendanceRecords.length,
      records: report,
    };
  }

  /**
   * Review employee leave application (Approve / Reject)
   */
  async reviewCrewLeave({ supervisorId, leaveId, status, reviewComment }) {
    const leave = await Leave.findById(leaveId).populate("employeeId", "assignedSupervisorId name");
    if (!leave) {
      throw ApiError.notFound("Leave request not found.");
    }

    // Verify supervisor authority over the employee
    if (
      leave.employeeId.assignedSupervisorId &&
      leave.employeeId.assignedSupervisorId.toString() !== supervisorId.toString()
    ) {
      throw ApiError.forbidden("You are not authorized to review leave for this employee.");
    }

    leave.status = status;
    leave.reviewedBy = supervisorId;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment || "";

    await leave.save();
    return leave;
  }

  /**
   * Get supervisor dashboard metrics
   */
  async getSupervisorDashboardMetrics(supervisorId) {
    const today = new Date().toISOString().split("T")[0];
    const crew = await User.find({ assignedSupervisorId: supervisorId, isActive: true });
    const crewIds = crew.map((c) => c._id);

    const [todayAttendanceCount, pendingLeavesCount] = await Promise.all([
      Attendance.countDocuments({
        employeeId: { $in: crewIds },
        date: today,
      }),
      Leave.countDocuments({
        employeeId: { $in: crewIds },
        status: "PENDING",
      }),
    ]);

    return {
      totalCrew: crew.length,
      presentToday: todayAttendanceCount,
      absentToday: crew.length - todayAttendanceCount,
      pendingLeaveRequests: pendingLeavesCount,
    };
  }
}

export default new SupervisorService();
