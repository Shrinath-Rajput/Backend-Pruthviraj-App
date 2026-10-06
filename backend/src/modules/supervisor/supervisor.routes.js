import { Router } from "express";
import supervisorController from "./supervisor.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  bulkAttendanceSchema,
  attendanceOverrideSchema,
} from "../attendance/attendance.validation.js";

const router = Router();

// Apply Authentication, Supervisor Role Guard, and Business Scope
router.use(authenticate);
router.use(authorize(["SUPERVISOR", "SUPER_SUPERVISOR", "MANAGER", "OWNER"]));
router.use(authorizeBusiness());

// Managed Sites & 1:1 Governance (Section 16 & 40)
router.get("/sites", supervisorController.getSites);
router.get("/sites/:id/governance", supervisorController.getSiteGovernance);
router.post("/sites/:id/handover", supervisorController.handoverSite);

// Crew Operations & Bulk Attendance (Section 40)
router.get("/crew", supervisorController.getCrew);
router.post(
  "/attendance/bulk",
  validate(bulkAttendanceSchema),
  supervisorController.bulkAttendance
);

// Subordinate Leave Review (Section 40)
router.get("/leaves/pending", supervisorController.getPendingLeaves);
router.put("/leaves/:id/review", supervisorController.reviewLeave);

// Live Roster & Manual Override Punch (Section 40)
router.get("/roster/live", supervisorController.getLiveRoster);
router.post(
  "/roster/override-punch",
  validate(attendanceOverrideSchema),
  supervisorController.overridePunch
);

export default router;
