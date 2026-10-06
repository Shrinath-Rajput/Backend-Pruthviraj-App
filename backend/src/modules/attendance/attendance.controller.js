import attendanceService from "./attendance.service.js";
import { AttendanceRecord } from "./attendance.model.js";
import ApiResponse from "../../common/ApiResponse.js";
import ApiError from "../../common/ApiError.js";

export class AttendanceController {
  async punch(req, res, next) {
    try {
      const idempotencyKey = req.headers["idempotency-key"];
      const result = await attendanceService.punchAttendance({
        userId: req.user.id,
        siteId: req.body.siteId,
        shiftId: req.body.shiftId,
        punchType: req.body.punchType,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        accuracy: parseFloat(req.body.accuracy || 5),
        selfieFile: req.file,
        idempotencyKey,
      });

      return res.status(200).json(ApiResponse.success(result, "Punch verified and chained into ledger."));
    } catch (error) {
      next(error);
    }
  }

  async getTodayStatus(req, res, next) {
    try {
      const status = await attendanceService.getTodayStatus(req.user.id);
      return res.status(200).json(ApiResponse.success(status));
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyHistory(req, res, next) {
    try {
      const history = await attendanceService.getMonthlyHistory({
        userId: req.query.userId || req.user.id,
        month: req.query.month,
        year: req.query.year,
        siteId: req.query.siteId,
        businessId: req.query.businessId,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.success(history));
    } catch (error) {
      next(error);
    }
  }

  async exportLedger(req, res, next) {
    try {
      const pdfBuffer = await attendanceService.exportLedgerPdf({
        month: req.query.month,
        year: req.query.year,
        userId: req.query.userId || req.user.id,
        siteId: req.query.siteId,
        allowedBusinessIds: req.allowedBusinessIds,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance_ledger_${req.query.month || "current"}_${req.query.year || "2026"}.pdf"`
      );
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  async listAttendance(req, res, next) {
    try {
      const { page = 1, limit = 20, siteId, userId, businessId, status } = req.query;
      const query = { businessId: { $in: req.allowedBusinessIds } };

      if (businessId && req.allowedBusinessIds.includes(businessId)) query.businessId = businessId;
      if (siteId) query.siteId = siteId;
      if (userId) query.userId = userId;
      if (status) query.verificationStatus = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [records, total] = await Promise.all([
        AttendanceRecord.find(query)
          .populate("userId", "fullName employeeCode phoneNumber")
          .populate("siteId", "siteName siteCode")
          .skip(skip)
          .limit(Number(limit))
          .sort({ punchTimestamp: -1 }),
        AttendanceRecord.countDocuments(query),
      ]);

      return res.status(200).json(
        ApiResponse.list(records, {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceById(req, res, next) {
    try {
      const record = await AttendanceRecord.findById(req.params.id)
        .populate("userId", "fullName employeeCode phoneNumber designation")
        .populate("siteId", "siteName siteCode centroid locationCode");

      if (!record) throw ApiError.notFound("Attendance record not found.");
      if (!req.allowedBusinessIds.includes(record.businessId)) {
        throw ApiError.forbidden("Access denied to record in unauthorized business.");
      }

      return res.status(200).json(ApiResponse.success(record));
    } catch (error) {
      next(error);
    }
  }

  async importExcel(req, res, next) {
    try {
      if (!req.file) throw ApiError.badRequest("Spreadsheet file is required.");
      const businessId = req.body.businessId || req.allowedBusinessIds[0];
      const report = await attendanceService.parseAndImportExcel({
        buffer: req.file.buffer,
        businessId,
        supervisorId: req.user.id,
        allowedBusinessIds: req.allowedBusinessIds,
      });

      return res.status(200).json(ApiResponse.success(report, "Excel muster imported successfully."));
    } catch (error) {
      next(error);
    }
  }

  async createShift(req, res, next) {
    try {
      const shift = await attendanceService.createShift(req.body, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(shift, "Shift created successfully."));
    } catch (error) {
      next(error);
    }
  }

  async allocateShift(req, res, next) {
    try {
      const allocation = await attendanceService.allocateShift(req.body, req.user.id);
      return res.status(201).json(ApiResponse.created(allocation, "Shift allocated."));
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();
