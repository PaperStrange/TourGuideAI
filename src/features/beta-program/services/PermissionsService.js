/**
 * Permissions Service
 * Handles role-based access control on the frontend
 */

import authService from './AuthService';
import { apiHelpers } from '../../../core/services/apiClient';

// Define roles
export const ROLES = {
  GUEST: 'guest',
  BETA_TESTER: 'beta-tester',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// Define permissions (should match server-side permissions)
export const PERMISSIONS = {
  // User management
  CREATE_USER: 'create:user',
  READ_USER: 'read:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',
  
  // Invite codes
  CREATE_INVITE: 'create:invite',
  READ_INVITE: 'read:invite',
  UPDATE_INVITE: 'update:invite',
  DELETE_INVITE: 'delete:invite',
  
  // Feedback
  CREATE_FEEDBACK: 'create:feedback',
  READ_FEEDBACK: 'read:feedback',
  UPDATE_FEEDBACK: 'update:feedback',
  DELETE_FEEDBACK: 'delete:feedback',
  
  // Application features
  ACCESS_BETA_FEATURES: 'access:beta',
  ACCESS_ANALYTICS: 'access:analytics',
  ACCESS_ADMIN_PANEL: 'access:admin',
  
  // Content management
  MANAGE_CONTENT: 'manage:content',
};

class PermissionsService {
  constructor() {
    this.permissions = null;
    this.roles = null;
    this.initialized = false;
  }

  /**
   * Initialize the permissions service by fetching user permissions
   */
  async initialize() {
    try {
      if (!authService.getToken()) {
        // User is not authenticated, set empty permissions
        this.permissions = [];
        this.roles = [];
        this.initialized = true;
        return;
      }

      // Fetch permissions from the server
      const response = await apiHelpers.get('/auth/permissions');
      
      this.permissions = response.permissions || [];
      this.roles = response.roles || [];
      this.initialized = true;

      console.log('Permissions initialized:', this.permissions);
      console.log('Roles initialized:', this.roles);
    } catch (error) {
      console.error('Error initializing permissions:', error);
      // Set empty permissions in case of error
      this.permissions = [];
      this.roles = [];
      this.initialized = true;
    }
  }

  /**
   * Ensure the permissions service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if the user has a specific permission
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} - Whether the user has the permission
   */
  async hasPermission(permission) {
    await this.ensureInitialized();
    return this.permissions.includes(permission);
  }

  /**
   * Check if the user has a specific role
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} - Whether the user has the role
   */
  async hasRole(role) {
    await this.ensureInitialized();
    return this.roles.includes(role);
  }

  /**
   * Check if the user has any of the specified permissions
   * @param {string[]} permissions - Permissions to check
   * @returns {Promise<boolean>} - Whether the user has any of the permissions
   */
  async hasAnyPermission(permissions) {
    await this.ensureInitialized();
    return permissions.some(permission => this.permissions.includes(permission));
  }

  /**
   * Check if the user has all of the specified permissions
   * @param {string[]} permissions - Permissions to check
   * @returns {Promise<boolean>} - Whether the user has all of the permissions
   */
  async hasAllPermissions(permissions) {
    await this.ensureInitialized();
    return permissions.every(permission => this.permissions.includes(permission));
  }

  /**
   * Get all permissions for the current user
   * @returns {Promise<string[]>} - Array of permissions
   */
  async getAllPermissions() {
    await this.ensureInitialized();
    return this.permissions;
  }

  /**
   * Get all roles for the current user
   * @returns {Promise<string[]>} - Array of roles
   */
  async getAllRoles() {
    await this.ensureInitialized();
    return this.roles;
  }

  /**
   * Check if current user is an admin
   * @returns {Promise<boolean>} - Whether the user is an admin
   */
  async isAdmin() {
    return this.hasRole(ROLES.ADMIN);
  }

  /**
   * Check if current user is a moderator
   * @returns {Promise<boolean>} - Whether the user is a moderator
   */
  async isModerator() {
    return this.hasRole(ROLES.MODERATOR);
  }

  /**
   * Check if current user is a beta tester
   * @returns {Promise<boolean>} - Whether the user is a beta tester
   */
  async isBetaTester() {
    return this.hasRole(ROLES.BETA_TESTER);
  }

  /**
   * Reset permissions when user logs out
   */
  reset() {
    this.permissions = null;
    this.roles = null;
    this.initialized = false;
  }
}

// Create a singleton instance
const permissionsService = new PermissionsService();

export default permissionsService; 