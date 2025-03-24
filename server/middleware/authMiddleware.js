/**
 * Authentication Middleware
 * 
 * Middleware for JWT-based authentication of beta testers.
 * Uses the updated jwtAuth module with secure token management.
 */

const jwtAuth = require('../utils/jwtAuth');
const betaUsers = require('../models/betaUsers');
const { enrichUserPermissions } = require('./rbacMiddleware');
const logger = require('../utils/logger');

/**
 * Authenticate a user based on JWT token
 * For routes that require authentication
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Extract token from request
    const token = jwtAuth.extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          type: 'auth_required'
        }
      });
    }
    
    // Verify token
    const decoded = await jwtAuth.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired token',
          type: 'invalid_token'
        }
      });
    }
    
    // Get user from database
    const user = await betaUsers.findUserById(decoded.sub);
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'User not found',
          type: 'user_not_found'
        }
      });
    }
    
    // Check if user has beta access
    if (!user.betaAccess) {
      return res.status(403).json({
        error: {
          message: 'Beta access required',
          type: 'beta_access_required'
        }
      });
    }
    
    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      betaAccess: user.betaAccess
    };
    
    // Add permissions (handled by the next middleware)
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Authentication error',
        type: 'auth_error'
      }
    });
  }
};

/**
 * Check if a user has admin role
 * For routes that require admin privileges
 * @deprecated Use requireRole('admin') or requirePermission() from rbacMiddleware instead
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        type: 'auth_required'
      }
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        message: 'Admin privileges required',
        type: 'admin_required'
      }
    });
  }
  
  next();
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Extract token from request
    const token = jwtAuth.extractTokenFromRequest(req);
    
    if (!token) {
      return next();
    }
    
    // Verify token
    const decoded = await jwtAuth.verifyToken(token);
    
    if (!decoded) {
      return next();
    }
    
    // Get user from database
    const user = await betaUsers.findUserById(decoded.sub);
    
    if (user) {
      // Add user to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        betaAccess: user.betaAccess
      };
    }
    
    // Continue (permission enrichment will happen in the next middleware)
    next();
  } catch (error) {
    // Just proceed without authentication
    next();
  }
};

/**
 * Full authentication middleware - authenticates and enriches with permissions
 * This combines authentication with role-based access control
 */
const fullAuth = [authenticateUser, enrichUserPermissions];

/**
 * Full optional authentication middleware - optional auth with permissions
 * This combines optional authentication with role-based access control
 */
const fullOptionalAuth = [optionalAuth, enrichUserPermissions];

module.exports = {
  authenticateUser,
  requireAdmin, // Kept for backward compatibility
  optionalAuth,
  fullAuth,
  fullOptionalAuth
}; 