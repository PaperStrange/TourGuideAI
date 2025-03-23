/**
 * Beta Invitation Codes Model
 * 
 * Manages the generation, storage, and validation of beta tester invitation codes.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');

// In-memory storage for invitation codes
// In production, this would be a database
const inviteCodes = new Map();

// Configuration
const CODE_LENGTH = 8;
const CODE_EXPIRY = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

/**
 * Initialize the invite codes storage
 */
const initialize = async () => {
  // For development purposes, create some initial codes
  if (process.env.NODE_ENV !== 'production') {
    // Create a static code for testing
    inviteCodes.set('BETA2023', {
      id: 'static-test-code',
      code: 'BETA2023',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CODE_EXPIRY).toISOString(),
      usedBy: null,
      usedAt: null,
      isValid: true
    });
    
    logger.info('Initialized invite codes with test code: BETA2023');
  }
  
  return true;
};

/**
 * Generate a new invite code
 * @param {string} createdBy - User ID or 'system' for the creator
 * @returns {Object} Generated code object
 */
const generateCode = async (createdBy = 'system') => {
  try {
    // Generate a random code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Create code object
    const inviteCode = {
      id: uuidv4(),
      code,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CODE_EXPIRY).toISOString(),
      usedBy: null,
      usedAt: null,
      isValid: true
    };
    
    // Store code
    inviteCodes.set(code, inviteCode);
    
    return inviteCode;
  } catch (error) {
    logger.error('Error generating invite code', { error });
    throw error;
  }
};

/**
 * Validate an invite code
 * @param {string} code - The code to validate
 * @returns {boolean} Whether the code is valid
 */
const validateCode = async (code) => {
  try {
    if (!code) return false;
    
    // Look up code
    const inviteCode = inviteCodes.get(code);
    
    if (!inviteCode) return false;
    
    // Check if code is still valid
    if (!inviteCode.isValid) return false;
    
    // Check if code has been used
    if (inviteCode.usedBy) return false;
    
    // Check if code has expired
    const expiryDate = new Date(inviteCode.expiresAt);
    if (expiryDate < new Date()) return false;
    
    return true;
  } catch (error) {
    logger.error('Error validating invite code', { error });
    return false;
  }
};

/**
 * Mark an invite code as used
 * @param {string} code - The code to mark as used
 * @param {string} userId - The user who used the code
 * @returns {boolean} Whether the operation was successful
 */
const useCode = async (code, userId) => {
  try {
    // Look up code
    const inviteCode = inviteCodes.get(code);
    
    if (!inviteCode) return false;
    
    // Check if code can be used
    const isValid = await validateCode(code);
    if (!isValid) return false;
    
    // Mark code as used
    inviteCode.usedBy = userId;
    inviteCode.usedAt = new Date().toISOString();
    
    // Update in storage
    inviteCodes.set(code, inviteCode);
    
    return true;
  } catch (error) {
    logger.error('Error using invite code', { error });
    return false;
  }
};

/**
 * Get all invite codes (admin only)
 * @returns {Array} List of all invite codes
 */
const getAllCodes = async () => {
  try {
    return Array.from(inviteCodes.values());
  } catch (error) {
    logger.error('Error getting all invite codes', { error });
    throw error;
  }
};

/**
 * Invalidate an invite code (admin only)
 * @param {string} code - The code to invalidate
 * @returns {boolean} Whether the operation was successful
 */
const invalidateCode = async (code) => {
  try {
    // Look up code
    const inviteCode = inviteCodes.get(code);
    
    if (!inviteCode) return false;
    
    // Mark code as invalid
    inviteCode.isValid = false;
    
    // Update in storage
    inviteCodes.set(code, inviteCode);
    
    return true;
  } catch (error) {
    logger.error('Error invalidating invite code', { error });
    return false;
  }
};

module.exports = {
  initialize,
  generateCode,
  validateCode,
  useCode,
  getAllCodes,
  invalidateCode
}; 