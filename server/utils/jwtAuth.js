/**
 * JWT Authentication Utility
 * 
 * Handles JWT token generation, validation, and management for beta user authentication.
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Token blacklist for revoked tokens
// In production, this would use Redis or another distributed store
const tokenBlacklist = new Set();

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  try {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      betaAccess: user.betaAccess
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  } catch (error) {
    logger.error('Error generating JWT token', { error });
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }
    
    // Verify the token
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Error verifying JWT token', { error });
    return null;
  }
};

/**
 * Revoke a JWT token (add to blacklist)
 * @param {string} token - JWT token to revoke
 */
const revokeToken = (token) => {
  try {
    // Add token to blacklist
    tokenBlacklist.add(token);
    
    // Verify token to get expiry
    const decoded = jwt.verify(token, JWT_SECRET);
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    
    // Schedule removal from blacklist after expiry
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, expiryTime - Date.now());
    
    return true;
  } catch (error) {
    logger.error('Error revoking JWT token', { error });
    return false;
  }
};

/**
 * Extract JWT token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
const extractTokenFromRequest = (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  } catch (error) {
    logger.error('Error extracting JWT token from request', { error });
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  revokeToken,
  extractTokenFromRequest
}; 