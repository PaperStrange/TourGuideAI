import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Collapse,
  LinearProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircleOutline as CheckIcon,
  ArrowForward as ArrowIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import TaskPromptService from '../../services/TaskPromptService';

/**
 * Component for displaying in-app task prompts to guide users through 
 * specific tasks during the beta program
 */
const InAppTaskPrompt = ({ 
  taskId,
  contextId,
  onComplete,
  onDismiss,
  variant = 'standard'
}) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch task data when component mounts
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        let taskData;
        
        // If taskId is provided, get that specific task
        if (taskId) {
          taskData = await TaskPromptService.getTaskById(taskId);
        } 
        // Otherwise, get a contextual task based on the context
        else if (contextId) {
          const contextualTasks = await TaskPromptService.getContextualTasks(contextId);
          taskData = contextualTasks.length > 0 ? contextualTasks[0] : null;
        }
        
        if (taskData) {
          // Find the first incomplete step
          const firstIncompleteStep = taskData.steps.findIndex(step => !step.completed);
          setActiveStep(firstIncompleteStep >= 0 ? firstIncompleteStep : 0);
          setTask(taskData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('Failed to load task. Please try again later.');
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, contextId]);

  // Handle completing a task step
  const handleCompleteStep = async () => {
    if (!task || activeStep >= task.steps.length) return;
    
    try {
      // Mark step as completed in the service
      await TaskPromptService.completeTaskStep(task.id, activeStep);
      
      // Update local state
      const updatedTask = {
        ...task,
        steps: task.steps.map((step, index) => 
          index === activeStep 
            ? { ...step, completed: true, completedAt: new Date().toISOString() }
            : step
        )
      };
      
      setTask(updatedTask);
      
      // Move to next step if available
      if (activeStep < task.steps.length - 1) {
        setActiveStep(activeStep + 1);
        setSnackbar({
          open: true,
          message: 'Step completed!',
          severity: 'success'
        });
      } else {
        // If this was the last step, mark task as complete
        await handleCompleteTask();
      }
    } catch (err) {
      console.error('Error completing step:', err);
      setSnackbar({
        open: true,
        message: 'Failed to complete step. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle completing the entire task
  const handleCompleteTask = async () => {
    try {
      await TaskPromptService.completeTask(task.id);
      setSnackbar({
        open: true,
        message: 'Task completed! Thank you for your contribution to the beta.',
        severity: 'success'
      });
      
      // Notify parent component that task is complete
      if (onComplete) {
        onComplete(task.id);
      }
    } catch (err) {
      console.error('Error completing task:', err);
      setSnackbar({
        open: true,
        message: 'Failed to complete task. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle dismissing the task
  const handleDismiss = async () => {
    try {
      await TaskPromptService.dismissTask(task.id);
      
      if (onDismiss) {
        onDismiss(task.id);
      }
    } catch (err) {
      console.error('Error dismissing task:', err);
      setSnackbar({
        open: true,
        message: 'Failed to dismiss task. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle submitting feedback
  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    
    try {
      await TaskPromptService.submitFeedback(task.id, { feedback });
      setFeedback('');
      setSnackbar({
        open: true,
        message: 'Thank you for your feedback!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // If still loading or task not found
  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 1 }}>Loading task prompt...</Typography>
      </Card>
    );
  }

  if (error || !task) {
    return (
      <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Typography color="error">{error || 'No tasks available for this context.'}</Typography>
      </Card>
    );
  }

  // Calculate overall progress
  const progress = task.steps.filter(step => step.completed).length / task.steps.length * 100;
  const currentStep = task.steps[activeStep];

  // Compact variant just shows a button to open the full task
  if (variant === 'compact' && !expanded) {
    return (
      <Button
        variant="outlined"
        startIcon={<InfoIcon />}
        onClick={() => setExpanded(true)}
        sx={{ mb: 2 }}
      >
        View Current Task
      </Button>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2,
        borderColor: task.priority === 'high' ? 'error.main' : 'primary.main',
        boxShadow: task.priority === 'high' ? 2 : 1
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" color="primary">
            {task.title}
          </Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? 'collapse task' : 'expand task'}
            >
              {expanded ? <CloseIcon /> : <InfoIcon />}
            </IconButton>
          </Box>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mb: 2, height: 8, borderRadius: 1 }} 
        />
        
        <Collapse in={expanded}>
          <Typography variant="body2" mb={2}>
            {task.description}
          </Typography>
          
          <Stepper 
            activeStep={activeStep} 
            orientation="vertical" 
            sx={{ mb: 2 }}
          >
            {task.steps.map((step, index) => (
              <Step key={index} completed={step.completed}>
                <StepLabel>{step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              {currentStep.title}
            </Typography>
            <Typography variant="body2" paragraph>
              {currentStep.description}
            </Typography>
            
            {/* Step actions */}
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleDismiss}
                startIcon={<CloseIcon />}
              >
                Dismiss
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleCompleteStep}
                endIcon={activeStep < task.steps.length - 1 ? <ArrowIcon /> : <CheckIcon />}
              >
                {activeStep < task.steps.length - 1 ? 'Complete Step' : 'Complete Task'}
              </Button>
            </Box>
          </Box>
        </Collapse>
        
        {/* Feedback snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

InAppTaskPrompt.propTypes = {
  taskId: PropTypes.string,
  contextId: PropTypes.string,
  onComplete: PropTypes.func,
  onDismiss: PropTypes.func,
  variant: PropTypes.oneOf(['standard', 'compact'])
};

export default InAppTaskPrompt; 