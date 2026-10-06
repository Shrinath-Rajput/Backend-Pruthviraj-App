import app from "./app.js";
import environment from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";

let server;

/**
 * Handle uncaught exceptions before server initialization
 */
process.on("uncaughtException", (error) => {
  console.error("[CRITICAL] Uncaught Exception occurred:", error);
  process.exit(1);
});

/**
 * Start the HTTP Server and connect infrastructure services
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB using Mongoose
    console.log("[Bootstrap] Connecting to database...");
    await connectDatabase();

    // 2. Optional connect to Redis for caching & rate limiting
    try {
      await connectRedis();
    } catch (redisErr) {
      console.warn(`[Bootstrap] Redis initialization warning: ${redisErr.message}`);
    }

    // 3. Start Express Server
    const PORT = environment.PORT;
    server = app.listen(PORT, () => {
      console.log(`========================================================`);
      console.log(`  GeoWork Backend Server is Running!`);
      console.log(`  Port: ${PORT}`);
      console.log(`  Environment: ${environment.NODE_ENV}`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log(`  API Base: http://localhost:${PORT}/api/v1`);
      console.log(`========================================================`);
    });
  } catch (error) {
    console.error("[Bootstrap Error] Failed to start server:", error);
    process.exit(1);
  }
};

/**
 * Handle unhandled promise rejections
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

/**
 * Graceful termination handler
 */
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("[Shutdown] HTTP server closed.");
      try {
        await disconnectDatabase();
      } catch (err) {
        console.error("[Shutdown Error] Error during DB disconnect:", err);
      }
      console.log("[Shutdown] Graceful shutdown completed.");
      process.exit(0);
    });

    // Force close after 10s timeout
    setTimeout(() => {
      console.error("[Shutdown] Forcefully terminating server after timeout.");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

// Start application
startServer();
