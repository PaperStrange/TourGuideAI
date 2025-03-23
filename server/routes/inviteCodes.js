/**
 * Invitation Codes Routes
 * 
 * Routes for managing beta tester invitation codes.
 */

const express = require('express');
const router = express.Router();
const inviteCodes = require('../models/inviteCodes');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, PERMISSIONS } = require('../middleware/rbacMiddleware');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Initialize invite codes on startup
inviteCodes.initialize().catch(error => {
  logger.error('Failed to initialize invite codes', { error });
});

/**
 * Generate a new invitation code (admin/moderator only)
 */
router.post('/generate', 
  authenticateUser, 
  requirePermission(PERMISSIONS.CREATE_INVITE), 
  async (req, res) => {
    try {
      const { sendEmail, recipientEmail } = req.body;
      
      // Generate code
      const inviteCode = await inviteCodes.generateCode(req.user.id);
      
      // If sendEmail flag is true and recipientEmail is provided, send email
      if (sendEmail && recipientEmail) {
        const emailSent = await emailService.sendInviteCodeEmail(
          recipientEmail, 
          inviteCode, 
          req.user.name || 'The TourGuideAI Team'
        );
        
        if (!emailSent) {
          logger.warn('Failed to send invite code email', { 
            code: inviteCode.code, 
            recipientEmail 
          });
        }
        
        return res.status(201).json({
          inviteCode,
          emailSent
        });
      }
      
      return res.status(201).json({ inviteCode });
    } catch (error) {
      logger.error('Error generating invitation code', { error });
      
      return res.status(500).json({
        error: {
          message: 'Failed to generate invitation code',
          type: 'generation_error'
        }
      });
    }
  }
);

/**
 * Validate an invitation code (public)
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: {
          message: 'Invitation code is required',
          type: 'missing_code'
        }
      });
    }
    
    const isValid = await inviteCodes.validateCode(code);
    
    return res.json({ isValid });
  } catch (error) {
    logger.error('Error validating invitation code', { error });
    
    return res.status(500).json({
      error: {
        message: 'Failed to validate invitation code',
        type: 'validation_error'
      }
    });
  }
});

/**
 * List all invitation codes (admin/moderator only)
 */
router.get('/', 
  authenticateUser, 
  requirePermission(PERMISSIONS.READ_INVITE), 
  async (req, res) => {
    try {
      const codes = await inviteCodes.getAllCodes();
      
      return res.json({ codes });
    } catch (error) {
      logger.error('Error listing invitation codes', { error });
      
      return res.status(500).json({
        error: {
          message: 'Failed to list invitation codes',
          type: 'list_error'
        }
      });
    }
  }
);

/**
 * Invalidate an invitation code (admin only)
 */
router.post('/invalidate', 
  authenticateUser, 
  requirePermission(PERMISSIONS.UPDATE_INVITE), 
  async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({
          error: {
            message: 'Invitation code is required',
            type: 'missing_code'
          }
        });
      }
      
      const success = await inviteCodes.invalidateCode(code);
      
      if (!success) {
        return res.status(404).json({
          error: {
            message: 'Invitation code not found',
            type: 'code_not_found'
          }
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      logger.error('Error invalidating invitation code', { error });
      
      return res.status(500).json({
        error: {
          message: 'Failed to invalidate invitation code',
          type: 'invalidation_error'
        }
      });
    }
  }
);

/**
 * Send invitation email with an existing code
 */
router.post('/send', 
  authenticateUser, 
  requirePermission(PERMISSIONS.CREATE_INVITE), 
  async (req, res) => {
    try {
      const { code, email } = req.body;
      
      if (!code || !email) {
        return res.status(400).json({
          error: {
            message: 'Invite code and email are required',
            type: 'missing_fields'
          }
        });
      }
      
      // Get invite code
      const allCodes = await inviteCodes.getAllCodes();
      const inviteCode = allCodes.find(c => c.code === code);
      
      if (!inviteCode) {
        return res.status(404).json({
          error: {
            message: 'Invalid invitation code',
            type: 'invalid_code'
          }
        });
      }
      
      // Check if code is valid
      if (!inviteCode.isValid || inviteCode.usedBy) {
        return res.status(400).json({
          error: {
            message: 'Invitation code is no longer valid',
            type: 'invalid_code'
          }
        });
      }
      
      // Send email
      const emailSent = await emailService.sendInviteCodeEmail(
        email, 
        inviteCode, 
        req.user.name || 'The TourGuideAI Team'
      );
      
      if (!emailSent) {
        return res.status(500).json({
          error: {
            message: 'Failed to send invitation email',
            type: 'email_error'
          }
        });
      }
      
      return res.json({
        message: 'Invitation sent successfully',
        emailSent: true
      });
    } catch (error) {
      logger.error('Error sending invite code', { error });
      
      return res.status(500).json({
        error: {
          message: 'Error sending invitation',
          type: 'sending_error'
        }
      });
    }
  }
);

module.exports = router; 