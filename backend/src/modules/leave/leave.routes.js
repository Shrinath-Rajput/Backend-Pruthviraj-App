import { Router } from "express";
import leaveController from "./leave.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);
router.use(authorizeBusiness());

// Employee Self-Service Endpoints (Section 26)
router.get("/balances", leaveController.getBalances);
router.get("/my-requests", leaveController.getMyRequests);
router.post("/apply", leaveController.apply);

// Administrative / Review Endpoints
router.get(
  "/",
  authorize(["OWNER", "HR", "MANAGER", "SUPER_SUPERVISOR", "SUPERVISOR"]),
  leaveController.list
);

router.put(
  "/:id/review",
  authorize(["OWNER", "HR", "MANAGER", "SUPER_SUPERVISOR", "SUPERVISOR"]),
  leaveController.review
);

export default router;
