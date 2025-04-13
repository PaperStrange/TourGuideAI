/**
 * Permissions Context
 * Provides access to user permissions throughout the component tree
 */
import React, { createContext, useState, useEffect } from 'react';
import propTypes from 'prop-types';
import permissionsService, { ROLES, PERMISSIONS } from '../services/PermissionsService';

// Create context with default values
export const PermissionsContext = createContext({
  permissions: [],
  roles: [],
  isAdmin: false,
  isModerator: false,
  isBetaTester: false,
  isLoading: true,
  hasPermission: () => Promise.resolve(false),
  hasRole: () => Promise.resolve(false),
  hasAnyPermission: () => Promise.resolve(false),
  hasAllPermissions: () => Promise.resolve(false),
  refreshPermissions: () => Promise.resolve(),
});

/**
 * Permissions Provider Component
 * Provides permission-related state and functions to child components
 */
export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPermissions = async () => {
    try {
      setIsLoading(true);
      
      // Make sure permissions service is initialized
      await permissionsService.initialize();
      
      // Get current permissions and roles
      const currentPermissions = await permissionsService.getAllPermissions();
      const currentRoles = await permissionsService.getAllRoles();
      
      // Check specific roles
      const adminCheck = await permissionsService.isAdmin();
      const moderatorCheck = await permissionsService.isModerator();
      const betaTesterCheck = await permissionsService.isBetaTester();
      
      // Update state
      setPermissions(currentPermissions);
      setRoles(currentRoles);
      setIsAdmin(adminCheck);
      setIsModerator(moderatorCheck);
      setIsBetaTester(betaTesterCheck);
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load permissions when the component mounts
  useEffect(() => {
    refreshPermissions();
  }, []);

  // Pass through the permission service methods
  const hasPermission = permissionsService.hasPermission.bind(permissionsService);
  const hasRole = permissionsService.hasRole.bind(permissionsService);
  const hasAnyPermission = permissionsService.hasAnyPermission.bind(permissionsService);
  const hasAllPermissions = permissionsService.hasAllPermissions.bind(permissionsService);

  // Create context value
  const contextValue = {
    permissions,
    roles,
    isAdmin,
    isModerator,
    isBetaTester,
    isLoading,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

PermissionsProvider.propTypes = {
  children: propTypes.node.isRequired,
};

export default PermissionsProvider; 