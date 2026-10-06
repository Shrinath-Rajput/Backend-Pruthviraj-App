import Attendance from "./attendance.model.js";
import Site from "../site/site.model.js";
import ApiError from "../../common/ApiError.js";
import {
  calculateDistanceMeters,
  toGeoJSONPoint,
} from "../../common/utils/geoSpatial.js";
import { generateAttendanceHash } from "../../common/utils/cryptoHash.js";

export class AttendanceService {
  /**
   * Process employee Punch In with Geofence & Cryptographic Verification
   */
  async punchIn({ employeeId, siteId, latitude, longitude, deviceId, selfieUrl }) {
    const site = await Site.findById(siteId);
    if (!site) {
      throw ApiError.notFound("Work site not found.");
    }

    if (!site.isActive) {
      throw ApiError.badRequest("Target work site is currently inactive.");
    }

    // Geofence Distance Calculation
    const [siteLon, siteLat] = site.location.coordinates;
    const distanceMeters = calculateDistanceMeters(latitude, longitude, siteLat, siteLon);

    const isInsideGeofence = distanceMeters <= site.radiusMeters;
    if (!isInsideGeofence) {
      throw ApiError.badRequest(
        `Punch-in failed: Outside site geofence. Distance: ${Math.round(distanceMeters)}m (Max allowed: ${site.radiusMeters}m)`
      );
    }

    // Check for existing punch today
    const today = new Date().toISOString().split("T")[0];
    const existingPunch = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (existingPunch && !existingPunch.punchOutTime) {
      throw ApiError.conflict("You have already punched in for today and haven't punched out yet.");
    }

    const punchInTime = new Date();

    // Generate SHA-256 digital fingerprint
    const punchInHash = generateAttendanceHash({
      userId: employeeId,
      siteId: site._id.toString(),
      latitude,
      longitude,
      timestamp: punchInTime,
      deviceId,
    });

    const punchInLocation = toGeoJSONPoint(latitude, longitude);

    const attendance = await Attendance.create({
      employeeId,
      siteId,
      date: today,
      punchInTime,
      punchInLocation,
      punchInDistanceMeters: distanceMeters,
      punchInInsideGeofence: isInsideGeofence,
      punchInHash,
      deviceId,
      selfieUrl,
      status: "PRESENT",
    });

    return attendance;
  }

  /**
   * Process employee Punch Out
   */
  async punchOut({ employeeId, latitude, longitude, deviceId }) {
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      punchOutTime: null,
    }).populate("siteId");

    if (!attendance) {
      throw ApiError.badRequest("No active punch-in session found for today.");
    }

    const site = attendance.siteId;
    const [siteLon, siteLat] = site.location.coordinates;
    const distanceMeters = calculateDistanceMeters(latitude, longitude, siteLat, siteLon);
    const isInsideGeofence = distanceMeters <= site.radiusMeters;

    const punchOutTime = new Date();
    const durationMs = punchOutTime.getTime() - attendance.punchInTime.getTime();
    const totalHoursWorked = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;

    const punchOutHash = generateAttendanceHash({
      userId: employeeId,
      siteId: site._id.toString(),
      latitude,
      longitude,
      timestamp: punchOutTime,
      deviceId,
    });

    // Determine status based on duration
    let status = "PRESENT";
    if (totalHoursWorked < 4) {
      status = "HALF_DAY";
    } else if (totalHoursWorked >= 9) {
      status = "OVERTIME";
    }

    attendance.punchOutTime = punchOutTime;
    attendance.punchOutLocation = toGeoJSONPoint(latitude, longitude);
    attendance.punchOutDistanceMeters = distanceMeters;
    attendance.punchOutInsideGeofence = isInsideGeofence;
    attendance.punchOutHash = punchOutHash;
    attendance.totalHoursWorked = totalHoursWorked;
    attendance.status = status;

    await attendance.save();

    return attendance;
  }

  /**
   * Fetch attendance history with filters
   */
  async getAttendanceHistory({ employeeId, siteId, startDate, endDate, page = 1, limit = 20 }) {
    const query = {};

    if (employeeId) query.employeeId = employeeId;
    if (siteId) query.siteId = siteId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "name email employeeCode role designation")
        .populate("siteId", "name code location radiusMeters")
        .skip(skip)
        .limit(Number(limit))
        .sort({ punchInTime: -1 }),
      Attendance.countDocuments(query),
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
   * Get current attendance status for today
   */
  async getTodayStatus(employeeId) {
    const today = new Date().toISOString().split("T")[0];
    const record = await Attendance.findOne({
      employeeId,
      date: today,
    }).populate("siteId", "name code radiusMeters");

    return {
      date: today,
      hasPunchedIn: !!record,
      hasPunchedOut: !!record?.punchOutTime,
      attendance: record,
    };
  }

  /**
   * Manual Attendance Override (by Supervisor / Admin)
   */
  async manualOverride({ supervisorId, attendanceId, status, overrideReason, punchInTime, punchOutTime }) {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw ApiError.notFound("Attendance record not found.");
    }

    attendance.isOverridden = true;
    attendance.overriddenBy = supervisorId;
    attendance.overrideReason = overrideReason;
    attendance.status = status;

    if (punchInTime) attendance.punchInTime = new Date(punchInTime);
    if (punchOutTime) {
      attendance.punchOutTime = new Date(punchOutTime);
      const durationMs = attendance.punchOutTime.getTime() - attendance.punchInTime.getTime();
      attendance.totalHoursWorked = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
    }

    await attendance.save();
    return attendance;
  }
}

export default new AttendanceService();
