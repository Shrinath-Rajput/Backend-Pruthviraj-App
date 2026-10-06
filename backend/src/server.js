import app from "./app.js";
import environment from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";

let server;

const startServer = async () => {
  try {
    console.log("=================================================");
    console.log("   PRUTHVIRAJ WORKFORCE & BUSINESS SYSTEM");
    console.log(`   Environment: ${environment.NODE_ENV.toUpperCase()}`);
    console.log("=================================================");

    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Connect Redis
    await connectRedis();

    // 3. Start HTTP Server
    server = app.listen(environment.PORT, () => {
      console.log(`🚀 Server listening on port ${environment.PORT}`);
      console.log(`📖 API Documentation available at: http://localhost:${environment.PORT}/api-docs`);
      console.log(`🩺 Health check available at: http://localhost:${environment.PORT}/health`);
    });
  } catch (error) {
    console.error(`❌ Critical bootstrap failure: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown Handler (Section 58)
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n[System] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("[System] HTTP server stopped accepting incoming connections.");

      try {
        await disconnectRedis();
        await disconnectDatabase();
        console.log("[System] All resources successfully released. Exiting process.");
        process.exit(0);
      } catch (err) {
        console.error(`[System Error] Error during shutdown: ${err.message}`);
        process.exit(1);
      }
    });

    // Force exit if teardown takes longer than 10 seconds
    setTimeout(() => {
      console.error("[System] Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Fatal] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Fatal] Uncaught Exception:", error);
  process.exit(1);
});

startServer();

export default server;
