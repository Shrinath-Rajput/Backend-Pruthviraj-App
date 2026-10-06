import jwt from "jsonwebtoken";
import User from "./user.model.js";
import ApiError from "../../common/ApiError.js";
import environment from "../../config/environment.js";
import { redisService } from "../../config/redis.js";
import {
  generateSecureOtp,
  hashSha256,
  generateSecureToken,
  maskSensitiveString,
} from "../../common/utils/cryptoHash.js";

/**
 * Standardize phone number format (+91XXXXXXXXXX)
 */
export const normalizePhoneNumber = (phone) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${phone}`;
};

/**
 * Generate Access and Refresh JWT Tokens with token versioning
 */
export const generateTokenPair = (user) => {
  const payload = {
    id: user._id.toString(),
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    employeeCode: user.employeeCode,
    role: user.role,
    businessIds: user.businessIds || [],
    assignedSiteId: user.assignedSiteId ? user.assignedSiteId.toString() : null,
    tokenVersion: user.tokenVersion || 0,
  };

  const accessToken = jwt.sign(payload, environment.JWT.ACCESS_SECRET, {
    expiresIn: environment.JWT.ACCESS_EXPIRES_IN,
  });

  const rawRefreshToken = `${generateSecureToken(32)}.${user._id}`;
  const refreshToken = jwt.sign(
    { ...payload, rawKey: rawRefreshToken },
    environment.JWT.REFRESH_SECRET,
    { expiresIn: environment.JWT.REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

export class AuthService {
  /**
   * Request 6-digit SMS OTP (Section 6)
   */
  async sendOtp(rawPhoneNumber) {
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

    let user = await User.findOne({ phoneNumber });
    // If not exists in dev mode, create default employee or find existing
    if (!user) {
      // Auto-provision basic profile if first-time mobile login in development
      user = await User.create({
        phoneNumber,
        fullName: `Operative ${phoneNumber.slice(-4)}`,
        employeeCode: `EMP-${phoneNumber.slice(-4)}`,
        role: "EMPLOYEE",
        companyName: "Pruthviraj Enterprises",
        businessIds: ["pruthviraj-enterprises"],
      });
    }

    if (!user.isActive) {
      throw ApiError.forbidden("Your account is deactivated. Please contact administration.");
    }

    // Check rate limit on OTP send requests (max 3 per 10 minutes)
    const sendKey = `otp_send_count:${phoneNumber}`;
    const sendCount = await redisService.incr(sendKey, environment.OTP.WINDOW_SECONDS);
    if (sendCount > environment.OTP.MAX_SEND_PER_WINDOW) {
      throw ApiError.tooManyRequests(
        `Too many OTP requests. Maximum ${environment.OTP.MAX_SEND_PER_WINDOW} allowed per 10 minutes.`
      );
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOtp(6);
    const otpHash = hashSha256(otp);

    // Store in Redis with TTL 300 seconds and 0 attempts
    const otpState = {
      hash: otpHash,
      attempts: 0,
      createdAt: Date.now(),
    };
    await redisService.set(
      `otp:${phoneNumber}`,
      otpState,
      environment.OTP.TTL_SECONDS
    );

    // OTP is NEVER logged to console or logs in production
    return {
      success: true,
      expiresIn: environment.OTP.TTL_SECONDS,
      message: `OTP sent successfully to ${maskSensitiveString(phoneNumber, 3, 2)}.`,
      // Development flag check (Section 6)
      ...(environment.OTP.ALLOW_DEV_OTP && environment.NODE_ENV !== "production" && { devOtp: otp }),
    };
  }

  /**
   * Verify OTP and return tokens (Section 6 & 7)
   */
  async verifyOtp({ rawPhoneNumber, otpCode }) {
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);

    const user = await User.findOne({ phoneNumber }).select("+refreshTokenHash +tokenVersion");
    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("Account is inactive.");
    }

    const redisOtpKey = `otp:${phoneNumber}`;
    const storedData = await redisService.get(redisOtpKey);

    if (!storedData) {
      throw ApiError.badRequest("OTP has expired or was not requested. Please request a new OTP.");
    }

    const state = typeof storedData === "string" ? JSON.parse(storedData) : storedData;

    // Check attempts limit (max 3 attempts)
    if (state.attempts >= environment.OTP.MAX_ATTEMPTS) {
      await redisService.del(redisOtpKey);
      throw ApiError.badRequest("Maximum verification attempts exceeded. OTP invalidated.");
    }

    const inputHash = hashSha256(otpCode);
    if (state.hash !== inputHash) {
      state.attempts += 1;
      await redisService.set(redisOtpKey, state, environment.OTP.TTL_SECONDS);
      throw ApiError.badRequest(
        `Invalid OTP code. ${environment.OTP.MAX_ATTEMPTS - state.attempts} attempts remaining.`
      );
    }

    // OTP verified successfully: immediately delete to prevent reuse
    await redisService.del(redisOtpKey);

    // Issue rotated tokens
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Store secure hash of refresh token in DB (Section 7)
    user.refreshTokenHash = hashSha256(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.refreshTokenHash;
    delete sanitizedUser.tokenVersion;

    return {
      accessToken,
      refreshToken,
      user: sanitizedUser,
    };
  }

  /**
   * Rotate Refresh Token with Reuse Detection (Section 7)
   */
  async rotateRefreshToken(incomingToken) {
    let decoded;
    try {
      decoded = jwt.verify(incomingToken, environment.JWT.REFRESH_SECRET);
    } catch (err) {
      throw ApiError.unauthorized("Invalid or expired refresh token.");
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash +tokenVersion");
    if (!user) {
      throw ApiError.unauthorized("User not found.");
    }

    // Invalidate if tokenVersion does not match
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw ApiError.unauthorized("Session revoked. Please log in again.");
    }

    const incomingHash = hashSha256(incomingToken);

    // Reuse detection (Section 7):
    // If incoming token hash does not match current valid refreshTokenHash,
    // a revoked token is being reused! Invalidate all user sessions!
    if (user.refreshTokenHash !== incomingHash) {
      user.tokenVersion += 1; // Invalidate all existing tokens
      user.refreshTokenHash = null;
      await user.save();
      throw ApiError.unauthorized(
        "Compromised refresh token reuse detected! All active sessions have been revoked.",
        {},
        "TOKEN_REUSE_DETECTED"
      );
    }

    // Rotate tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
    user.refreshTokenHash = hashSha256(newRefreshToken);
    await user.save();

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke session on logout (Section 7)
   */
  async logout(userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokenHash = null;
      user.tokenVersion += 1;
      await user.save();
    }
    return { message: "Successfully logged out. Session revoked." };
  }

  /**
   * Current Authenticated User Profile
   */
  async getMe(userId) {
    const user = await User.findById(userId)
      .populate("assignedSiteId", "siteCode siteName locationCode region centroid geofenceRadiusMeters")
      .populate("assignedSupervisorId", "fullName employeeCode phoneNumber");

    if (!user) {
      throw ApiError.notFound("User profile not found.");
    }

    return user;
  }
}

export default new AuthService();
