import mongoose from "mongoose";
import environment from "./environment.js";

/**
 * Connect to MongoDB using Mongoose with resilient connection options
 */
export const connectDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(environment.MONGODB_URI, {
      autoIndex: true, // Build indexes in development
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB connected successfully. Host: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Gracefully close MongoDB connection
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log("[Database] MongoDB connection closed gracefully.");
  } catch (error) {
    console.error(`[Database Error] Error during disconnection: ${error.message}`);
  }
};

// Monitor connection events
mongoose.connection.on("disconnected", () => {
  console.warn("[Database] MongoDB connection disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error(`[Database] MongoDB connection error: ${err.message}`);
});

export default connectDatabase;
