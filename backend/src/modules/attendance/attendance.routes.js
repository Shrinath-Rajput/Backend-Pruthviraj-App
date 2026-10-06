import { Router } from "express";
import attendanceController from "./attendance.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";
import { singleUpload } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import {
  punchAttendanceSchema,
  createShiftSchema,
  allocateShiftSchema,
} from "./attendance.validation.js";

const router = Router();

router.use(authenticate);
router.use(authorizeBusiness());

// Attendance Punch (Section 19)
router.post(
  "/punch",
  singleUpload("selfiePhoto"),
  validate(punchAttendanceSchema),
  attendanceController.punch
);

// Attendance Status & History (Section 23)
router.get("/status/today", attendanceController.getTodayStatus);
router.get("/history/monthly", attendanceController.getMonthlyHistory);
router.get("/export/ledger", attendanceController.exportLedger);

// Ledger list and detail
router.get("/", attendanceController.listAttendance);
router.get("/:id", attendanceController.getAttendanceById);

// Excel Muster Import (Section 24)
router.post(
  "/import/excel",
  authorize(["SUPERVISOR", "SUPER_SUPERVISOR", "HR", "OWNER"]),
  singleUpload("file"),
  attendanceController.importExcel
);

// Shift Management (Section 25)
router.post(
  "/shifts",
  authorize(["OWNER", "HR", "MANAGER", "SUPER_SUPERVISOR"]),
  validate(createShiftSchema),
  attendanceController.createShift
);

router.post(
  "/shifts/allocate",
  authorize(["SUPERVISOR", "SUPER_SUPERVISOR", "HR", "OWNER"]),
  validate(allocateShiftSchema),
  attendanceController.allocateShift
);

export default router;
