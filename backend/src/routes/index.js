import { Router } from "express";
import authRoutes from "./auth.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import siteRoutes from "./site.routes.js";
import supervisorRoutes from "./supervisor.routes.js";
import leaveRoutes from "./leave.routes.js";
import payrollRoutes from "./payroll.routes.js";
import executiveRoutes from "./executive.routes.js";

const router = Router();

// Modular Route Mounts
router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/sites", siteRoutes);
router.use("/supervisors", supervisorRoutes);
router.use("/leaves", leaveRoutes);
router.use("/payroll", payrollRoutes);
router.use("/executive", executiveRoutes);

export default router;
