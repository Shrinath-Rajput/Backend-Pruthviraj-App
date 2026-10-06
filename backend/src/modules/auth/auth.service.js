import jwt from "jsonwebtoken";
import User from "./user.model.js";
import ApiError from "../../common/ApiError.js";
import environment from "../../config/environment.js";
import {
  hashPassword,
  comparePassword,
  generateOtp,
} from "../../common/utils/cryptoHash.js";

/**
 * Generate Access and Refresh JWT Tokens
 * @param {Object} user
 */
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    siteId: user.siteId,
  };

  const accessToken = jwt.sign(payload, environment.JWT.ACCESS_SECRET, {
    expiresIn: environment.JWT.ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, environment.JWT.REFRESH_SECRET, {
    expiresIn: environment.JWT.REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

export class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const existingEmail = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingEmail) {
      throw ApiError.conflict("User with this email already exists.");
    }

    const existingPhone = await User.findOne({ phone: userData.phone });
    if (existingPhone) {
      throw ApiError.conflict("User with this phone number already exists.");
    }

    const existingCode = await User.findOne({ employeeCode: userData.employeeCode.toUpperCase() });
    if (existingCode) {
      throw ApiError.conflict("User with this employee code already exists.");
    }

    const hashedPassword = await hashPassword(userData.password);

    const user = await User.create({
      ...userData,
      email: userData.email.toLowerCase(),
      employeeCode: userData.employeeCode.toUpperCase(),
      password: hashedPassword,
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;

    return { user: sanitizedUser, accessToken, refreshToken };
  }

  /**
   * Login with email and password
   */
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      throw ApiError.unauthorized("Invalid credentials.");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("Account has been deactivated. Please contact administrator.");
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized("Invalid credentials.");
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;

    return { user: sanitizedUser, accessToken, refreshToken };
  }

  /**
   * Request OTP for mobile authentication
   */
  async requestOtp(phone) {
    const user = await User.findOne({ phone });
    if (!user) {
      throw ApiError.notFound("No account found registered with this phone number.");
    }

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + environment.OTP.EXPIRY_MINUTES * 60 * 1000);

    user.otpCode = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // In a real environment this triggers SMS gateway. Returning masked data.
    return {
      message: `OTP sent successfully to ${phone}.`,
      expiresInMinutes: environment.OTP.EXPIRY_MINUTES,
      // For development verification convenience
      ...(environment.NODE_ENV === "development" && { devOtp: otp }),
    };
  }

  /**
   * Verify OTP and log in
   */
  async verifyOtp({ phone, otp }) {
    const user = await User.findOne({ phone }).select("+otpCode +otpExpiresAt");
    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      throw ApiError.badRequest("No OTP request pending for this account.");
    }

    if (new Date() > user.otpExpiresAt) {
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
      throw ApiError.badRequest("OTP has expired. Please request a new one.");
    }

    if (user.otpCode !== otp) {
      throw ApiError.badRequest("Invalid OTP code.");
    }

    // Clear OTP once consumed
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;
    delete sanitizedUser.otpCode;
    delete sanitizedUser.otpExpiresAt;

    return { user: sanitizedUser, accessToken, refreshToken };
  }

  /**
   * Refresh JWT token pair
   */
  async refreshToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, environment.JWT.REFRESH_SECRET);
    } catch (err) {
      throw ApiError.unauthorized("Invalid or expired refresh token.");
    }

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      throw ApiError.unauthorized("Invalid refresh token session.");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * User Logout
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return { message: "Logged out successfully." };
  }

  /**
   * Retrieve Current Authenticated User Profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId).populate("siteId", "name code location radiusMeters");
    if (!user) {
      throw ApiError.notFound("User not found.");
    }
    return user;
  }
}

export default new AuthService();
