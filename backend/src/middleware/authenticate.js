import jwt from "jsonwebtoken";
import environment from "../config/environment.js";
import ApiError from "../common/ApiError.js";
import User from "../modules/auth/user.model.js";

/**
 * JWT Authentication Middleware
 * Validates Bearer token and injects authenticated user into req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        ApiError.unauthorized(
          "Authentication required. Bearer token missing.",
          {},
          "AUTHENTICATION_REQUIRED"
        )
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(
        ApiError.unauthorized("Authentication token is missing.", {}, "TOKEN_MISSING")
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, environment.JWT.ACCESS_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(
          ApiError.unauthorized(
            "Access token expired. Please refresh your session.",
            {},
            "TOKEN_EXPIRED"
          )
        );
      }
      return next(
        ApiError.unauthorized("Invalid access token signature.", {}, "INVALID_TOKEN")
      );
    }

    // Attach user payload
    req.user = decoded; // { id, phoneNumber, role, businessIds, assignedSiteId, permissions }
    next();
  } catch (error) {
    next(ApiError.unauthorized(`Authentication error: ${error.message}`));
  }
};

export default authenticate;
