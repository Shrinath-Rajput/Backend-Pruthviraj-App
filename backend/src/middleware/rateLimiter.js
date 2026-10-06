import { redisService } from "../config/redis.js";
import ApiError from "../common/ApiError.js";
import environment from "../config/environment.js";

/**
 * Higher-order Redis-backed rate limiting middleware
 */
export const createRateLimiter = ({
  prefix = "rl",
  max = 60,
  windowSeconds = 60,
  keyGenerator = (req) => req.ip || "unknown_ip",
  errorMessage = "Too many requests. Please slow down.",
}) => {
  return async (req, res, next) => {
    try {
      const identifier = keyGenerator(req);
      const key = `${prefix}:${identifier}`;

      const current = await redisService.incr(key, windowSeconds);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));

      if (current > max) {
        res.setHeader("Retry-After", windowSeconds);
        return next(
          ApiError.tooManyRequests(
            errorMessage,
            { limit: max, windowSeconds, currentRequests: current },
            "RATE_LIMIT_EXCEEDED"
          )
        );
      }

      next();
    } catch (err) {
      // In case of unexpected redis failure, fail-open to preserve API availability
      next();
    }
  };
};

/**
 * Global API rate limiter (120 req / 60s)
 */
export const generalApiLimiter = createRateLimiter({
  prefix: "rl:global",
  max: 300,
  windowSeconds: 60,
  errorMessage: "Too many requests to the API. Please try again in a minute.",
});

/**
 * OTP Send Limiter: Max 3 requests per 10 minutes (by phone number & IP) - Section 6
 */
export const otpSendLimiter = createRateLimiter({
  prefix: "rl:otp_send",
  max: environment.OTP.MAX_SEND_PER_WINDOW,
  windowSeconds: environment.OTP.WINDOW_SECONDS,
  keyGenerator: (req) => {
    const phone = req.body?.phoneNumber || req.body?.phone || "no_phone";
    return `${phone}:${req.ip || "ip"}`;
  },
  errorMessage: `Maximum ${environment.OTP.MAX_SEND_PER_WINDOW} OTP send requests per 10 minutes allowed.`,
});

/**
 * OTP Verify Limiter: Max 3 verification attempts per 5 minutes - Section 6
 */
export const otpVerifyLimiter = createRateLimiter({
  prefix: "rl:otp_verify",
  max: environment.OTP.MAX_ATTEMPTS,
  windowSeconds: environment.OTP.TTL_SECONDS,
  keyGenerator: (req) => {
    const phone = req.body?.phoneNumber || req.body?.phone || "no_phone";
    return `${phone}:${req.ip || "ip"}`;
  },
  errorMessage: `Maximum ${environment.OTP.MAX_ATTEMPTS} verification attempts reached. Please request a new OTP.`,
});

/**
 * Auth Login & Refresh Limiter
 */
export const authLimiter = createRateLimiter({
  prefix: "rl:auth",
  max: 15,
  windowSeconds: 900, // 15 mins
  errorMessage: "Too many authentication requests. Please try again after 15 minutes.",
});

/**
 * File Upload Limiter
 */
export const uploadLimiter = createRateLimiter({
  prefix: "rl:upload",
  max: 20,
  windowSeconds: 600,
  errorMessage: "Upload rate limit reached. Please wait a few minutes before uploading more files.",
});

/**
 * Sensitive Operations Limiter (e.g., Ledger override, Financial approvals)
 */
export const sensitiveOpLimiter = createRateLimiter({
  prefix: "rl:sensitive",
  max: 20,
  windowSeconds: 300,
  errorMessage: "Rate limit for sensitive administrative operations exceeded.",
});

export default {
  createRateLimiter,
  generalApiLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  authLimiter,
  uploadLimiter,
  sensitiveOpLimiter,
};
