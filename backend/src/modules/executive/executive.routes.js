import { Router } from "express";
import executiveController from "./executive.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";

const router = Router();

// Public / Bootstrap Seeder (allows seeding initial OWNER user and data)
router.post("/seed", executiveController.seedData);

// Protected Executive Endpoints
router.use(authenticate);
router.use(authorizeBusiness());

// Regional & Multi-Business Overview (Section 38 & PDF Section 4.6)
router.get(
  "/overview",
  authorize(["OWNER", "SUPER_SUPERVISOR", "MANAGER", "HR"]),
  executiveController.getOverview
);

router.get(
  "/business-performance",
  authorize(["OWNER", "SUPER_SUPERVISOR", "ACCOUNTS"]),
  executiveController.getBusinessPerformance
);

router.get(
  "/analytics/trends",
  authorize(["OWNER", "SUPER_SUPERVISOR", "MANAGER"]),
  executiveController.getAnalyticsTrends
);

router.get(
  "/plants/heatmap",
  authorize(["OWNER", "SUPER_SUPERVISOR", "MANAGER"]),
  executiveController.getPlantsHeatmap
);

router.get(
  "/sites",
  authorize(["OWNER", "SUPER_SUPERVISOR", "MANAGER"]),
  executiveController.getPlantsHeatmap
);

// Centralized Corporate Approvals (Section 37)
router.get(
  "/approvals",
  authorize(["OWNER", "HR", "ACCOUNTS", "MANAGER"]),
  executiveController.getApprovals
);

router.post(
  "/approvals/:id/process",
  authorize(["OWNER", "HR", "ACCOUNTS"]),
  executiveController.processApproval
);

// Financial Management: Billing & Expenses (Section 34 & 36)
router.get(
  "/billing",
  authorize(["OWNER", "ACCOUNTS"]),
  executiveController.getBilling
);

router.post(
  "/billing",
  authorize(["OWNER", "ACCOUNTS"]),
  executiveController.createInvoice
);

router.get(
  "/expenses",
  authorize(["OWNER", "ACCOUNTS", "MANAGER"]),
  executiveController.getExpenses
);

router.post(
  "/expenses",
  authorize(["OWNER", "ACCOUNTS", "MANAGER", "HR"]),
  executiveController.createExpense
);

// Statutory Compliance & Audit Violations (Section 29 & 44)
router.get(
  "/compliance",
  authorize(["OWNER", "HR", "ACCOUNTS"]),
  executiveController.getCompliance
);

router.get(
  "/violations",
  authorize(["OWNER", "SUPER_SUPERVISOR", "HR"]),
  executiveController.getViolations
);

// Global Governance Policy (Section 39)
router.get(
  "/policy",
  authorize(["OWNER", "SUPER_SUPERVISOR"]),
  executiveController.getPolicy
);

router.put(
  "/policy",
  authorize(["OWNER", "SUPER_SUPERVISOR"]),
  executiveController.updatePolicy
);

// Asynchronous Master Audit Export (Section 41)
router.post(
  "/audit/generate",
  authorize(["OWNER", "SUPER_SUPERVISOR", "HR", "ACCOUNTS"]),
  executiveController.triggerAuditExport
);

router.get(
  "/audit/jobs/:id",
  authorize(["OWNER", "SUPER_SUPERVISOR", "HR", "ACCOUNTS"]),
  executiveController.getAuditJob
);

// Tally ERP Integration (Section 54)
router.post(
  "/tally/export",
  authorize(["OWNER", "ACCOUNTS"]),
  executiveController.exportTally
);

export default router;
