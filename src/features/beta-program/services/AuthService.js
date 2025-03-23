/**
 * Auth Service for Beta Program
 * Handles JWT-based authentication, token management, and user operations
 */

import api from '../../../core/api';
import permissionsService from './PermissionsService';

// Token constants
const TOKEN_KEY = 'beta_auth_token';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const API_BASE_URL = '/api/auth'; // Base path for auth endpoints

// Create auth headers with JWT token
export const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Register a new beta tester
   * @param {Object} userData - User registration data
   * @param {string} betaCode - Beta access code
   * @returns {Promise<Object>} - User data and token
   */
  async register(userData, betaCode) {
    try {
      // Prepare the request data
      const data = {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        inviteCode: betaCode
      };

      // Call the public registration API endpoint
      const response = await api.post(`${API_BASE_URL}/register/public`, data);
      
      // Store the JWT token and user data
      if (response.data.token) {
        this.setToken(response.data.token);
        this.currentUser = response.data.user;
        
        // Initialize permissions
        await permissionsService.initialize();
      }

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login an existing beta tester
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - User data and token
   */
  async login(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Call the login API endpoint
      const response = await api.post(`${API_BASE_URL}/login`, { email, password });
      
      // Store the JWT token and user data
      if (response.data.token) {
        this.setToken(response.data.token);
        this.currentUser = response.data.user;
        
        // Initialize permissions
        await permissionsService.initialize();
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Login using a token (for email verification or password reset)
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} - Success status
   */
  async loginWithToken(token) {
    try {
      if (!token) return false;

      // Store the token
      localStorage.setItem('authToken', token);
      
      // Fetch user data
      const userData = await this.getCurrentUser();
      
      if (userData) {
        this.currentUser = userData;
        await permissionsService.initialize();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login with token failed:', error);
      return false;
    }
  }

  /**
   * Logout the current user
   */
  async logout() {
    try {
      const token = this.getToken();
      
      if (token) {
        // Call the logout API endpoint to invalidate the token on the server
        try {
          await api.post(`${API_BASE_URL}/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error('Error calling logout API:', error);
          // Continue with local logout even if API call fails
        }
        
        // Remove the token from local storage
        localStorage.removeItem(TOKEN_KEY);
        
        // Reset permissions
        permissionsService.reset();
        
        // Clear current user
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Always remove the token from local storage even if there's an error
      localStorage.removeItem(TOKEN_KEY);
      
      // Reset permissions
      permissionsService.reset();
      
      // Clear current user
      this.currentUser = null;
    }
  }

  /**
   * Check if a user is authenticated
   * @returns {Promise<Object|null>} - User data if authenticated, null otherwise
   */
  async checkAuthStatus() {
    try {
      const token = this.getToken();
      
      if (!token) {
        return null;
      }

      try {
        // Call the /me API endpoint to verify the token and get user data
        const response = await api.get(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Store user data
        this.currentUser = response.data.user;
        
        // Initialize permissions if not already initialized
        if (!permissionsService.isInitialized()) {
          await permissionsService.initialize();
        }
        
        return response.data.user;
      } catch (error) {
        // If the API call fails, the token might be invalid
        console.warn('Error checking auth status with API:', error);
        
        if (error.response?.status === 401) {
          // Token is invalid or expired, logout
          this.logout();
        }
        
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Get the current user
   * @returns {Object|null} - Current user data or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user's email is verified
   * @returns {boolean} - Whether the email is verified
   */
  isEmailVerified() {
    return this.currentUser?.isEmailVerified === true;
  }

  /**
   * Store the JWT token in localStorage
   * @param {string} token - JWT token to store
   */
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Get the JWT token from localStorage
   * @returns {string|null} - JWT token or null if not found
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Validate a beta access code
   * @param {string} code - Beta code to validate
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async validateBetaCode(code) {
    try {
      // Call the validation API endpoint
      const response = await api.post('/api/invite-codes/validate', { code });
      return response.data.valid;
    } catch (error) {
      console.error('Beta code validation error:', error);
      return false;
    }
  }

  /**
   * Change current user's password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Whether the password was changed successfully
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post(
        `${API_BASE_URL}/change-password`,
        { currentPassword, newPassword },
        { headers: getAuthHeaders() }
      );
      return !!response.data.message;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Update current user's profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} - Updated user data
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put(
        `${API_BASE_URL}/profile`,
        profileData,
        { headers: getAuthHeaders() }
      );
      
      // Update current user
      if (response.data.user) {
        this.currentUser = response.data.user;
      }
      
      return response.data.user;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Check if the current user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} - Whether the user has the role
   * @deprecated Use permissionsService.hasRole instead
   */
  hasRole(role) {
    return permissionsService.hasRole(role);
  }

  /**
   * Check if the current user is a beta tester
   * @returns {boolean} - Whether the user is a beta tester
   * @deprecated Use permissionsService.isBetaTester instead
   */
  isBetaTester() {
    return permissionsService.isBetaTester();
  }

  /**
   * Check if the current user is an admin
   * @returns {boolean} - Whether the user is an admin
   * @deprecated Use permissionsService.isAdmin instead
   */
  isAdmin() {
    return permissionsService.isAdmin();
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService; 