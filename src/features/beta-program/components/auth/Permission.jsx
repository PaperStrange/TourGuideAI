import { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PermissionsContext } from '../../contexts/PermissionsContext';
import permissionsService from '../../services/PermissionsService';

/**
 * Permission Component
 * 
 * Conditionally renders content based on user permissions
 * 
 * @param {Object} props - Component props
 * @param {string|string[]} props.permission - Required permission(s)
 * @param {boolean} props.requireAll - If true, all permissions are required (AND). If false, any permission is sufficient (OR).
 * @param {boolean} props.inverse - If true, renders when user does NOT have the permission(s)
 * @param {React.ReactNode} props.fallback - Optional content to render when permission is denied
 * @param {React.ReactNode} props.children - Content to render when permission is granted
 * @returns {React.ReactNode} Rendered component
 */
const Permission = ({ 
  permission, 
  requireAll = false, 
  inverse = false, 
  fallback = null, 
  children 
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        let permissionCheck = false;
        
        if (Array.isArray(permission)) {
          if (requireAll) {
            // Require all permissions
            permissionCheck = await permissionsService.hasAllPermissions(permission);
          } else {
            // Require any permission
            permissionCheck = await permissionsService.hasAnyPermission(permission);
          }
        } else {
          // Single permission
          permissionCheck = await permissionsService.hasPermission(permission);
        }
        
        // Apply inverse logic if needed
        setHasPermission(inverse ? !permissionCheck : permissionCheck);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permission, requireAll, inverse]);

  // While checking permissions, don't render anything
  if (loading) {
    return null;
  }

  // Render content based on permission check
  return hasPermission ? children : fallback;
};

Permission.propTypes = {
  permission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]).isRequired,
  requireAll: PropTypes.bool,
  inverse: PropTypes.bool,
  fallback: PropTypes.node,
  children: PropTypes.node.isRequired
};

Permission.defaultProps = {
  requireAll: false,
  inverse: false,
  fallback: null
};

export default Permission; 