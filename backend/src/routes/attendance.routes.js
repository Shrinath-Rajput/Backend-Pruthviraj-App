import { Router } from "express";
import attendanceController from "../modules/attendance/attendance.controller.js";
import {
  punchInSchema,
  punchOutSchema,
  manualOverrideSchema,
} from "../modules/attendance/attendance.validation.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, ROLES } from "../middleware/authorize.js";

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

// Employee Attendance Endpoints
router.post(
  "/punch-in",
  validate(punchInSchema),
  attendanceController.punchIn
);

router.post(
  "/punch-out",
  validate(punchOutSchema),
  attendanceController.punchOut
);

router.get("/me", attendanceController.getMyAttendance);
router.get("/today", attendanceController.getTodayStatus);

// Supervisor & Higher Operations
router.get(
  "/",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  attendanceController.getAllAttendance
);

router.post(
  "/override",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  validate(manualOverrideSchema),
  attendanceController.manualOverride
);

export default router;
