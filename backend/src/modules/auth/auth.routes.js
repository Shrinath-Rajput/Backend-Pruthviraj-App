import { Router } from "express";
import authController from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from "./auth.validation.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authLimiter, otpLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

// Public Authentication Endpoints
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  "/otp/request",
  otpLimiter,
  validate(requestOtpSchema),
  authController.requestOtp
);

router.post(
  "/otp/verify",
  authLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp
);

router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Protected Authentication Endpoints
router.get("/me", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);

export default router;
