import jwt from "jsonwebtoken";
import environment from "../config/environment.js";
import ApiError from "../common/ApiError.js";

/**
 * Middleware to authenticate requests using JWT Access Token
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Authentication required. Please provide a valid Bearer token."));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(ApiError.unauthorized("Authentication token is missing."));
    }

    jwt.verify(token, environment.JWT.ACCESS_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return next(ApiError.unauthorized("Session expired. Please refresh your token."));
        }
        return next(ApiError.unauthorized("Invalid access token."));
      }

      req.user = decoded; // { id, email, role, siteId, iat, exp }
      next();
    });
  } catch (error) {
    next(ApiError.unauthorized(`Authentication error: ${error.message}`));
  }
};

export default authenticate;
