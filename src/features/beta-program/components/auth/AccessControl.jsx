import PropTypes from 'prop-types';
import Role from './Role';
import Permission from './Permission';
import { useState, useEffect } from 'react';
import permissionsService from '../../services/PermissionsService';

/**
 * AccessControl Component
 * 
 * Advanced component for conditional rendering based on user permissions and roles
 * 
 * @param {Object} props - Component props
 * @param {string|string[]} [props.permission] - Required permission(s)
 * @param {string|string[]} [props.role] - Required role(s)
 * @param {boolean} [props.requireAllPermissions=false] - If true, all permissions are required
 * @param {boolean} [props.requireAllRoles=false] - If true, all roles are required
 * @param {boolean} [props.requireAll=false] - If true, both permission AND role conditions must be met
 * @param {boolean} [props.inverse=false] - If true, renders when conditions are NOT met
 * @param {React.ReactNode} [props.fallback=null] - Content to render when check fails
 * @param {React.ReactNode} props.children - Content to render when check passes
 * @returns {React.ReactNode} Rendered component
 */
const AccessControl = ({
  permission,
  role,
  requireAllPermissions = false,
  requireAllRoles = false,
  requireAll = false,
  inverse = false,
  fallback = null,
  children
}) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Default values if either permission or role is not provided
        let permissionCheck = permission ? false : true;
        let roleCheck = role ? false : true;

        // Check permissions if provided
        if (permission) {
          if (Array.isArray(permission)) {
            if (requireAllPermissions) {
              // Need all permissions
              permissionCheck = await permissionsService.hasAllPermissions(permission);
            } else {
              // Need any permission
              permissionCheck = await permissionsService.hasAnyPermission(permission);
            }
          } else {
            // Single permission
            permissionCheck = await permissionsService.hasPermission(permission);
          }
        }

        // Check roles if provided
        if (role) {
          if (Array.isArray(role)) {
            if (requireAllRoles) {
              // Need all roles
              const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
              roleCheck = results.every(result => result);
            } else {
              // Need any role
              const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
              roleCheck = results.some(result => result);
            }
          } else {
            // Single role
            roleCheck = await permissionsService.hasRole(role);
          }
        }

        // Determine access based on requireAll flag
        let accessGranted;
        if (requireAll) {
          // Need both permission AND role checks to pass
          accessGranted = permissionCheck && roleCheck;
        } else {
          // Need either permission OR role check to pass
          accessGranted = permissionCheck || roleCheck;
        }

        // Apply inverse logic if needed
        setHasAccess(inverse ? !accessGranted : accessGranted);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [permission, role, requireAllPermissions, requireAllRoles, requireAll, inverse]);

  // While checking access, don't render anything
  if (loading) {
    return null;
  }

  // Render content based on access check
  return hasAccess ? children : fallback;
};

AccessControl.propTypes = {
  permission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]),
  role: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]),
  requireAllPermissions: PropTypes.bool,
  requireAllRoles: PropTypes.bool,
  requireAll: PropTypes.bool,
  inverse: PropTypes.bool,
  fallback: PropTypes.node,
  children: PropTypes.node.isRequired
};

AccessControl.defaultProps = {
  permission: null,
  role: null,
  requireAllPermissions: false,
  requireAllRoles: false,
  requireAll: false,
  inverse: false,
  fallback: null
};

export default AccessControl; 