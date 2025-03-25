/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides fine-grained access control based on user roles and permissions for the beta program.
 */

const logger = require('../utils/logger');

// Define roles and their hierarchy
const ROLES = {
  GUEST: 'guest',
  BETA_TESTER: 'beta-tester',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// Role hierarchy (higher roles include permissions of lower roles)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [ROLES.MODERATOR, ROLES.BETA_TESTER, ROLES.GUEST],
  [ROLES.MODERATOR]: [ROLES.BETA_TESTER, ROLES.GUEST],
  [ROLES.BETA_TESTER]: [ROLES.GUEST],
  [ROLES.GUEST]: []
};

// Define permissions
const PERMISSIONS = {
  // User management
  CREATE_USER: 'create:user',
  READ_USER: 'read:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',
  
  // Invite codes
  CREATE_INVITE: 'create:invite',
  READ_INVITE: 'read:invite',
  UPDATE_INVITE: 'update:invite',
  DELETE_INVITE: 'delete:invite',
  
  // Feedback
  CREATE_FEEDBACK: 'create:feedback',
  READ_FEEDBACK: 'read:feedback',
  UPDATE_FEEDBACK: 'update:feedback',
  DELETE_FEEDBACK: 'delete:feedback',
  
  // Application features
  ACCESS_BETA_FEATURES: 'access:beta',
  ACCESS_ANALYTICS: 'access:analytics',
  ACCESS_ADMIN_PANEL: 'access:admin',
  
  // Content management
  MANAGE_CONTENT: 'manage:content',
};

// Role-based permission matrix
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Has all permissions
    ...Object.values(PERMISSIONS)
  ],
  [ROLES.MODERATOR]: [
    // User permissions
    PERMISSIONS.READ_USER,
    
    // Invite code permissions
    PERMISSIONS.CREATE_INVITE,
    PERMISSIONS.READ_INVITE,
    
    // Feedback permissions
    PERMISSIONS.READ_FEEDBACK,
    PERMISSIONS.UPDATE_FEEDBACK,
    
    // Access permissions
    PERMISSIONS.ACCESS_BETA_FEATURES,
    PERMISSIONS.ACCESS_ANALYTICS,
    
    // Content permissions
    PERMISSIONS.MANAGE_CONTENT
  ],
  [ROLES.BETA_TESTER]: [
    // Basic permissions
    PERMISSIONS.READ_USER,
    PERMISSIONS.CREATE_FEEDBACK,
    PERMISSIONS.ACCESS_BETA_FEATURES
  ],
  [ROLES.GUEST]: [
    // Minimal permissions
    // None currently
  ]
};

/**
 * Check if a user has a specific role or higher in the hierarchy
 * @param {Object} user - User object
 * @param {string} requiredRole - Required role
 * @returns {boolean} - Whether the user has the required role
 */
const hasRole = (user, requiredRole) => {
  if (!user || !user.role) {
    return false;
  }
  
  return user.role === requiredRole || 
         (ROLE_HIERARCHY[user.role] && ROLE_HIERARCHY[user.role].includes(requiredRole));
};

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object
 * @param {string} permission - Required permission
 * @returns {boolean} - Whether the user has the required permission
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }
  
  // Get all applicable roles based on hierarchy
  const applicableRoles = [user.role, ...(ROLE_HIERARCHY[user.role] || [])];
  
  // Check if any of the roles has the required permission
  return applicableRoles.some(role => 
    ROLE_PERMISSIONS[role] && ROLE_PERMISSIONS[role].includes(permission)
  );
};

/**
 * Middleware to check if user has a specific role
 * @param {string} role - Required role
 * @returns {Function} - Express middleware
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          type: 'auth_required'
        }
      });
    }
    
    if (!hasRole(req.user, role)) {
      return res.status(403).json({
        error: {
          message: `Role '${role}' or higher required`,
          type: 'insufficient_role'
        }
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user has a specific permission
 * @param {string} permission - Required permission
 * @returns {Function} - Express middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          type: 'auth_required'
        }
      });
    }
    
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: {
          message: `Permission '${permission}' required`,
          type: 'insufficient_permission'
        }
      });
    }
    
    next();
  };
};

// Shorthand middleware functions for common permissions
const requireAdmin = requireRole(ROLES.ADMIN);
const requireModerator = requireRole(ROLES.MODERATOR);
const requireBetaTester = requireRole(ROLES.BETA_TESTER);

/**
 * Enriches the user object with permission helpers
 * This middleware should be applied after authentication
 */
const enrichUserPermissions = (req, res, next) => {
  if (req.user) {
    // Add helper methods
    req.user.hasRole = (role) => hasRole(req.user, role);
    req.user.hasPermission = (permission) => hasPermission(req.user, permission);
    req.user.isAdmin = () => hasRole(req.user, ROLES.ADMIN);
    req.user.isModerator = () => hasRole(req.user, ROLES.MODERATOR);
    req.user.isBetaTester = () => hasRole(req.user, ROLES.BETA_TESTER);
    
    // Add roles and permissions arrays for easy access
    req.user.allRoles = [req.user.role, ...(ROLE_HIERARCHY[req.user.role] || [])];
    req.user.allPermissions = req.user.allRoles.reduce((perms, role) => {
      return [...perms, ...(ROLE_PERMISSIONS[role] || [])];
    }, []);
    
    // Remove duplicates
    req.user.allPermissions = [...new Set(req.user.allPermissions)];
  }
  
  next();
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasRole,
  hasPermission,
  requireRole,
  requirePermission,
  requireAdmin,
  requireModerator,
  requireBetaTester,
  enrichUserPermissions
}; 