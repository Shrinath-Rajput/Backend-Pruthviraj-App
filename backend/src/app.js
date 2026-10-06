import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import environment from "./config/environment.js";
import { generalApiLimiter } from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/errorHandler.js";
import ApiError from "./common/ApiError.js";
import ApiResponse from "./common/ApiResponse.js";

// Import Centralized API Router
import apiRoutes from "./routes/index.js";

// 1. Initialize Express Application
const app = express();

// 2. Configure Helmet for secure HTTP headers
app.use(helmet());

// 3. Configure CORS
app.use(
  cors({
    origin: environment.CORS_ORIGIN === "*" ? "*" : environment.CORS_ORIGIN.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 4. Configure JSON and URL-encoded body parsing
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// 5. Configure Request Logging
if (environment.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Global General Rate Limiting
app.use(generalApiLimiter);

// 7. Health-check endpoint
app.get("/health", (req, res) => {
  return res.status(200).json(
    ApiResponse.success(
      {
        status: "UP",
        timestamp: new Date().toISOString(),
        service: "GeoWork Backend API",
        environment: environment.NODE_ENV,
        version: "1.0.0",
      },
      "GeoWork Backend is healthy and operational."
    )
  );
});

// 6. Register API routes with /api/v1 prefix from centralized routes folder
app.use("/api/v1", apiRoutes);

// 8. 404 Route Handler for undefined endpoints
app.use((req, res, next) => {
  next(ApiError.notFound(`Endpoint not found: [${req.method}] ${req.originalUrl}`));
});

// 9. Centralized Error Handler
app.use(errorHandler);

export default app;
