import { Router } from "express";
import payrollController from "./payroll.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);
router.use(authorizeBusiness());

// Employee Payslip Access (Section 4.4 in PDF)
router.get("/slips", payrollController.getEmployeeSlips);
router.get("/slips/:id", payrollController.getSlipDetails);
router.get("/slips/:id/pdf", payrollController.downloadSlipPdf);

// Executive & HR Processing Workflow (Section 27)
router.post(
  "/process",
  authorize(["OWNER", "HR", "ACCOUNTS"]),
  payrollController.processPayroll
);

router.post(
  "/approve",
  authorize(["OWNER", "HR"]),
  payrollController.approvePayroll
);

router.post(
  "/disburse",
  authorize(["OWNER", "ACCOUNTS"]),
  payrollController.disbursePayroll
);

export default router;
