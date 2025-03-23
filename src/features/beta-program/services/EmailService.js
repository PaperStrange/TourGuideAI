/**
 * Email Service
 * 
 * Service for handling email-related operations in the beta program
 */

import apiClient from '../../../core/api/apiClient';
import { getAuthHeaders } from './AuthService';

const API_BASE_URL = '/api/emails';

/**
 * Request email verification
 * 
 * Resends the verification email to the current user
 * 
 * @returns {Promise<Object>} Response data
 */
const requestEmailVerification = async () => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/resend-verification`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting email verification:', error);
    throw error;
  }
};

/**
 * Verify email with token
 * 
 * @param {string} token - Email verification token
 * @returns {Promise<Object>} Response data with token and user info
 */
const verifyEmail = async (token) => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/verify`, { token });
    return response.data;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
};

/**
 * Request password reset
 * 
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Response data
 */
const requestPasswordReset = async (email) => {
  try {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * 
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response data
 */
const resetPassword = async (token, newPassword) => {
  try {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

/**
 * Send invitation code to email
 * 
 * @param {string} code - Invitation code
 * @param {string} email - Recipient email address
 * @returns {Promise<Object>} Response data
 */
const sendInviteCode = async (code, email) => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/send-invite`,
      { email, code },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending invitation code:', error);
    throw error;
  }
};

const emailService = {
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  sendInviteCode
};

export default emailService; 