/**
 * Auth Service for Beta Program
 * Handles JWT-based authentication, token management, and user operations
 */

// Token constants
const TOKEN_KEY = 'beta_auth_token';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class AuthService {
  /**
   * Register a new beta tester
   * @param {Object} userData - User registration data
   * @param {string} betaCode - Beta access code
   * @returns {Promise<Object>} - User data and token
   */
  async register(userData, betaCode) {
    try {
      // Validate beta code (in a real app, this would be a server API call)
      if (!this.validateBetaCode(betaCode)) {
        throw new Error('Invalid beta access code');
      }

      // In a real application, this would be an API call to create the user
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate user object with role
      const user = {
        id: `user_${Math.floor(Math.random() * 10000)}`,
        name: userData.name,
        email: userData.email,
        role: 'beta_tester',
        registrationDate: new Date().toISOString()
      };

      // Generate and store JWT token
      const token = this.generateToken(user);
      this.setToken(token);

      return { user, token };
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
      // In a real application, this would be an API call to verify credentials
      // For now, we'll simulate the API call and accept any credentials
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock validation (in a real app, this would verify against a database)
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Generate mock user object
      const user = {
        id: `user_${Math.floor(Math.random() * 10000)}`,
        name: email.split('@')[0],
        email,
        role: 'beta_tester',
        registrationDate: new Date().toISOString()
      };

      // Generate and store JWT token
      const token = this.generateToken(user);
      this.setToken(token);

      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout the current user
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
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

      // Verify token and decode user information
      const user = this.verifyToken(token);
      
      if (!user) {
        this.logout();
        return null;
      }

      return user;
    } catch (error) {
      console.error('Auth check error:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Generate a JWT token for a user
   * @param {Object} user - User data to encode in the token
   * @returns {string} - JWT token
   */
  generateToken(user) {
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
      // Decode the token
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
   * Check if the beta code is valid
   * @param {string} code - Beta code to validate
   * @returns {boolean} - Whether the code is valid
   */
  validateBetaCode(code) {
    // In a real application, this would validate against a database of valid codes
    // For demonstration purposes, we'll accept "BETA12" as a valid code
    return code === 'BETA12';
  }

  /**
   * Check if the current user has a specific role
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} - Whether the user has the role
   */
  async hasRole(role) {
    const user = await this.checkAuthStatus();
    return user && user.role === role;
  }

  /**
   * Check if the current user is a beta tester
   * @returns {Promise<boolean>} - Whether the user is a beta tester
   */
  async isBetaTester() {
    return this.hasRole('beta_tester');
  }

  /**
   * Check if the current user is an admin
   * @returns {Promise<boolean>} - Whether the user is an admin
   */
  async isAdmin() {
    return this.hasRole('admin');
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 