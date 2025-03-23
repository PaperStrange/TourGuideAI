/**
 * Invite Code Service
 * Handles invite code management for beta program administrators
 */

import { apiHelpers } from '../../../core/services/apiClient';

// Base path for invite code endpoints
const INVITE_CODE_API_BASE = '/invite-codes';

class InviteCodeService {
  /**
   * Generate a new invite code
   * @returns {Promise<Object>} - The generated invite code
   */
  async generateCode() {
    try {
      const response = await apiHelpers.post(`${INVITE_CODE_API_BASE}/generate`);
      return response.code;
    } catch (error) {
      console.error('Error generating invite code:', error);
      throw error;
    }
  }

  /**
   * Get all invite codes
   * @returns {Promise<Array>} - List of all invite codes
   */
  async getAllCodes() {
    try {
      const response = await apiHelpers.get(INVITE_CODE_API_BASE);
      return response.codes || [];
    } catch (error) {
      console.error('Error getting invite codes:', error);
      throw error;
    }
  }

  /**
   * Validate an invite code
   * @param {string} code - The code to validate
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async validateCode(code) {
    try {
      const response = await apiHelpers.post(`${INVITE_CODE_API_BASE}/validate`, { code });
      return response.isValid;
    } catch (error) {
      console.error('Error validating invite code:', error);
      return false;
    }
  }

  /**
   * Invalidate an invite code
   * @param {string} code - The code to invalidate
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async invalidateCode(code) {
    try {
      const response = await apiHelpers.post(`${INVITE_CODE_API_BASE}/invalidate`, { code });
      return response.success;
    } catch (error) {
      console.error('Error invalidating invite code:', error);
      return false;
    }
  }
}

export default new InviteCodeService(); 