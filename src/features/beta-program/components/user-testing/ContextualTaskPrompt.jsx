import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import InAppTaskPrompt from './InAppTaskPrompt';

/**
 * ContextualTaskPrompt - Displays relevant task prompts based on user's context
 * 
 * This component determines what tasks to show based on:
 * 1. The current URL path
 * 2. The current user's role and permissions
 * 3. The user's progress in the beta program
 */
const ContextualTaskPrompt = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [context, setContext] = useState(null);
  
  // Determine the current context based on URL and user
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Extract path segments for context mapping
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Map URL path to context identifier
    const determineContext = () => {
      // Root context
      if (path === '/' || path === '') {
        return 'dashboard';
      }
      
      // Feature-specific contexts
      if (segments[0] === 'beta') {
        // Beta program specific pages
        if (segments[1] === 'surveys') {
          return segments[2] ? 'survey_detail' : 'survey_list';
        }
        
        if (segments[1] === 'features') {
          return segments[2] ? 'feature_detail' : 'feature_list';
        }
        
        if (segments[1] === 'feedback') {
          return 'feedback';
        }
        
        if (segments[1] === 'analytics') {
          return 'analytics';
        }
        
        // Default beta context
        return 'beta_program';
      }
      
      // Account related contexts
      if (segments[0] === 'account' || segments[0] === 'profile') {
        return 'account_settings';
      }
      
      // Settings pages
      if (segments[0] === 'settings') {
        return segments[1] || 'general_settings';
      }
      
      // Default context
      return 'general';
    };
    
    // Set the context based on location
    const newContext = determineContext();
    
    // Add user role to context to enable role-specific tasks
    const contextWithRole = user?.role 
      ? `${newContext}_${user.role.toLowerCase()}`
      : newContext;
    
    setContext(contextWithRole);
  }, [location, isAuthenticated, user]);
  
  // Don't render anything for unauthenticated users
  if (!isAuthenticated || !context) {
    return null;
  }
  
  return <InAppTaskPrompt context={context} />;
};

export default ContextualTaskPrompt; 