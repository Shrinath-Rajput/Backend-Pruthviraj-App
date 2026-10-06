import { Router } from "express";
import executiveController from "../modules/executive/executive.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, ROLES } from "../middleware/authorize.js";

const router = Router();

// Only SUPER_SUPERVISOR role has executive dashboard privileges
router.use(authenticate, authorize(ROLES.SUPER_SUPERVISOR));

router.get("/dashboard", executiveController.getDashboardMetrics);
router.get("/analytics/attendance", executiveController.getAttendanceAnalytics);
router.get("/analytics/payroll", executiveController.getPayrollAnalytics);
router.get("/policy", executiveController.getGeofencePolicy);
router.put("/policy", executiveController.updateGeofencePolicy);
router.get("/audit-trail", executiveController.getAuditTrail);

export default router;
