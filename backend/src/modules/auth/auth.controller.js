import authService from "./auth.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class AuthController {
  async sendOtp(req, res, next) {
    try {
      const { phoneNumber } = req.body;
      const result = await authService.sendOtp(phoneNumber);
      return res.status(200).json(ApiResponse.success(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { phoneNumber, otpCode } = req.body;
      const result = await authService.verifyOtp({
        rawPhoneNumber: phoneNumber,
        otpCode,
      });
      return res.status(200).json(ApiResponse.success(result, "Authentication successful."));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.rotateRefreshToken(refreshToken);
      return res.status(200).json(ApiResponse.success(result, "Token rotated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.id);
      return res.status(200).json(ApiResponse.success(result, "Logged out successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const profile = await authService.getMe(req.user.id);
      return res.status(200).json(ApiResponse.success(profile, "User profile retrieved."));
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
