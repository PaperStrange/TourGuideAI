/**
 * Authentication Middleware
 * 
 * Middleware for JWT-based authentication of beta testers.
 */

const jwtAuth = require('../utils/jwtAuth');
const betaUsers = require('../models/betaUsers');
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
    const decoded = jwtAuth.verifyToken(token);
    
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
      role: user.role,
      betaAccess: user.betaAccess
    };
    
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
    const decoded = jwtAuth.verifyToken(token);
    
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
        role: user.role,
        betaAccess: user.betaAccess
      };
    }
    
    next();
  } catch (error) {
    // Just proceed without authentication
    next();
  }
};

module.exports = {
  authenticateUser,
  requireAdmin,
  optionalAuth
}; 