import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/pruthviraj_db"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().default("pruthviraj_access_secret_super_secure_key_2026"),
  JWT_REFRESH_SECRET: z.string().default("pruthviraj_refresh_secret_super_secure_key_2026"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // OTP Configuration
  OTP_TTL_SECONDS: z.coerce.number().default(300), // 5 minutes
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().default(3),
  OTP_MAX_SEND_PER_WINDOW: z.coerce.number().default(3),
  OTP_SEND_WINDOW_SECONDS: z.coerce.number().default(600), // 10 minutes
  ALLOW_DEV_OTP: z.coerce.boolean().default(true), // allows returning devOtp in response for development/testing

  // Local File & Upload Storage Configuration
  UPLOAD_DIR: z.string().default("uploads"),
  APP_URL: z.string().default("http://localhost:5000"),



  // CORS & Security
  CORS_ORIGINS: z.string().default("*"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // System & Integration Defaults
  DEFAULT_TIMEZONE: z.string().default("Asia/Kolkata"),
  DEFAULT_CURRENCY: z.string().default("INR"),

  // Biometric policy defaults
  BIOMETRIC_THRESHOLD: z.coerce.number().default(80.0),
  DEFAULT_GEOFENCE_RADIUS_METERS: z.coerce.number().default(50),
  GPS_ACCURACY_THRESHOLD_METERS: z.coerce.number().default(20),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment configuration");
}

const environment = {
  ...parsedEnv.data,
  JWT: {
    ACCESS_SECRET: parsedEnv.data.JWT_ACCESS_SECRET,
    REFRESH_SECRET: parsedEnv.data.JWT_REFRESH_SECRET,
    ACCESS_EXPIRES_IN: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
    REFRESH_EXPIRES_IN: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  },
  OTP: {
    TTL_SECONDS: parsedEnv.data.OTP_TTL_SECONDS,
    MAX_ATTEMPTS: parsedEnv.data.OTP_MAX_VERIFY_ATTEMPTS,
    MAX_SEND_PER_WINDOW: parsedEnv.data.OTP_MAX_SEND_PER_WINDOW,
    WINDOW_SECONDS: parsedEnv.data.OTP_SEND_WINDOW_SECONDS,
    ALLOW_DEV_OTP: parsedEnv.data.ALLOW_DEV_OTP,
  },
  STORAGE: {
    UPLOAD_DIR: parsedEnv.data.UPLOAD_DIR,
    APP_URL: parsedEnv.data.APP_URL,
  },

  COMPLIANCE: {
    PF_PERCENT_EMPLOYEE: 12.0,
    PF_PERCENT_EMPLOYER: 12.0,
    ESIC_PERCENT_EMPLOYEE: 0.75,
    ESIC_PERCENT_EMPLOYER: 3.25,
    ESIC_GROSS_LIMIT_PAISE: 2100000, // INR 21,000 in paise
    PT_STANDARD_MONTHLY_PAISE: 20000, // INR 200 in paise (standard Maharashtra)
    PT_FEBRUARY_PAISE: 30000, // INR 300 in Feb
  },
};

export default environment;
