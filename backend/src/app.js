import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";

import environment from "./config/environment.js";
import { redisService } from "./config/redis.js";
import { generalApiLimiter } from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/errorHandler.js";
import ApiError from "./common/ApiError.js";
import ApiResponse from "./common/ApiResponse.js";

// Import Module Routes Directly (Section 2 - Exact Folder Structure)
import authRoutes from "./modules/auth/auth.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import siteRoutes from "./modules/site/site.routes.js";
import supervisorRoutes from "./modules/supervisor/supervisor.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import payrollRoutes from "./modules/payroll/payroll.routes.js";
import executiveRoutes from "./modules/executive/executive.routes.js";

const app = express();

// 1. Helmet HTTP Security Headers
app.use(helmet());

// 2. CORS
app.use(
  cors({
    origin: environment.CORS_ORIGINS === "*" ? "*" : environment.CORS_ORIGINS.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"],
    credentials: true,
  })
);

// 3. Request Payload Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Global Rate Limiter
app.use(generalApiLimiter);

// 5. OpenAPI / Swagger Documentation (Section 61)
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "PRUTHVIRAJ Workforce & Business Management System API",
    version: "1.0.0",
    description: "Enterprise REST APIs for multi-business workforce, precision geofenced attendance, supervisor governance, payroll, and executive analytics.",
  },
  servers: [{ url: "/api/v1", description: "Default API Gateway" }],
  paths: {
    "/auth/otp/send": { post: { summary: "Request 6-digit SMS OTP", tags: ["Authentication"] } },
    "/auth/otp/verify": { post: { summary: "Verify OTP and obtain JWT tokens", tags: ["Authentication"] } },
    "/auth/refresh": { post: { summary: "Rotate refresh token with reuse detection", tags: ["Authentication"] } },
    "/auth/logout": { post: { summary: "Revoke active token session", tags: ["Authentication"] } },
    "/auth/me": { get: { summary: "Retrieve authenticated user profile", tags: ["Authentication"] } },
    "/attendance/punch": { post: { summary: "Submit geofenced attendance punch with selfie", tags: ["Attendance"] } },
    "/attendance/status/today": { get: { summary: "Query current shift punch status", tags: ["Attendance"] } },
    "/attendance/history/monthly": { get: { summary: "Retrieve monthly attendance shift grid", tags: ["Attendance"] } },
    "/attendance/export/ledger": { get: { summary: "Download cryptographically signed ledger PDF", tags: ["Attendance"] } },
    "/sites": { get: { summary: "List active sites by business scope", tags: ["Sites"] } },
    "/supervisor/sites": { get: { summary: "List supervisor assigned sites", tags: ["Supervisor"] } },
    "/supervisor/roster/live": { get: { summary: "Live worker distance from site gate", tags: ["Supervisor"] } },
    "/leaves/balances": { get: { summary: "Check available leave balances", tags: ["Leaves"] } },
    "/leaves/apply": { post: { summary: "Submit leave application", tags: ["Leaves"] } },
    "/payroll/slips": { get: { summary: "List employee salary slips", tags: ["Payroll"] } },
    "/payroll/process": { post: { summary: "Trigger monthly payroll calculation run", tags: ["Payroll"] } },
    "/executive/overview": { get: { summary: "Executive multi-business overview", tags: ["Executive"] } },
    "/executive/business-performance": { get: { summary: "Compare performance between businesses", tags: ["Executive"] } },
    "/executive/policy": { get: { summary: "Query global geofencing policy", tags: ["Executive"] } },
  },
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 6. Health & Readiness Endpoints (Section 57)
app.get("/health", (req, res) => {
  return res.status(200).json(
    ApiResponse.success({
      status: "UP",
      service: "PRUTHVIRAJ Workforce Backend",
      environment: environment.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  );
});

app.get("/health/live", (req, res) => {
  return res.status(200).json({ status: "ALIVE" });
});

app.get("/health/ready", async (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  const isRedisReady = redisService.isAvailable();

  const isReady = isMongoReady;
  const status = isReady ? 200 : 503;

  return res.status(status).json({
    status: isReady ? "READY" : "DEGRADED",
    components: {
      mongodb: isMongoReady ? "CONNECTED" : "DISCONNECTED",
      redis: isRedisReady ? "CONNECTED" : "STANDALONE_MEMORY_MODE",
    },
    timestamp: new Date().toISOString(),
  });
});

// 7. Mount Module Routes (Base: /api/v1)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/sites", siteRoutes);
app.use("/api/v1/supervisor", supervisorRoutes);
app.use("/api/v1/leaves", leaveRoutes);
app.use("/api/v1/payroll", payrollRoutes);
app.use("/api/v1/executive", executiveRoutes);

// 8. 404 Undefined Route Handler
app.use((req, res, next) => {
  next(
    ApiError.notFound(
      `Endpoint not found: [${req.method}] ${req.originalUrl}`,
      { path: req.originalUrl, method: req.method }
    )
  );
});

// 9. Centralized Error Handler
app.use(errorHandler);

export default app;
