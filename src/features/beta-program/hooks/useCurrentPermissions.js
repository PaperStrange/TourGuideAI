import { useState, useEffect } from 'react';
import permissionsService from '../services/PermissionsService';

/**
 * Custom hook for accessing current user permissions and roles
 * @returns {Object} Object containing permissions and roles data and utility functions
 */
const useCurrentPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        
        // Initialize permissions if needed
        await permissionsService.initialize();
        
        // Get all permissions and roles
        const allPermissions = permissionsService.getAllPermissions();
        const allRoles = permissionsService.getAllRoles();
        
        setPermissions(allPermissions);
        setRoles(allRoles);
        
        // Check specific roles
        setIsAdmin(await permissionsService.isAdmin());
        setIsModerator(await permissionsService.isModerator());
        setIsBetaTester(await permissionsService.isBetaTester());
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  /**
   * Check if user has a specific permission
   * @param {string} permission Permission to check
   * @returns {boolean} Whether user has the permission
   */
  const hasPermission = async (permission) => {
    return await permissionsService.hasPermission(permission);
  };

  /**
   * Check if user has a specific role
   * @param {string} role Role to check
   * @returns {boolean} Whether user has the role
   */
  const hasRole = async (role) => {
    return await permissionsService.hasRole(role);
  };

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissionList Permissions to check
   * @returns {boolean} Whether user has any of the permissions
   */
  const hasAnyPermission = async (permissionList) => {
    return await permissionsService.hasAnyPermission(permissionList);
  };

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissionList Permissions to check
   * @returns {boolean} Whether user has all of the permissions
   */
  const hasAllPermissions = async (permissionList) => {
    return await permissionsService.hasAllPermissions(permissionList);
  };

  return {
    permissions,
    roles,
    isAdmin,
    isModerator,
    isBetaTester,
    isLoading,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions
  };
};

export default useCurrentPermissions; 