import authService from "./auth.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return res
        .status(201)
        .json(ApiResponse.created(result, "User registered successfully."));
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Logged in successfully."));
    } catch (error) {
      next(error);
    }
  }

  async requestOtp(req, res, next) {
    try {
      const result = await authService.requestOtp(req.body.phone);
      return res
        .status(200)
        .json(ApiResponse.success(result, "OTP generated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const result = await authService.verifyOtp(req.body);
      return res
        .status(200)
        .json(ApiResponse.success(result, "OTP verified and authenticated."));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Tokens refreshed successfully."));
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Logged out successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return res
        .status(200)
        .json(ApiResponse.success(user, "User profile retrieved."));
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
