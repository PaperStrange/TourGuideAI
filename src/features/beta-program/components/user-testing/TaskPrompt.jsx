import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  Collapse,
  Divider,
  Chip,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Feedback as FeedbackIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ExpandMoreButton = styled(IconButton)(({ theme, expanded }) => ({
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const PriorityChip = styled(Chip)(({ theme, priority }) => {
  const colors = {
    high: { bg: theme.palette.error.light, color: theme.palette.error.contrastText },
    medium: { bg: theme.palette.warning.light, color: theme.palette.warning.contrastText },
    low: { bg: theme.palette.success.light, color: theme.palette.success.contrastText }
  };
  
  return {
    backgroundColor: colors[priority]?.bg || theme.palette.grey[300],
    color: colors[priority]?.color || theme.palette.text.primary,
    fontWeight: 'bold',
    fontSize: '0.7rem'
  };
});

/**
 * Displays an individual task prompt with interactive elements
 * for completing steps, marking the task as complete, and providing feedback
 */
const TaskPrompt = ({ task, onComplete, onStepComplete, onDismiss, onFeedback }) => {
  const [expanded, setExpanded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  
  // Calculate progress percentage
  const totalSteps = task.steps?.length || 0;
  const completedSteps = task.steps?.filter(step => step.completed).length || 0;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  // Toggle expanded view
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  // Mark a step as complete
  const handleStepComplete = (stepIndex) => {
    onStepComplete(task.id, stepIndex);
  };
  
  // Mark the entire task as complete
  const handleTaskComplete = () => {
    onComplete(task.id);
  };
  
  // Dismiss the task
  const handleDismiss = () => {
    onDismiss(task.id);
  };
  
  // Open feedback dialog
  const openFeedbackDialog = () => {
    setFeedbackRating(0);
    setFeedbackComments('');
    setFeedbackOpen(true);
  };
  
  // Close feedback dialog
  const closeFeedbackDialog = () => {
    setFeedbackOpen(false);
  };
  
  // Submit feedback
  const submitFeedback = () => {
    onFeedback(task.id, {
      rating: feedbackRating,
      comments: feedbackComments,
      timestamp: new Date().toISOString()
    });
    closeFeedbackDialog();
  };
  
  // Render priority chip with appropriate color
  const renderPriorityChip = () => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'success'
    };
    
    return (
      <Chip 
        size="small" 
        color={colors[task.priority] || 'default'} 
        label={task.priority.toUpperCase()} 
      />
    );
  };

  return (
    <Card sx={{ mb: 2, borderLeft: 5, borderColor: task.priority === 'high' ? 'error.main' : task.priority === 'medium' ? 'warning.main' : 'success.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h2">
            {task.title}
          </Typography>
          <Box>
            {renderPriorityChip()}
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {task.description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip 
            size="small" 
            label={task.category.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')} 
            sx={{ mr: 1 }}
          />
          
          <Box sx={{ flexGrow: 1, mx: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          <Typography variant="caption">
            {completedSteps}/{totalSteps} steps
          </Typography>
          
          <IconButton 
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
            size="small"
            sx={{ ml: 1 }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Steps to Complete:
          </Typography>
          
          <List dense disablePadding>
            {task.steps?.map((step, index) => (
              <ListItem key={index} disableGutters>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {step.completed ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <Checkbox
                      icon={<RadioButtonUncheckedIcon />}
                      checkedIcon={<CheckCircleIcon />}
                      onClick={() => handleStepComplete(index)}
                      disabled={task.completed || task.dismissed}
                    />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={step.title}
                  secondary={step.description}
                  sx={{
                    textDecoration: step.completed ? 'line-through' : 'none',
                    color: step.completed ? 'text.disabled' : 'inherit'
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            {task.completed ? (
              <Button
                variant="contained"
                color="primary"
                onClick={openFeedbackDialog}
              >
                Provide Feedback
              </Button>
            ) : task.dismissed ? (
              <Typography variant="body2" color="text.secondary">
                Task dismissed
              </Typography>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleDismiss}
                  startIcon={<CloseIcon />}
                  sx={{ mr: 1 }}
                >
                  Dismiss
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleTaskComplete}
                  disabled={progressPercentage < 100}
                  startIcon={<CheckCircleIcon />}
                >
                  Mark Complete
                </Button>
              </>
            )}
          </Box>
        </Collapse>
      </CardContent>
      
      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onClose={closeFeedbackDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Provide Feedback
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Your feedback helps us improve the application. Please rate your experience with this task:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Rating
              name="task-rating"
              value={feedbackRating}
              onChange={(event, newValue) => {
                setFeedbackRating(newValue);
              }}
              size="large"
            />
          </Box>
          
          <TextField
            label="Comments"
            multiline
            rows={4}
            fullWidth
            value={feedbackComments}
            onChange={(e) => setFeedbackComments(e.target.value)}
            placeholder="Please share your thoughts on this task..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFeedbackDialog}>
            Cancel
          </Button>
          <Button 
            onClick={submitFeedback} 
            variant="contained" 
            color="primary"
            disabled={feedbackRating === 0}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

TaskPrompt.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    priority: PropTypes.oneOf(['high', 'medium', 'low']),
    estimatedTime: PropTypes.string,
    steps: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      label: PropTypes.string,
      description: PropTypes.string,
      completed: PropTypes.bool
    }))
  }).isRequired,
  onComplete: PropTypes.func.isRequired,
  onStepComplete: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  onFeedback: PropTypes.func.isRequired
};

export default TaskPrompt; 