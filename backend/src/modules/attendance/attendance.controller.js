import attendanceService from "./attendance.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class AttendanceController {
  async punchIn(req, res, next) {
    try {
      const result = await attendanceService.punchIn({
        employeeId: req.user.id,
        ...req.body,
      });
      return res
        .status(201)
        .json(ApiResponse.created(result, "Punched in successfully within geofence."));
    } catch (error) {
      next(error);
    }
  }

  async punchOut(req, res, next) {
    try {
      const result = await attendanceService.punchOut({
        employeeId: req.user.id,
        ...req.body,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Punched out successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getMyAttendance(req, res, next) {
    try {
      const result = await attendanceService.getAttendanceHistory({
        employeeId: req.user.id,
        ...req.query,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Attendance history retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const result = await attendanceService.getTodayStatus(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Today's attendance status."));
    } catch (error) {
      next(error);
    }
  }

  async getAllAttendance(req, res, next) {
    try {
      const result = await attendanceService.getAttendanceHistory(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(result, "All attendance records retrieved."));
    } catch (error) {
      next(error);
    }
  }

  async manualOverride(req, res, next) {
    try {
      const result = await attendanceService.manualOverride({
        supervisorId: req.user.id,
        ...req.body,
      });
      return res
        .status(200)
        .json(ApiResponse.success(result, "Attendance record overridden successfully."));
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();
