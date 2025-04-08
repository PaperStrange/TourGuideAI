import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Collapse,
  IconButton,
  Stepper, 
  Step, 
  StepLabel, 
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  FormControlLabel,
  Checkbox,
  styled
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  ArrowRight as ArrowRightIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';

import taskPromptService from '../../services/TaskPromptService';

// Styled components
const PromptPaper = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: '350px',
  zIndex: 1000,
  overflow: 'hidden',
  boxShadow: theme.shadows[6],
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease'
}));

const PromptHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  cursor: 'pointer',
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2, 2),
}));

/**
 * InAppTaskPrompt Component
 * 
 * Displays a task prompt with steps and tracks user progress
 * 
 * @param {Object} props
 * @param {string} props.userId - User ID
 * @param {string} props.context - Current app context
 * @param {Function} props.onTaskComplete - Callback when task is complete
 * @param {boolean} props.enabled - Whether the component is enabled
 */
const InAppTaskPrompt = ({ 
  userId,
  context = 'dashboard',
  onTaskComplete,
  enabled = true
}) => {
  // State
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [progress, setProgress] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    rating: 3,
    difficulty: 'moderate',
    comment: '',
    wouldRecommend: false
  });
  
  const { enqueueSnackbar } = useSnackbar();
  
  // Load tasks based on context
  useEffect(() => {
    if (!enabled || !userId || !context) return;
    
    const loadTasks = async () => {
      try {
        setLoading(true);
        // Call service to get tasks for this context
        const contextTasks = await taskPromptService.getTasksForContext(userId, context);
        setTasks(contextTasks);
        
        // If there are tasks and no active task, set the first one as active
        if (contextTasks.length > 0 && !activeTaskId) {
          const firstTask = contextTasks[0];
          setActiveTaskId(firstTask.id);
          setActiveTask(firstTask);
          
          // Check for existing progress or start new
          const existingProgress = taskPromptService.getTaskProgress(userId, firstTask.id);
          if (existingProgress) {
            setProgress(existingProgress);
          } else {
            const newProgress = taskPromptService.startTask(userId, firstTask.id);
            setProgress(newProgress);
          }
          
          // Show prompt if there are tasks
          setExpanded(true);
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        enqueueSnackbar('Failed to load tasks', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [userId, context, enabled, activeTaskId, enqueueSnackbar]);
  
  // Toggle the collapse state
  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Complete a step
  const handleCompleteStep = (stepIndex) => {
    if (!activeTaskId || !userId) return;
    
    try {
      const updatedProgress = taskPromptService.completeStep(userId, activeTaskId, stepIndex);
      setProgress(updatedProgress);
      
      enqueueSnackbar('Step completed!', { variant: 'success' });
      
      // If all steps are completed, open feedback dialog
      if (updatedProgress.completed) {
        setFeedbackOpen(true);
        
        // Call the onTaskComplete callback if provided
        if (onTaskComplete) {
          onTaskComplete(activeTaskId, activeTask);
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
      enqueueSnackbar('Failed to update progress', { variant: 'error' });
    }
  };
  
  // Skip this task
  const handleSkipTask = () => {
    if (!activeTaskId || !userId) return;
    
    try {
      // Open feedback dialog with different context
      setFeedbackData({
        ...feedbackData,
        skipped: true
      });
      setFeedbackOpen(true);
    } catch (error) {
      console.error('Error skipping task:', error);
      enqueueSnackbar('Failed to skip task', { variant: 'error' });
    }
  };
  
  // Handle feedback submission
  const handleSubmitFeedback = () => {
    if (!activeTaskId || !userId) return;
    
    try {
      // If skipped, call abandonTask, otherwise submitTaskFeedback
      if (feedbackData.skipped) {
        taskPromptService.abandonTask(userId, activeTaskId, feedbackData.comment);
      } else {
        taskPromptService.submitTaskFeedback(userId, activeTaskId, feedbackData);
      }
      
      // Reset active task and close feedback dialog
      setFeedbackOpen(false);
      setActiveTaskId(null);
      setActiveTask(null);
      setProgress(null);
      setFeedbackData({
        rating: 3,
        difficulty: 'moderate',
        comment: '',
        wouldRecommend: false,
        skipped: false
      });
      
      // Collapse the prompt
      setExpanded(false);
      
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      enqueueSnackbar('Failed to submit feedback', { variant: 'error' });
    }
  };
  
  // Handle feedback change
  const handleFeedbackChange = (event) => {
    const { name, value, checked } = event.target;
    setFeedbackData(prev => ({
      ...prev,
      [name]: name === 'wouldRecommend' ? checked : value
    }));
  };
  
  // Handle rating change
  const handleRatingChange = (event, newValue) => {
    setFeedbackData(prev => ({
      ...prev,
      rating: newValue
    }));
  };
  
  // If not enabled or no tasks, don't render
  if (!enabled || tasks.length === 0) {
    return null;
  }
  
  return (
    <>
      <PromptPaper>
        <PromptHeader onClick={handleToggleExpand}>
          <Typography variant="subtitle1" fontWeight="medium">
            {activeTask ? activeTask.title : 'Task Guide'}
          </Typography>
          <Box display="flex" alignItems="center">
            {loading && <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />}
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
        </PromptHeader>
        
        <Collapse in={expanded}>
          {activeTask && (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {activeTask.description}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ArrowRightIcon fontSize="small" sx={{ mr: 0.5 }} />
                Estimated time: {activeTask.estimatedTime}
              </Typography>
              
              <Stepper activeStep={progress ? progress.currentStep : 0} orientation="vertical">
                {activeTask.steps.map((step, index) => (
                  <Step key={index}>
                    <StepLabel>
                      <Typography variant="body2">Step {index + 1}</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleCompleteStep(index)}
                          disabled={progress && progress.completedSteps.includes(index)}
                          endIcon={progress && progress.completedSteps.includes(index) ? <CheckCircleIcon /> : null}
                        >
                          {progress && progress.completedSteps.includes(index) ? 'Completed' : 'Mark as Done'}
                        </Button>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
              
              <ActionButtons>
                <Button 
                  size="small" 
                  color="inherit" 
                  onClick={handleSkipTask}
                >
                  Skip
                </Button>
                {progress && progress.completed && (
                  <Button 
                    size="small" 
                    color="primary" 
                    variant="contained"
                    onClick={() => setFeedbackOpen(true)}
                  >
                    Complete & Give Feedback
                  </Button>
                )}
              </ActionButtons>
            </Box>
          )}
        </Collapse>
      </PromptPaper>
      
      {/* Feedback Dialog */}
      <Dialog 
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {feedbackData.skipped ? 'Why did you skip this task?' : 'How was your experience?'}
        </DialogTitle>
        <DialogContent>
          {!feedbackData.skipped && (
            <>
              <Box sx={{ mb: 3, mt: 1 }}>
                <Typography component="legend" variant="subtitle2" gutterBottom>
                  How would you rate this task?
                </Typography>
                <Rating
                  name="task-rating"
                  value={feedbackData.rating}
                  onChange={handleRatingChange}
                  precision={0.5}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography component="legend" variant="subtitle2" gutterBottom>
                  How difficult was this task?
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="difficulty"
                  value={feedbackData.difficulty}
                  onChange={handleFeedbackChange}
                  SelectProps={{
                    native: true,
                  }}
                  variant="outlined"
                  size="small"
                >
                  <option value="very_easy">Very Easy</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="difficult">Difficult</option>
                  <option value="very_difficult">Very Difficult</option>
                </TextField>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackData.wouldRecommend}
                      onChange={handleFeedbackChange}
                      name="wouldRecommend"
                    />
                  }
                  label="I would recommend this task to other users"
                />
              </Box>
            </>
          )}
          
          <TextField
            fullWidth
            label={feedbackData.skipped ? "Why did you skip this task?" : "Additional comments"}
            name="comment"
            value={feedbackData.comment}
            onChange={handleFeedbackChange}
            multiline
            rows={4}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmitFeedback} color="primary" variant="contained">
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InAppTaskPrompt; 