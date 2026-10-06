import mongoose from "mongoose";
import environment from "./environment.js";

/**
 * Configure Mongoose settings
 */
mongoose.set("strictQuery", true);

let isConnected = false;

/**
 * Connect to MongoDB with connection pooling and retry logic
 */
export const connectDatabase = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  const options = {
    autoIndex: true, // Auto build indexes
    maxPoolSize: 50, // Resilient connection pool for high concurrency
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // IPv4
  };

  try {
    const conn = await mongoose.connect(environment.MONGODB_URI, options);
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // In production or test, propagate error
    if (environment.NODE_ENV === "production") {
      throw error;
    }
  }
};

/**
 * Disconnect MongoDB cleanly
 */
export const disconnectDatabase = async () => {
  if (!isConnected) return;
  try {
    await mongoose.connection.close(false);
    isConnected = false;
    console.log("[Database] MongoDB connection closed cleanly.");
  } catch (error) {
    console.error(`[Database Error] Error disconnecting: ${error.message}`);
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[Database] MongoDB connection disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error(`[Database Error] Runtime error: ${err.message}`);
});

export default connectDatabase;
