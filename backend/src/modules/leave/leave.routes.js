import { Router } from "express";
import leaveController from "./leave.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, ROLES } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);

// Employee leave endpoints
router.post("/", leaveController.applyLeave);
router.get("/me", leaveController.getMyLeaves);
router.get("/balance", leaveController.getMyLeaveBalance);
router.put("/:id/cancel", leaveController.cancelLeave);

// Supervisor & Executive endpoints
router.get(
  "/",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  leaveController.getAllLeaves
);

router.put(
  "/:id/status",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  leaveController.updateLeaveStatus
);

export default router;
