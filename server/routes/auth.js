/**
 * Authentication Routes
 * 
 * Routes for user authentication and beta program access.
 */

const express = require('express');
const router = express.Router();
const betaUsers = require('../models/betaUsers');
const inviteCodes = require('../models/inviteCodes');
const jwtAuth = require('../utils/jwtAuth');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, PERMISSIONS, ROLES } = require('../middleware/rbacMiddleware');
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
        name: user.name,
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
 * Public registration route with invite code validation
 */
router.post('/register/public', async (req, res) => {
  try {
    const { email, password, name, inviteCode } = req.body;
    
    if (!email || !password || !inviteCode) {
      return res.status(400).json({
        error: {
          message: 'Email, password, and invite code are required',
          type: 'missing_fields'
        }
      });
    }
    
    // Validate the invitation code
    const isValidCode = await inviteCodes.validateCode(inviteCode);
    
    if (!isValidCode) {
      return res.status(403).json({
        error: {
          message: 'Invalid or expired invitation code',
          type: 'invalid_invite_code'
        }
      });
    }
    
    // Create user
    const user = await betaUsers.createUser({
      email,
      password,
      name,
      role: ROLES.BETA_TESTER
    });
    
    // Mark the invite code as used
    await inviteCodes.useCode(inviteCode, user.id);
    
    // Generate token
    const token = jwtAuth.generateToken(user);
    
    // Return token and user info
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Public registration error', { error });
    
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
 * Admin registration route - register a new beta user (admin only)
 */
router.post('/register/admin', 
  authenticateUser, 
  requirePermission(PERMISSIONS.CREATE_USER), 
  async (req, res) => {
    try {
      const { email, password, role, name } = req.body;
      
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
        name,
        role: role || ROLES.BETA_TESTER
      });
      
      return res.status(201).json({ user });
    } catch (error) {
      logger.error('Admin registration error', { error });
      
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
  }
);

/**
 * Backward compatibility route for the old registration endpoint
 */
router.post('/register', 
  authenticateUser, 
  requirePermission(PERMISSIONS.CREATE_USER), 
  async (req, res) => {
    // Forward to the admin registration route
    return router.handle(req, res, '/register/admin');
  }
);

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
  return res.json({ 
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      permissions: req.user.allPermissions || []
    } 
  });
});

/**
 * Get user permissions route
 */
router.get('/permissions', authenticateUser, (req, res) => {
  return res.json({ 
    permissions: req.user.allPermissions || [],
    roles: req.user.allRoles || []
  });
});

module.exports = router; 