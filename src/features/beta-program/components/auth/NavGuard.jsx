import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import permissionsService from '../../services/PermissionsService';
import authService from '../../services/AuthService';

/**
 * NavGuard Component
 * 
 * Protects routes based on user authentication status, permissions, and roles
 * 
 * @param {Object} props - Component props
 * @param {boolean} [props.requireAuth=true] - If true, requires authentication
 * @param {string|string[]} [props.permission] - Required permission(s)
 * @param {string|string[]} [props.role] - Required role(s)
 * @param {boolean} [props.requireAllPermissions=false] - If true, all permissions are required
 * @param {boolean} [props.requireAllRoles=false] - If true, all roles are required
 * @param {boolean} [props.requireAll=false] - If true, both permission AND role conditions must be met
 * @param {string} [props.redirectTo='/login'] - Redirect path when access is denied
 * @param {React.ReactNode} props.children - Protected content to render
 * @returns {React.ReactNode} Rendered component or Navigate redirect
 */
const NavGuard = ({
  requireAuth = true,
  permission,
  role,
  requireAllPermissions = false,
  requireAllRoles = false,
  requireAll = false,
  redirectTo = '/login',
  children
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // First check authentication
        const isAuthenticated = await authService.checkAuthStatus();
        
        // If authentication is required but user is not authenticated, deny access
        if (requireAuth && !isAuthenticated) {
          setHasAccess(false);
          setIsChecking(false);
          return;
        }
        
        // If no authentication is required, grant access
        if (!requireAuth) {
          setHasAccess(true);
          setIsChecking(false);
          return;
        }

        // At this point, user is authenticated and authentication is required
        // If no further permission/role checks are needed, grant access
        if (!permission && !role) {
          setHasAccess(true);
          setIsChecking(false);
          return;
        }

        // Default values if either permission or role is not provided
        let permissionCheck = permission ? false : true;
        let roleCheck = role ? false : true;

        // Check permissions if provided
        if (permission) {
          if (Array.isArray(permission)) {
            if (requireAllPermissions) {
              permissionCheck = await permissionsService.hasAllPermissions(permission);
            } else {
              permissionCheck = await permissionsService.hasAnyPermission(permission);
            }
          } else {
            permissionCheck = await permissionsService.hasPermission(permission);
          }
        }

        // Check roles if provided
        if (role) {
          if (Array.isArray(role)) {
            if (requireAllRoles) {
              const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
              roleCheck = results.every(result => result);
            } else {
              const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
              roleCheck = results.some(result => result);
            }
          } else {
            roleCheck = await permissionsService.hasRole(role);
          }
        }

        // Determine access based on requireAll flag
        let accessGranted;
        if (requireAll) {
          accessGranted = permissionCheck && roleCheck;
        } else {
          accessGranted = permissionCheck || roleCheck;
        }

        setHasAccess(accessGranted);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [
    requireAuth,
    permission,
    role,
    requireAllPermissions,
    requireAllRoles,
    requireAll,
    location.pathname
  ]);

  // Show nothing while checking access
  if (isChecking) {
    return null;
  }

  // Redirect if access is denied
  if (!hasAccess) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location, message: 'Access denied. Insufficient permissions.' }} 
        replace 
      />
    );
  }

  // Render content if access is granted
  return children;
};

export default NavGuard; 