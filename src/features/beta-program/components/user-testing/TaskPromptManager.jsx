import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, useTheme } from '@mui/material';
import { AddTask as AddTaskIcon } from '@mui/icons-material';
import TaskPrompt from './TaskPrompt';
import taskPromptService from '../../services/TaskPromptService';

/**
 * Component for managing and displaying task prompts to users based on their context
 */
const TaskPromptManager = ({ userId, appContext, maxVisibleTasks = 3 }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandPrompts, setExpandPrompts] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await taskPromptService.getTaskPrompts(userId, appContext);
        setTasks(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching task prompts:', err);
        setError('Failed to load task prompts');
        
        // In development, use mock tasks if API fails
        if (process.env.NODE_ENV === 'development') {
          const mockTasks = await taskPromptService.getMockTasks(appContext);
          setTasks(mockTasks);
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId && appContext) {
      fetchTasks();
    }
  }, [userId, appContext]);

  const handleTaskComplete = (taskId) => {
    // Update local state to mark task as completed
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' } 
          : task
      )
    );
  };

  const handleTaskClose = (taskId, reason) => {
    // Remove task from visible tasks
    setTasks(prevTasks => 
      prevTasks.filter(task => task.id !== taskId)
    );
  };

  const handleStepComplete = (taskId, stepIndex) => {
    // Update local state to mark step as completed
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              steps: task.steps.map((step, idx) => 
                idx === stepIndex 
                  ? { ...step, completed: true } 
                  : step
              ) 
            } 
          : task
      )
    );
  };

  // Only show active tasks that aren't completed or dismissed
  const visibleTasks = tasks.filter(task => 
    task.status !== 'completed' && task.status !== 'dismissed'
  );

  // Limit the number of visible tasks 
  const displayedTasks = expandPrompts 
    ? visibleTasks 
    : visibleTasks.slice(0, maxVisibleTasks);
    
  const hasMoreTasks = visibleTasks.length > maxVisibleTasks;

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error && tasks.length === 0) {
    return null; // Don't show errors to end users
  }

  if (tasks.length === 0) {
    return null; // No tasks to display
  }

  return (
    <Box 
      sx={{ 
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        zIndex: 1000,
        gap: 2,
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
    >
      {displayedTasks.map((task, index) => (
        <TaskPrompt
          key={task.id}
          task={task}
          userId={userId}
          onComplete={handleTaskComplete}
          onClose={handleTaskClose}
          onStepComplete={handleStepComplete}
        />
      ))}
      
      {hasMoreTasks && (
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddTaskIcon />}
          onClick={() => setExpandPrompts(!expandPrompts)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            boxShadow: theme.shadows[6]
          }}
        >
          {expandPrompts 
            ? `Show ${maxVisibleTasks} tasks` 
            : `Show all ${visibleTasks.length} tasks`}
        </Button>
      )}
    </Box>
  );
};

TaskPromptManager.propTypes = {
  userId: PropTypes.string.isRequired,
  appContext: PropTypes.shape({
    route: PropTypes.string,
    page: PropTypes.string,
    feature: PropTypes.string,
    action: PropTypes.string
  }),
  maxVisibleTasks: PropTypes.number
};

export default TaskPromptManager; 