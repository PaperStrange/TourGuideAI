/**
 * Invite Code Service
 * Handles invite code management for beta program administrators
 */

import api from '../../../core/api';
import { getAuthHeaders } from './AuthService';
import emailService from './EmailService';

// Base path for invite code endpoints
const API_BASE_URL = '/api/invite-codes';

class InviteCodeService {
  /**
   * Generate a new invite code
   * @param {Object} options - Options for generating the code
   * @param {boolean} options.sendEmail - Whether to send an email with the code
   * @param {string} options.recipientEmail - Email to send the code to
   * @returns {Promise<Object>} - The generated invite code
   */
  async generateCode(options = {}) {
    try {
      const { sendEmail, recipientEmail } = options;
      
      const response = await api.post(
        `${API_BASE_URL}/generate`, 
        { sendEmail, recipientEmail },
        { headers: getAuthHeaders() }
      );
      
      return response.data.inviteCode;
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
      const response = await api.get(
        API_BASE_URL,
        { headers: getAuthHeaders() }
      );
      return response.data.codes || [];
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
      const response = await api.post(
        `${API_BASE_URL}/validate`, 
        { code }
      );
      return response.data.valid;
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
      const response = await api.post(
        `${API_BASE_URL}/invalidate`, 
        { code },
        { headers: getAuthHeaders() }
      );
      return !!response.data.message;
    } catch (error) {
      console.error('Error invalidating invite code:', error);
      return false;
    }
  }
  
  /**
   * Send an existing invite code via email
   * @param {string} code - The invite code to send
   * @param {string} email - The recipient's email address
   * @returns {Promise<boolean>} - Whether the email was sent successfully
   */
  async sendInviteCodeEmail(code, email) {
    try {
      const response = await api.post(
        `${API_BASE_URL}/send`, 
        { code, email },
        { headers: getAuthHeaders() }
      );
      return response.data.emailSent;
    } catch (error) {
      console.error('Error sending invite code email:', error);
      return false;
    }
  }
}

export default new InviteCodeService(); 