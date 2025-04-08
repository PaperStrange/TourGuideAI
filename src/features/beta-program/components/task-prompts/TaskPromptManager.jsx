import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Portal } from '@mui/material';
import { useLocation } from 'react-router-dom';
import TaskPromptService from '../../services/TaskPromptService';
import InAppTaskPrompt from './InAppTaskPrompt';
import { AuthContext } from '../../../../contexts/AuthContext';

/**
 * Manager component that coordinates the display of task prompts 
 * throughout the application based on user context and behavior
 */
const TaskPromptManager = ({ 
  disabled = false, 
  maxPrompts = 1,
  position = 'bottom-right' 
}) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Positions for the task prompts
  const positionStyles = {
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'center-right': { top: '50%', right: 20, transform: 'translateY(-50%)' },
    'center-left': { top: '50%', left: 20, transform: 'translateY(-50%)' }
  };

  // Get current context from location and user
  const getCurrentContext = () => {
    const path = location.pathname;
    const currentFeature = path.split('/')[1] || 'home';
    const currentSection = path.split('/')[2] || 'main';
    
    return {
      path,
      feature: currentFeature,
      section: currentSection,
      userId: user?.id,
      userRole: user?.role,
      userPreferences: user?.preferences,
      timestamp: new Date().toISOString()
    };
  };

  // Get relevant task prompts based on current context
  useEffect(() => {
    const fetchTaskPrompts = async () => {
      if (disabled || !user) {
        setPrompts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const context = getCurrentContext();
        const tasks = await TaskPromptService.getTasksForContext(context);
        
        // Filter tasks based on priority and limit
        const sortedTasks = tasks
          .sort((a, b) => b.priority - a.priority)
          .slice(0, maxPrompts);
        
        setPrompts(sortedTasks);
      } catch (error) {
        console.error('Error fetching task prompts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskPrompts();
    
    // Poll for new task prompts every minute
    const intervalId = setInterval(fetchTaskPrompts, 60000);
    
    return () => clearInterval(intervalId);
  }, [location.pathname, user, disabled, maxPrompts]);

  // Handle task completion
  const handleTaskComplete = async (taskId) => {
    setPrompts(prev => prev.filter(task => task.id !== taskId));
  };

  // Handle task dismissal
  const handleTaskDismiss = async (taskId) => {
    setPrompts(prev => prev.filter(task => task.id !== taskId));
  };

  if (loading || disabled || prompts.length === 0) {
    return null;
  }

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          ...positionStyles[position]
        }}
      >
        {prompts.map(task => (
          <InAppTaskPrompt
            key={task.id}
            taskId={task.id}
            onComplete={handleTaskComplete}
            onDismiss={handleTaskDismiss}
            variant="card"
          />
        ))}
      </Box>
    </Portal>
  );
};

TaskPromptManager.propTypes = {
  disabled: PropTypes.bool,
  maxPrompts: PropTypes.number,
  position: PropTypes.oneOf([
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
    'center-right',
    'center-left'
  ])
};

export default TaskPromptManager; 