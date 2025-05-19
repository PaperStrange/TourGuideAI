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
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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
        role: user.role,
        emailVerified: user.emailVerified
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
    
    // Send welcome email
    emailService.sendWelcomeEmail(user)
      .catch(error => logger.error('Error sending welcome email', { error, userId: user.id }));
    
    // Send email verification
    emailService.sendVerificationEmail(user)
      .catch(error => logger.error('Error sending verification email', { error, userId: user.id }));
    
    // Return token and user info
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      },
      emailVerificationSent: true
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
      const { email, password, role, name, sendInvite } = req.body;
      
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
      
      // If sendInvite flag is true, send welcome email
      if (sendInvite) {
        // Send welcome email
        emailService.sendWelcomeEmail(user)
          .catch(error => logger.error('Error sending welcome email', { error, userId: user.id }));
        
        // Send email verification
        emailService.sendVerificationEmail(user)
          .catch(error => logger.error('Error sending verification email', { error, userId: user.id }));
      }
      
      return res.status(201).json({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified
        },
        emailVerificationSent: !!sendInvite
      });
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
      permissions: req.user.allPermissions || [],
      emailVerified: req.user.emailVerified
    } 
  });
});

/**
 * Change password route (authenticated)
 */
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          message: 'Current password and new password are required',
          type: 'missing_fields'
        }
      });
    }
    
    // Change password
    const success = await betaUsers.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    
    if (!success) {
      return res.status(400).json({
        error: {
          message: 'Current password is incorrect',
          type: 'invalid_password'
        }
      });
    }
    
    return res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error', { error, userId: req.user.id });
    
    return res.status(500).json({
      error: {
        message: 'Error changing password',
        type: 'change_password_error'
      }
    });
  }
});

/**
 * Update profile route (authenticated)
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Update profile
    const updatedUser = await betaUsers.updateProfile(req.user.id, { name });
    
    if (!updatedUser) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          type: 'user_not_found'
        }
      });
    }
    
    return res.json({
      user: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error', { error, userId: req.user.id });
    
    return res.status(500).json({
      error: {
        message: 'Error updating profile',
        type: 'update_profile_error'
      }
    });
  }
});

/**
 * Get user permissions
 */
router.get('/permissions', authenticateUser, (req, res) => {
  return res.json({
    permissions: req.user.allPermissions || [],
    role: req.user.role
  });
});

/**
 * @route POST /api/auth/resend-verification
 * @description Resend email verification link
 * @access Public
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const user = await betaUsers.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({ message: 'If an account with that email exists, a verification email has been sent.' });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Update user with verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await betaUsers.updateUser(user.id, { 
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, verificationUrl, user.name);
    
    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/verify-email
 * @description Verify user email with token
 * @access Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // Find user with token
    const user = await betaUsers.findUserByVerificationToken(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    // Update user as verified
    await betaUsers.markEmailVerified(user.id);
    
    // Generate JWT token
    const jwtToken = jwtAuth.generateToken(user);
    
    res.status(200).json({
      token: jwtToken,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/request-password-reset
 * @description Request password reset email
 * @access Public
 */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Generate reset token (returns null if user doesn't exist)
    const resetToken = await betaUsers.createPasswordResetToken(email);
    
    // We don't want to reveal if a user exists or not
    if (resetToken) {
      // User exists, send reset email
      const user = await betaUsers.findUserByEmail(email);
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail(user.email, resetUrl, user.name);
    }
    
    // Always return success to prevent email enumeration
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @description Reset password with token
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Check password requirements
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Reset the password
    const success = await betaUsers.resetPassword(token, newPassword);
    
    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 