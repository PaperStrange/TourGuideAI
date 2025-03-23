/**
 * Auth Service for Beta Program
 * Handles JWT-based authentication, token management, and user operations
 */

import { apiHelpers } from '../../../core/services/apiClient';
import permissionsService from './PermissionsService';

// Token constants
const TOKEN_KEY = 'beta_auth_token';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const AUTH_API_BASE = '/auth'; // Base path for auth endpoints

class AuthService {
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
      const response = await apiHelpers.post(`${AUTH_API_BASE}/register/public`, data);
      
      // Store the JWT token
      if (response.token) {
        this.setToken(response.token);
        
        // Initialize permissions
        await permissionsService.initialize();
      }

      return response;
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
      const response = await apiHelpers.post(`${AUTH_API_BASE}/login`, { email, password });
      
      // Store the JWT token
      if (response.token) {
        this.setToken(response.token);
        
        // Initialize permissions
        await permissionsService.initialize();
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
          await apiHelpers.post(`${AUTH_API_BASE}/logout`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Error calling logout API:', error);
          // Continue with local logout even if API call fails
        }
        
        // Remove the token from local storage
        localStorage.removeItem(TOKEN_KEY);
        
        // Reset permissions
        permissionsService.reset();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Always remove the token from local storage even if there's an error
      localStorage.removeItem(TOKEN_KEY);
      
      // Reset permissions
      permissionsService.reset();
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
        const response = await apiHelpers.get(`${AUTH_API_BASE}/me`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Initialize permissions if not already initialized
        if (permissionsService.initialized === false) {
          await permissionsService.initialize();
        }
        
        return response.user;
      } catch (error) {
        // If the API call fails, fall back to local token verification
        console.warn('Error checking auth status with API, falling back to local check:', error);
        
        // Verify token locally and decode user information
        const user = this.verifyToken(token);
        
        if (!user) {
          this.logout();
          return null;
        }
        
        return user;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Generate a temporary token for development/fallback purposes
   * This will be removed once the backend JWT system is fully integrated
   * @param {Object} user - User data to encode in the token
   * @returns {string} - Temporary token
   */
  generateTempToken(user) {
    // In a real application, this would use a JWT library to properly sign the token
    // For demonstration purposes, we'll create a simple encoded token
    const payload = {
      user: { ...user },
      exp: Date.now() + TOKEN_EXPIRY
    };

    return btoa(JSON.stringify(payload));
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} - Decoded user data or null if invalid
   */
  verifyToken(token) {
    try {
      // For server-issued JWT tokens, we should rely on server verification
      // This is just a fallback for development/testing
      
      // First check if it's our temporary token format
      if (token.startsWith('eyJ')) {
        // Looks like a real JWT, we can't decode it locally
        // Return a basic user object and let the server validate it
        return {
          id: 'unknown',
          role: 'unknown'
        };
      }
      
      // Decode the token (only for temporary tokens)
      const decoded = JSON.parse(atob(token));
      
      // Check if the token has expired
      if (decoded.exp < Date.now()) {
        return null;
      }
      
      return decoded.user;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
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
      const response = await apiHelpers.post('/invite-codes/validate', { code });
      return response.isValid;
    } catch (error) {
      console.error('Beta code validation error:', error);
      return false;
    }
  }

  /**
   * Check if the current user has a specific role
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} - Whether the user has the role
   * @deprecated Use permissionsService.hasRole() instead
   */
  async hasRole(role) {
    return permissionsService.hasRole(role);
  }

  /**
   * Check if the current user is a beta tester
   * @returns {Promise<boolean>} - Whether the user is a beta tester
   * @deprecated Use permissionsService.isBetaTester() instead
   */
  async isBetaTester() {
    return permissionsService.isBetaTester();
  }

  /**
   * Check if the current user is an admin
   * @returns {Promise<boolean>} - Whether the user is an admin
   * @deprecated Use permissionsService.isAdmin() instead
   */
  async isAdmin() {
    return permissionsService.isAdmin();
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 