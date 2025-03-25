import React, { useState, useEffect } from 'react';
import permissionsService from '../../services/PermissionsService';

/**
 * Role Component
 * 
 * Conditionally renders content based on user roles
 * 
 * @param {Object} props - Component props
 * @param {string|string[]} props.role - Required role(s)
 * @param {boolean} props.requireAll - If true, all roles are required (AND). If false, any role is sufficient (OR).
 * @param {boolean} props.inverse - If true, renders when user does NOT have the role(s)
 * @param {React.ReactNode} props.fallback - Optional content to render when role check fails
 * @param {React.ReactNode} props.children - Content to render when role check passes
 * @returns {React.ReactNode} Rendered component
 */
const Role = ({ 
  role, 
  requireAll = false, 
  inverse = false, 
  fallback = null, 
  children 
}) => {
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        let roleCheck = false;
        
        if (Array.isArray(role)) {
          if (requireAll) {
            // Require all roles
            const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
            roleCheck = results.every(result => result);
          } else {
            // Require any role
            const results = await Promise.all(role.map(r => permissionsService.hasRole(r)));
            roleCheck = results.some(result => result);
          }
        } else {
          // Single role
          roleCheck = await permissionsService.hasRole(role);
        }
        
        // Apply inverse logic if needed
        setHasRole(inverse ? !roleCheck : roleCheck);
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [role, requireAll, inverse]);

  // While checking roles, don't render anything
  if (loading) {
    return null;
  }

  // Render content based on role check
  return hasRole ? children : fallback;
};

export default Role; 