import { Router } from "express";
import payrollController from "../modules/payroll/payroll.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, ROLES } from "../middleware/authorize.js";

const router = Router();

router.use(authenticate);

// Employee access
router.get("/me", payrollController.getMyPayroll);
router.get("/:id/slip", payrollController.downloadSalarySlip);

// Supervisor & Executive access
router.get(
  "/",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  payrollController.getAllPayroll
);

router.post(
  "/process",
  authorize(ROLES.SUPER_SUPERVISOR),
  payrollController.processSalary
);

router.put(
  "/:id/pay",
  authorize(ROLES.SUPER_SUPERVISOR),
  payrollController.markAsPaid
);

export default router;
