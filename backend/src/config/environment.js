import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Validates and exposes typed environment configuration.
 */
const environment = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/geowork_db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  
  // JWT Configuration
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "default_geowork_access_secret_key_change_in_production",
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "default_geowork_refresh_secret_key_change_in_production",
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // OTP Configuration
  OTP: {
    EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    RATE_LIMIT: parseInt(process.env.OTP_RATE_LIMIT, 10) || 3,
  },

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // AWS S3 Configuration
  AWS: {
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
    REGION: process.env.AWS_REGION || "us-east-1",
    S3_BUCKET: process.env.AWS_S3_BUCKET || "geowork-uploads-bucket",
  },
};

export default environment;
