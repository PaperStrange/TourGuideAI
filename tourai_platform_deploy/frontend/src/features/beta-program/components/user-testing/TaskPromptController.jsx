import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../../../contexts/AuthContext';
import InAppTaskPrompt from './InAppTaskPrompt';

/**
 * TaskPromptController
 * 
 * Manages context-aware task prompts throughout the application
 * - Determines current app context based on route
 * - Controls when and where prompts appear
 * - Tracks completion status
 */
const TaskPromptController = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [context, setContext] = useState('');
  const [promptEnabled, setPromptEnabled] = useState(true);
  
  // Determine context based on current route
  useEffect(() => {
    const path = location.pathname;
    
    // Map paths to contexts
    if (path === '/' || path === '/dashboard') {
      setContext('dashboard');
    } else if (path.startsWith('/surveys')) {
      setContext('surveys');
    } else if (path.startsWith('/feature-requests')) {
      setContext('feature_requests');
    } else if (path.startsWith('/analytics')) {
      setContext('analytics');
    } else if (path.startsWith('/settings')) {
      setContext('settings');
    } else if (path.startsWith('/profile')) {
      setContext('profile');
    } else {
      setContext('');
    }
  }, [location]);
  
  // Handle task completion
  const handleTaskComplete = (taskId, task) => {
    console.log(`Task completed: ${task.title} (${taskId})`);
    
    // Here you could trigger other actions like:
    // - Show a notification
    // - Update user progress
    // - Unlock new features
    // - Award achievements
  };
  
  // Check if user has opted out of prompts
  useEffect(() => {
    if (!user) return;
    
    // Check user preferences - could be stored in user profile
    const userPreferences = localStorage.getItem(`user_preferences_${user.id}`);
    if (userPreferences) {
      try {
        const { disableTaskPrompts } = JSON.parse(userPreferences);
        setPromptEnabled(!disableTaskPrompts);
      } catch (error) {
        console.error('Error parsing user preferences:', error);
      }
    }
  }, [user]);
  
  // If no user, no context, or prompts disabled, don't render
  if (!user || !context || !promptEnabled) {
    return null;
  }
  
  return (
    <InAppTaskPrompt 
      userId={user.id}
      context={context}
      onTaskComplete={handleTaskComplete}
      enabled={promptEnabled}
    />
  );
};

export default TaskPromptController; 