import ApiError from "../common/ApiError.js";

/**
 * Valid system roles
 */
export const ROLES = Object.freeze({
  EMPLOYEE: "EMPLOYEE",
  SUPERVISOR: "SUPERVISOR",
  SUPER_SUPERVISOR: "SUPER_SUPERVISOR",
});

/**
 * Middleware factory for role-based authorization
 * @param {...string} allowedRoles - List of permitted roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(ApiError.unauthorized("Authentication required before authorization."));
    }

    const hasPermission = allowedRoles.includes(req.user.role);

    if (!hasPermission) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' lacks permission to access this resource. Required: [${allowedRoles.join(", ")}]`
        )
      );
    }

    next();
  };
};

export default authorize;
