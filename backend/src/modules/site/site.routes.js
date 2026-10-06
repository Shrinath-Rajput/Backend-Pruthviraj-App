import { Router } from "express";
import siteController from "./site.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize, authorizeBusiness } from "../../middleware/authorize.js";
import { singleUpload } from "../../middleware/upload.js";

const router = Router();

// Apply authentication and business scope to all site module routes
router.use(authenticate);
router.use(authorizeBusiness());

// ================= SITE ROUTES =================
router.post(
  "/",
  authorize(["OWNER", "HR", "MANAGER"]),
  siteController.createSite
);

router.get("/", siteController.getSites);
router.get("/:id", siteController.getSiteById);

router.put(
  "/:id",
  authorize(["OWNER", "HR", "MANAGER"]),
  siteController.updateSite
);

// ================= CLIENT ROUTES (Section 30) =================
router.post(
  "/clients",
  authorize(["OWNER", "ACCOUNTS", "MANAGER", "HR"]),
  siteController.createClient
);

router.get("/clients", siteController.getClients);
router.get("/clients/:id", siteController.getClientById);

router.put(
  "/clients/:id",
  authorize(["OWNER", "ACCOUNTS", "MANAGER"]),
  siteController.updateClient
);

// ================= PURCHASE ORDERS (Section 33) =================
router.post(
  "/purchase-orders",
  authorize(["OWNER", "ACCOUNTS", "MANAGER"]),
  singleUpload("document"),
  siteController.createPurchaseOrder
);

router.get("/purchase-orders", siteController.getPurchaseOrders);

// ================= WORKERS MANAGEMENT (Section 31 & 32) =================
router.post(
  "/workers",
  authorize(["OWNER", "HR", "MANAGER", "SUPER_SUPERVISOR"]),
  siteController.createWorker
);

router.get("/workers", siteController.getWorkers);
router.get("/workers/:id", siteController.getWorkerById);

router.post(
  "/workers/:id/documents",
  singleUpload("document"),
  siteController.uploadWorkerDocument
);

export default router;
