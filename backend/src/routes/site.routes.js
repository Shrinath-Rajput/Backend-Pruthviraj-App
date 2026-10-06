import { Router } from "express";
import siteController from "../modules/site/site.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, ROLES } from "../middleware/authorize.js";

const router = Router();

// All site routes require authentication
router.use(authenticate);

// Site discovery & geofence verification
router.get("/nearby", siteController.findNearbySites);
router.post("/:siteId/verify-geofence", siteController.verifyGeofence);

// CRUD operations
router.get("/", siteController.getSites);
router.get("/:id", siteController.getSiteById);

// Administrative operations
router.post(
  "/",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  siteController.createSite
);

router.put(
  "/:id",
  authorize(ROLES.SUPERVISOR, ROLES.SUPER_SUPERVISOR),
  siteController.updateSite
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_SUPERVISOR),
  siteController.deleteSite
);

export default router;
