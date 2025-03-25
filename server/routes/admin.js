/**
 * Admin Routes
 * 
 * Secure administration endpoints for managing the application.
 * These routes require admin privileges.
 */

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/rbacMiddleware');
const { fullAuth } = require('../middleware/authMiddleware');
const tokenProvider = require('../utils/tokenProvider');
const vaultService = require('../utils/vaultService');
const logger = require('../utils/logger');

// Require admin authentication for all routes in this file
router.use(fullAuth, requireRole('admin'));

/**
 * Get tokens needing rotation
 * @route GET /api/admin/tokens/rotation
 */
router.get('/tokens/rotation', async (req, res) => {
  try {
    const tokensNeedingRotation = await tokenProvider.getTokensNeedingRotation();
    
    res.json({
      count: tokensNeedingRotation.length,
      tokens: tokensNeedingRotation
    });
  } catch (error) {
    logger.error('Error fetching tokens needing rotation', { error });
    res.status(500).json({
      error: {
        message: 'Failed to fetch tokens needing rotation',
        details: error.message
      }
    });
  }
});

/**
 * Rotate a specific token
 * @route POST /api/admin/tokens/rotate
 */
router.post('/tokens/rotate', async (req, res) => {
  try {
    const { serviceName, newToken } = req.body;
    
    if (!serviceName || !newToken) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: serviceName and newToken',
          type: 'missing_fields'
        }
      });
    }
    
    await tokenProvider.rotateToken(serviceName, newToken);
    
    res.json({
      success: true,
      message: `Token for ${serviceName} rotated successfully`
    });
  } catch (error) {
    logger.error('Error rotating token', { error, serviceName: req.body.serviceName });
    res.status(500).json({
      error: {
        message: 'Failed to rotate token',
        details: error.message
      }
    });
  }
});

/**
 * Get all available tokens (masked)
 * @route GET /api/admin/tokens
 */
router.get('/tokens', async (req, res) => {
  try {
    const secrets = await vaultService.listSecrets();
    
    // Mask token values for security
    const maskedSecrets = secrets.map(secret => ({
      ...secret,
      name: secret.name,
      type: secret.type,
      createdAt: secret.createdAt,
      rotationDue: secret.rotationDue,
      needsRotation: secret.needsRotation
    }));
    
    res.json({
      count: maskedSecrets.length,
      tokens: maskedSecrets
    });
  } catch (error) {
    logger.error('Error fetching tokens', { error });
    res.status(500).json({
      error: {
        message: 'Failed to fetch tokens',
        details: error.message
      }
    });
  }
});

/**
 * Add a new token
 * @route POST /api/admin/tokens
 */
router.post('/tokens', async (req, res) => {
  try {
    const { serviceName, tokenValue, tokenType } = req.body;
    
    if (!serviceName || !tokenValue || !tokenType) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: serviceName, tokenValue, and tokenType',
          type: 'missing_fields'
        }
      });
    }
    
    // Store the token in the vault
    await tokenProvider.storeToken(serviceName, tokenValue);
    
    res.json({
      success: true,
      message: `Token for ${serviceName} added successfully`
    });
  } catch (error) {
    logger.error('Error adding token', { error, serviceName: req.body.serviceName });
    res.status(500).json({
      error: {
        message: 'Failed to add token',
        details: error.message
      }
    });
  }
});

/**
 * Get system health including vault status
 * @route GET /api/admin/system/health
 */
router.get('/system/health', async (req, res) => {
  try {
    // Check vault status
    const vaultInitialized = vaultService.initialized;
    
    // Count tokens by type
    const secrets = await vaultService.listSecrets();
    const tokenCounts = {};
    
    secrets.forEach(secret => {
      tokenCounts[secret.type] = (tokenCounts[secret.type] || 0) + 1;
    });
    
    // Get tokens needing rotation
    const tokensNeedingRotation = await tokenProvider.getTokensNeedingRotation();
    
    res.json({
      system: {
        vaultStatus: vaultInitialized ? 'initialized' : 'not_initialized',
        vaultBackend: vaultService.backendType,
        tokenCount: secrets.length,
        tokenTypes: tokenCounts,
        tokensNeedingRotation: tokensNeedingRotation.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching system health', { error });
    res.status(500).json({
      error: {
        message: 'Failed to fetch system health',
        details: error.message
      }
    });
  }
});

module.exports = router; 