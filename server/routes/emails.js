/**
 * Email Routes
 * 
 * Routes for email verification, sending invite codes, and other email functionality.
 */

const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const betaUsers = require('../models/betaUsers');
const inviteCodes = require('../models/inviteCodes');
const jwtAuth = require('../utils/jwtAuth');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, PERMISSIONS } = require('../middleware/rbacMiddleware');
const logger = require('../utils/logger');

/**
 * Verify email token
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Verification token is required',
          type: 'missing_token'
        }
      });
    }
    
    const userId = emailService.verifyEmailToken(token);
    
    if (!userId) {
      return res.status(400).json({
        error: {
          message: 'Invalid or expired verification token',
          type: 'invalid_token'
        }
      });
    }
    
    // Update user's email verification status
    const user = await betaUsers.markEmailVerified(userId);
    
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          type: 'user_not_found'
        }
      });
    }
    
    // Generate token for automatic login
    const authToken = jwtAuth.generateToken(user);
    
    return res.json({
      message: 'Email verified successfully',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Email verification error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Email verification error',
        type: 'verification_error'
      }
    });
  }
});

/**
 * Send invite code to email address (requires admin/moderator permission)
 */
router.post('/send-invite', 
  ...(authenticateUser ? [authenticateUser] : []), 
  ...(requirePermission && PERMISSIONS ? [requirePermission(PERMISSIONS.CREATE_INVITE)] : []),
  async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          error: {
            message: 'Email is required',
            type: 'missing_email'
          }
        });
      }
      
      // Generate a new invite code
      const inviteCode = await inviteCodes.generateCode(req.user.id);
      
      // Send the invite code via email
      const emailSent = await emailService.sendInviteCodeEmail(
        email, 
        inviteCode, 
        req.user.name || 'The TourGuideAI Team'
      );
      
      if (!emailSent) {
        return res.status(500).json({
          error: {
            message: 'Failed to send invitation email',
            type: 'email_delivery_error'
          }
        });
      }
      
      return res.status(201).json({
        message: 'Invitation sent successfully',
        inviteCode
      });
    } catch (error) {
      logger.error('Error sending invite code', { error });
      
      return res.status(500).json({
        error: {
          message: 'Error sending invitation',
          type: 'invitation_error'
        }
      });
    }
  }
);

/**
 * Request password reset
 */
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: {
          message: 'Email is required',
          type: 'missing_email'
        }
      });
    }
    
    // Find user
    const user = betaUsers.findUserByEmail(email);
    
    // If user not found, still return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If your email exists in our system, you will receive a password reset link'
      });
    }
    
    // Generate password reset token
    const resetToken = await betaUsers.generatePasswordResetToken(user.id);
    
    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(user, resetToken);
    
    if (!emailSent) {
      logger.error('Failed to send password reset email', { userId: user.id });
    }
    
    return res.json({
      message: 'If your email exists in our system, you will receive a password reset link'
    });
  } catch (error) {
    logger.error('Password reset request error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Error processing password reset request',
        type: 'reset_request_error'
      }
    });
  }
});

/**
 * Reset password using token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        error: {
          message: 'Token and new password are required',
          type: 'missing_fields'
        }
      });
    }
    
    // Validate token and reset password
    const success = await betaUsers.resetPassword(token, newPassword);
    
    if (!success) {
      return res.status(400).json({
        error: {
          message: 'Invalid or expired token',
          type: 'invalid_token'
        }
      });
    }
    
    return res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error', { error });
    
    return res.status(500).json({
      error: {
        message: 'Error resetting password',
        type: 'reset_error'
      }
    });
  }
});

/**
 * Resend verification email (for authenticated users)
 */
router.post('/resend-verification', authenticateUser, async (req, res) => {
  try {
    const user = await betaUsers.findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          type: 'user_not_found'
        }
      });
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        error: {
          message: 'Email already verified',
          type: 'already_verified'
        }
      });
    }
    
    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(user);
    
    if (!emailSent) {
      return res.status(500).json({
        error: {
          message: 'Failed to send verification email',
          type: 'email_delivery_error'
        }
      });
    }
    
    return res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Error resending verification email', { error, userId: req.user.id });
    
    return res.status(500).json({
      error: {
        message: 'Error sending verification email',
        type: 'verification_error'
      }
    });
  }
});

module.exports = router; 