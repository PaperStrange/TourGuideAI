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
      const code = await inviteCodes.generateCode(req.user.id);
      
      return res.status(201).json({ code });
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

module.exports = router; 