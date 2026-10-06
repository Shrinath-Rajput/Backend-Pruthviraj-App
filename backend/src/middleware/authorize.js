import ApiError from "../common/ApiError.js";

/**
 * Supported User Roles
 */
export const ROLES = Object.freeze({
  OWNER: "OWNER",
  HR: "HR",
  ACCOUNTS: "ACCOUNTS",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  SUPERVISOR: "SUPERVISOR",
  EMPLOYEE: "EMPLOYEE",
  SUPER_SUPERVISOR: "SUPER_SUPERVISOR",
});

/**
 * Standard Role to Permission Matrix
 */
export const ROLE_PERMISSIONS = {
  OWNER: ["*"], // All permissions across all businesses
  HR: [
    "workers.view", "workers.add", "workers.edit", "workers.delete",
    "attendance.view", "attendance.mark", "attendance.override",
    "payroll.view", "payroll.process", "payroll.approve",
    "leaves.view", "leaves.approve",
    "reports.export", "compliance.view",
  ],
  ACCOUNTS: [
    "billing.view", "billing.create", "billing.approve",
    "expenses.view", "expenses.create", "expenses.approve",
    "payroll.view", "payroll.process",
    "reports.export", "compliance.view",
  ],
  MANAGER: [
    "workers.view", "workers.add", "workers.edit",
    "attendance.view", "attendance.mark", "attendance.override",
    "leaves.view", "leaves.approve",
    "sites.view", "sites.edit",
    "reports.export",
  ],
  SUPER_SUPERVISOR: [
    "sites.view", "sites.manage",
    "attendance.view", "attendance.mark", "attendance.override",
    "workers.view",
    "leaves.view", "leaves.approve",
    "roster.manage",
    "reports.export",
  ],
  SUPERVISOR: [
    "sites.view",
    "attendance.view", "attendance.mark", "attendance.override",
    "workers.view",
    "leaves.view", "leaves.approve",
    "roster.manage",
  ],
  STAFF: [
    "attendance.view", "attendance.mark",
    "leaves.view", "leaves.apply",
  ],
  EMPLOYEE: [
    "attendance.view", "attendance.mark",
    "leaves.view", "leaves.apply",
    "payroll.view",
  ],
};

/**
 * Verify whether role has permission
 */
export const checkUserPermission = (role, permission) => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
};

/**
 * Combined Role and Permission Authorization Middleware
 * Can accept strings of allowed roles, or an object with { roles, permissions }
 */
export const authorize = (allowedRolesOrConfig = [], requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(
        ApiError.unauthorized("Authentication required before authorization.", {}, "UNAUTHENTICATED")
      );
    }

    const userRole = req.user.role;
    let allowedRoles = [];
    let permissions = [];

    if (Array.isArray(allowedRolesOrConfig)) {
      allowedRoles = allowedRolesOrConfig;
      permissions = requiredPermissions;
    } else if (typeof allowedRolesOrConfig === "object") {
      allowedRoles = allowedRolesOrConfig.roles || [];
      permissions = allowedRolesOrConfig.permissions || [];
    } else if (typeof allowedRolesOrConfig === "string") {
      allowedRoles = [allowedRolesOrConfig];
      permissions = requiredPermissions;
    }

    // Role check
    const roleMatches = allowedRoles.length === 0 || allowedRoles.includes(userRole);

    // Permission check
    const permissionMatches =
      permissions.length === 0 ||
      permissions.every((perm) => checkUserPermission(userRole, perm));

    if (!roleMatches || !permissionMatches) {
      return next(
        ApiError.forbidden(
          `Access forbidden: User with role '${userRole}' lacks required authorizations.`,
          { requiredRoles: allowedRoles, requiredPermissions: permissions, userRole },
          "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
        )
      );
    }

    next();
  };
};

/**
 * Business Data Isolation Middleware (Section 10)
 * Prevents cross-business data leakage
 */
export const authorizeBusiness = (options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required."));
    }

    const { role, businessIds = [] } = req.user;

    // OWNER has global scope across all businesses:
    // 1. pruthviraj-enterprises
    // 2. pruthviraj-facilities
    const isOwner = role === ROLES.OWNER;

    // Extract target businessId from params, query, or body
    const targetBusinessId =
      req.params.businessId ||
      req.query.businessId ||
      (req.body && req.body.businessId);

    if (targetBusinessId) {
      if (!isOwner && !businessIds.includes(targetBusinessId)) {
        return next(
          ApiError.forbidden(
            `Cross-business data access denied. You do not have permissions for business '${targetBusinessId}'.`,
            { userBusinessIds: businessIds, attemptedBusinessId: targetBusinessId },
            "BUSINESS_ISOLATION_VIOLATION"
          )
        );
      }
    }

    // Attach allowed business scope to request object for services to filter queries safely
    req.allowedBusinessIds = isOwner
      ? ["pruthviraj-enterprises", "pruthviraj-facilities"]
      : businessIds;

    next();
  };
};

export default {
  ROLES,
  ROLE_PERMISSIONS,
  checkUserPermission,
  authorize,
  authorizeBusiness,
};
