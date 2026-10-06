import rateLimit from "express-rate-limit";
import environment from "../config/environment.js";
import ApiError from "../common/ApiError.js";

/**
 * Standard API rate limiter (100 requests per 15 minutes)
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, "Too many requests from this IP, please try again after 15 minutes."));
  },
});

/**
 * Strict authentication limiter (10 attempts per 15 minutes)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, "Too many authentication attempts. Please try again after 15 minutes."));
  },
});

/**
 * High-sensitivity OTP limiter based on configured OTP_RATE_LIMIT
 */
export const otpLimiter = rateLimit({
  windowMs: environment.OTP.EXPIRY_MINUTES * 60 * 1000,
  max: environment.OTP.RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, `Too many OTP requests. Maximum ${environment.OTP.RATE_LIMIT} per window.`));
  },
});

export default {
  generalApiLimiter,
  authLimiter,
  otpLimiter,
};
