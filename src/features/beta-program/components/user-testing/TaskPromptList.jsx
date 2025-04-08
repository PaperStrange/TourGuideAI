import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  IconButton,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  LinearProgress,
  Alert,
  CircularProgress,
  Grid,
  Collapse
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { TaskPromptService } from '../../services/TaskPromptService';
import { AuthContext } from '../../../../context/AuthContext';

const taskPromptService = new TaskPromptService();

/**
 * Component for displaying and managing user testing task prompts
 */
const TaskPromptList = () => {
  // State
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [categories, setCategories] = useState([]);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [activeFeedbackTask, setActiveFeedbackTask] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  // Fetch the current user from AuthContext
  const { currentUser } = React.useContext(AuthContext);

  // Function to fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        status: activeTab === 0 ? 'active' : activeTab === 1 ? 'completed' : 'dismissed',
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        search: searchValue || undefined
      };
      
      const tasksData = await taskPromptService.getTaskPrompts(filters);
      
      // Extract unique categories for filter dropdown
      const uniqueCategories = [...new Set(tasksData.map(task => task.category))];
      setCategories(uniqueCategories);
      
      // Sort tasks based on the selected sorting method
      const sortedTasks = sortTasks(tasksData, sortBy);
      setTasks(sortedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, priorityFilter, categoryFilter, searchValue, sortBy]);

  // Fetch tasks on component mount and when filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Toggle filter panel
  const toggleFilterPanel = () => {
    setFilterOpen(!filterOpen);
  };

  // Handle search input changes
  const handleSearchChange = (event) => {
    setSearchValue(event.target.value);
  };

  // Handle search submission
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchTasks();
  };

  // Handle category filter changes
  const handleCategoryChange = (event) => {
    setCategoryFilter(event.target.value);
  };

  // Handle priority filter changes
  const handlePriorityChange = (event) => {
    setPriorityFilter(event.target.value);
  };

  // Handle sort selection changes
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchValue('');
    setCategoryFilter('');
    setPriorityFilter('');
    setSortBy('priority');
  };

  // Sort tasks based on selected criteria
  const sortTasks = (taskList, sortCriteria) => {
    const tasksCopy = [...taskList];
    
    switch (sortCriteria) {
      case 'priority':
        return tasksCopy.sort((a, b) => {
          const priorityValues = { high: 3, medium: 2, low: 1 };
          return priorityValues[b.priority] - priorityValues[a.priority];
        });
      case 'alphabetical':
        return tasksCopy.sort((a, b) => a.title.localeCompare(b.title));
      case 'progress':
        return tasksCopy.sort((a, b) => {
          const aCompleted = a.steps.filter(step => step.completed).length;
          const bCompleted = b.steps.filter(step => step.completed).length;
          const aProgress = aCompleted / a.steps.length;
          const bProgress = bCompleted / b.steps.length;
          return bProgress - aProgress;
        });
      default:
        return tasksCopy;
    }
  };

  // Calculate task completion progress
  const getTaskProgress = (task) => {
    if (!task.steps || task.steps.length === 0) return 100;
    const completedSteps = task.steps.filter(step => step.completed).length;
    return (completedSteps / task.steps.length) * 100;
  };

  // Mark a task as complete
  const completeTask = async (taskId) => {
    try {
      await taskPromptService.completeTask(currentUser.id, taskId);
      fetchTasks();
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to mark task as complete. Please try again.');
    }
  };

  // Mark a specific step in a task as complete
  const completeStep = async (taskId, stepIndex) => {
    try {
      await taskPromptService.completeTaskStep(currentUser.id, taskId, stepIndex);
      fetchTasks();
    } catch (err) {
      console.error('Error completing step:', err);
      setError('Failed to mark step as complete. Please try again.');
    }
  };

  // Dismiss a task
  const dismissTask = async (taskId) => {
    try {
      await taskPromptService.dismissTask(currentUser.id, taskId);
      fetchTasks();
    } catch (err) {
      console.error('Error dismissing task:', err);
      setError('Failed to dismiss task. Please try again.');
    }
  };

  // Open feedback dialog
  const openFeedbackDialog = (task) => {
    setActiveFeedbackTask(task);
    setFeedbackRating(0);
    setFeedbackComment('');
    setFeedbackDialogOpen(true);
  };

  // Close feedback dialog
  const closeFeedbackDialog = () => {
    setFeedbackDialogOpen(false);
    setActiveFeedbackTask(null);
  };

  // Submit feedback for a task
  const submitFeedback = async () => {
    if (!activeFeedbackTask) return;
    
    setSubmittingFeedback(true);
    
    try {
      await taskPromptService.submitTaskFeedback(currentUser.id, activeFeedbackTask.id, {
        rating: feedbackRating,
        comments: feedbackComment,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
      
      closeFeedbackDialog();
      fetchTasks();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Render priority chip
  const renderPriorityChip = (priority) => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'success'
    };
    
    return (
      <Chip 
        size="small" 
        color={colors[priority] || 'default'} 
        label={priority.toUpperCase()} 
        sx={{ ml: 1 }}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 3, p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Testing Tasks
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Active" />
          <Tab label="Completed" />
          <Tab label="Dismissed" />
        </Tabs>
      </Paper>
      
      {/* Search and filters */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search tasks..."
            value={searchValue}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            size="small"
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            sx={{ ml: 1 }}
          >
            Search
          </Button>
          <IconButton onClick={toggleFilterPanel} sx={{ ml: 1 }}>
            <FilterListIcon />
          </IconButton>
        </Box>
        
        <Collapse in={filterOpen}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={handleCategoryChange}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={handlePriorityChange}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort By"
                >
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="alphabetical">Alphabetical</MenuItem>
                  <MenuItem value="progress">Progress</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={resetFilters}
              startIcon={<CloseIcon />}
            >
              Reset Filters
            </Button>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : tasks.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            {activeTab === 0 ? 'No active tasks available.' : 
             activeTab === 1 ? 'You haven\'t completed any tasks yet.' : 
             'You haven\'t dismissed any tasks.'}
          </Typography>
        </Paper>
      ) : (
        <List>
          {tasks.map(task => (
            <Paper key={task.id} sx={{ mb: 2, overflow: 'hidden' }}>
              <ListItem 
                button 
                onClick={() => toggleTaskExpansion(task.id)}
                sx={{ 
                  borderLeft: '4px solid',
                  borderLeftColor: task.priority === 'high' ? 'error.main' : 
                                 task.priority === 'medium' ? 'warning.main' : 'success.main'
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1">{task.title}</Typography>
                      {renderPriorityChip(task.priority)}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {task.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Chip 
                          size="small" 
                          label={task.category.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                          sx={{ mr: 1 }}
                        />
                        <Box sx={{ flexGrow: 1, ml: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={getTaskProgress(task)} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {Math.round(getTaskProgress(task))}%
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {expandedTasks[task.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemSecondaryAction>
              </ListItem>
              
              <Collapse in={expandedTasks[task.id] || false}>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Steps to Complete:
                  </Typography>
                  
                  <List dense>
                    {task.steps.map((step, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={step.title}
                          secondary={step.description}
                          sx={{
                            textDecoration: step.completed ? 'line-through' : 'none',
                            color: step.completed ? 'text.disabled' : 'inherit'
                          }}
                        />
                        {activeTab === 0 && !step.completed && (
                          <ListItemSecondaryAction>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => completeStep(task.id, index)}
                            >
                              Mark Complete
                            </Button>
                          </ListItemSecondaryAction>
                        )}
                        {step.completed && (
                          <ListItemSecondaryAction>
                            <CheckCircleIcon color="success" />
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    ))}
                  </List>
                  
                  {activeTab === 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => dismissTask(task.id)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => completeTask(task.id)}
                        disabled={getTaskProgress(task) < 100}
                      >
                        {getTaskProgress(task) < 100 ? 'Complete All Steps First' : 'Mark Complete'}
                      </Button>
                    </Box>
                  )}
                  
                  {activeTab === 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => openFeedbackDialog(task)}
                      >
                        Provide Feedback
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))}
        </List>
      )}
      
      {/* Feedback Dialog */}
      <Dialog 
        open={feedbackDialogOpen} 
        onClose={closeFeedbackDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {activeFeedbackTask ? `Feedback for: ${activeFeedbackTask.title}` : 'Provide Feedback'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
            Your feedback helps us improve the application. Please rate your experience with this task.
          </Typography>
          
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="legend">Rating</Typography>
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
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Please share your thoughts on this task..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFeedbackDialog} disabled={submittingFeedback}>
            Cancel
          </Button>
          <Button 
            onClick={submitFeedback} 
            variant="contained" 
            color="primary"
            disabled={feedbackRating === 0 || submittingFeedback}
          >
            {submittingFeedback ? <CircularProgress size={24} /> : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskPromptList; 