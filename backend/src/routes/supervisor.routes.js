import { Router } from "express";
import supervisorController from "../modules/supervisor/supervisor.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, ROLES } from "../middleware/authorize.js";

const router = Router();

// Restrict all supervisor endpoints to SUPERVISOR or SUPER_SUPERVISOR
router.use(authenticate, authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR));

router.get("/crew", supervisorController.getAssignedCrew);
router.get("/sites", supervisorController.getSites);
router.get("/attendance/live", supervisorController.getLiveAttendance);
router.get("/dashboard", supervisorController.getDashboard);
router.post("/assign", supervisorController.assignEmployee);
router.put("/leaves/:leaveId/review", supervisorController.reviewLeave);

export default router;
