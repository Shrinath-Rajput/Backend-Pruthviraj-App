import { Router } from "express";
import authController from "./auth.controller.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from "./auth.validation.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  authLimiter,
} from "../../middleware/rateLimiter.js";

const router = Router();

// Primary Mobile Authentication (Section 6)
router.post(
  "/otp/send",
  otpSendLimiter,
  validate(sendOtpSchema),
  authController.sendOtp
);

router.post(
  "/otp/verify",
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp
);

// Token Lifecycle
router.post(
  "/refresh",
  authLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.getMe);

export default router;
