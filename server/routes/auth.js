/**
 * Authentication Routes
 * 
 * Routes for user authentication and beta program access.
 */

const express = require('express');
const router = express.Router();
const betaUsers = require('../models/betaUsers');
const jwtAuth = require('../utils/jwtAuth');
const { authenticateUser, requireAdmin } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * Login route - authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Email and password are required',
          type: 'missing_credentials'
        }
      });
    }
    
    // Validate credentials
    const user = await betaUsers.validateCredentials(email, password);
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          type: 'invalid_credentials'
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
    
    // Generate token
    const token = jwtAuth.generateToken(user);
    
    // Return token and user info
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Authentication error',
        type: 'auth_error'
      }
    });
  }
});

/**
 * Register route - register a new beta user (admin only)
 */
router.post('/register', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Email and password are required',
          type: 'missing_fields'
        }
      });
    }
    
    // Create user
    const user = await betaUsers.createUser({
      email,
      password,
      role: role || 'beta-tester'
    });
    
    return res.status(201).json({ user });
  } catch (error) {
    logger.error('Registration error', { error });
    
    if (error.message === 'Email already registered') {
      return res.status(409).json({
        error: {
          message: 'Email already registered',
          type: 'duplicate_email'
        }
      });
    }
    
    return res.status(500).json({
      error: {
        message: 'Registration error',
        type: 'registration_error'
      }
    });
  }
});

/**
 * Logout route - revoke the JWT token
 */
router.post('/logout', authenticateUser, (req, res) => {
  try {
    const token = jwtAuth.extractTokenFromRequest(req);
    
    if (token) {
      jwtAuth.revokeToken(token);
    }
    
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Logout error',
        type: 'logout_error'
      }
    });
  }
});

/**
 * Get current user route
 */
router.get('/me', authenticateUser, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router; 