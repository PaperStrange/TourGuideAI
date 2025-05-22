import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  BarChart as BarChartIcon,
  Group as GroupIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import userSegmentService from '../../services/UserSegmentService';

// In a real application, this would be a real service that communicates with the backend
// For now, we'll create a mock service to simulate the tasks functionality
const mockTaskService = {
  tasks: [
    {
      id: 'task-1',
      title: 'Complete onboarding flow',
      description: 'Go through the entire onboarding process and set up your profile.',
      segmentId: 'new-users',
      status: 'active',
      priority: 'high',
      dueDate: '2025-04-30',
      createdAt: '2025-04-05',
      steps: [
        'Sign up with a new account',
        'Enter beta code when prompted',
        'Complete profile setup',
        'Set notification preferences',
        'Review welcome screen'
      ],
      completions: 78,
      totalAssigned: 203,
      averageTimeMinutes: 8.5
    },
    {
      id: 'task-2',
      title: 'Explore map functionality',
      description: 'Test the map features including route planning and points of interest.',
      segmentId: 'travel-enthusiasts',
      status: 'active',
      priority: 'medium',
      dueDate: '2025-05-15',
      createdAt: '2025-04-08',
      steps: [
        'Navigate to the Map page',
        'Search for a destination',
        'Create a multi-stop route',
        'Explore points of interest nearby',
        'Save the route to your profile'
      ],
      completions: 42,
      totalAssigned: 156,
      averageTimeMinutes: 12.3
    },
    {
      id: 'task-3',
      title: 'Test mobile responsiveness',
      description: 'Verify the application works correctly on mobile devices.',
      segmentId: 'mobile-users',
      status: 'active',
      priority: 'high',
      dueDate: '2025-05-10',
      createdAt: '2025-04-10',
      steps: [
        'Access the application on a mobile device',
        'Navigate between all main pages',
        'Test touch interactions on the map',
        'Complete a route planning session',
        'Check profile page layout'
      ],
      completions: 56,
      totalAssigned: 182,
      averageTimeMinutes: 15.7
    }
  ],
  
  async getTasks() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return this.tasks;
  },
  
  async getTaskById(taskId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    const task = this.tasks.find(task => task.id === taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    return task;
  },
  
  async createTask(taskData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newTask = {
      id: `task-${Date.now()}`,
      ...taskData,
      createdAt: new Date().toISOString().split('T')[0],
      completions: 0,
      totalAssigned: 0,
      averageTimeMinutes: 0
    };
    
    this.tasks.push(newTask);
    return newTask;
  },
  
  async updateTask(taskId, taskData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const updatedTask = {
      ...this.tasks[taskIndex],
      ...taskData
    };
    
    this.tasks[taskIndex] = updatedTask;
    return updatedTask;
  },
  
  async deleteTask(taskId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    this.tasks.splice(taskIndex, 1);
    return true;
  },
  
  async getTaskCompletionStats(taskId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const task = await this.getTaskById(taskId);
    
    // Generate mock completion data
    const dailyCompletions = [];
    const startDate = new Date(task.createdAt);
    const endDate = new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyCompletions.push({
        date: new Date(d).toISOString().split('T')[0],
        completions: Math.floor(Math.random() * 15)
      });
    }
    
    // Generate mock step completion data
    const stepCompletions = task.steps.map((step, index) => ({
      step: step,
      completions: task.completions * (1 - (index * 0.1)),
      dropoffRate: index * 10
    }));
    
    return {
      totalCompletions: task.completions,
      completionRate: Math.round((task.completions / task.totalAssigned) * 100),
      averageTimeMinutes: task.averageTimeMinutes,
      dailyCompletions,
      stepCompletions
    };
  }
};

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    segmentId: '',
    status: 'draft',
    priority: 'medium',
    dueDate: '',
    steps: ['']
  });
  const [viewTaskStats, setViewTaskStats] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, segmentsData] = await Promise.all([
        mockTaskService.getTasks(),
        userSegmentService.getSegments()
      ]);
      setTasks(tasksData);
      setSegments(segmentsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load tasks or segments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (task = null) => {
    if (task) {
      // Edit mode
      setEditMode(true);
      setCurrentTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        segmentId: task.segmentId,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        steps: [...task.steps]
      });
    } else {
      // Create mode
      setEditMode(false);
      setCurrentTask(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        title: '',
        description: '',
        segmentId: '',
        status: 'draft',
        priority: 'medium',
        dueDate: tomorrow.toISOString().split('T')[0],
        steps: ['']
      });
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleStepChange = (index, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = value;
    setFormData({
      ...formData,
      steps: updatedSteps
    });
  };
  
  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, '']
    });
  };
  
  const handleRemoveStep = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      steps: updatedSteps.length > 0 ? updatedSteps : ['']
    });
  };
  
  const handleCreateOrUpdateTask = async () => {
    // Filter out empty steps
    const filteredSteps = formData.steps.filter(step => step.trim() !== '');
    
    if (filteredSteps.length === 0) {
      setError('Please add at least one task step.');
      return;
    }
    
    const taskData = {
      ...formData,
      steps: filteredSteps
    };
    
    try {
      if (editMode) {
        await mockTaskService.updateTask(currentTask.id, taskData);
      } else {
        await mockTaskService.createTask(taskData);
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Failed to save task:', error);
      setError('Failed to save task. Please check your inputs and try again.');
    }
  };
  
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await mockTaskService.deleteTask(taskId);
        loadData();
      } catch (error) {
        console.error('Failed to delete task:', error);
        setError('Failed to delete task. Please try again.');
      }
    }
  };
  
  const handleViewTaskStats = async (taskId) => {
    setSelectedTaskId(taskId);
    setViewTaskStats(true);
    setLoadingStats(true);
    
    try {
      const stats = await mockTaskService.getTaskCompletionStats(taskId);
      setTaskStats(stats);
    } catch (error) {
      console.error('Failed to load task statistics:', error);
      setError('Failed to load task statistics. Please try again.');
    } finally {
      setLoadingStats(false);
    }
  };
  
  const handleCloseTaskStats = () => {
    setViewTaskStats(false);
    setSelectedTaskId(null);
    setTaskStats(null);
  };
  
  const getSegmentName = (segmentId) => {
    const segment = segments.find(segment => segment.id === segmentId);
    return segment ? segment.name : 'Unknown Segment';
  };
  
  const getStatusChipColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'completed':
        return 'info';
      case 'archived':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  const getPriorityChipColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };
  
  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Testing Task Manager</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenDialog()}
        >
          Create Task
        </Button>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {tasks.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No testing tasks defined yet. Create your first task to start collecting targeted feedback.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Segment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{task.title}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          {task.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<GroupIcon fontSize="small" />}
                          label={getSegmentName(task.segmentId)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          size="small"
                          color={getStatusChipColor(task.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityChipColor(task.priority)}
                        />
                      </TableCell>
                      <TableCell>{task.dueDate}</TableCell>
                      <TableCell>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={task.totalAssigned ? (task.completions / task.totalAssigned) * 100 : 0}
                                sx={{ height: 8, borderRadius: 5 }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="textSecondary">
                                {task.totalAssigned ? Math.round((task.completions / task.totalAssigned) * 100) : 0}%
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            {task.completions} of {task.totalAssigned} users
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Statistics">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTaskStats(task.id)}
                            sx={{ mr: 1 }}
                          >
                            <BarChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Task">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(task)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Task">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      
      {/* Create/Edit Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Task Title"
                value={formData.title}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="segment-label">User Segment</InputLabel>
                <Select
                  labelId="segment-label"
                  name="segmentId"
                  value={formData.segmentId}
                  onChange={handleInputChange}
                >
                  {segments.map((segment) => (
                    <MenuItem key={segment.id} value={segment.id}>
                      {segment.name} ({segment.size} users)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="dueDate"
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Task Steps</Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {formData.steps.map((step, index) => (
                  <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                    <TextField
                      label={`Step ${index + 1}`}
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      fullWidth
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveStep(index)}
                      disabled={formData.steps.length <= 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                  variant="outlined"
                  size="small"
                >
                  Add Step
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleCreateOrUpdateTask}
            variant="contained"
            disabled={!formData.title || !formData.segmentId}
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Task Stats Dialog */}
      <Dialog
        open={viewTaskStats}
        onClose={handleCloseTaskStats}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTask ? `Statistics for "${selectedTask.title}"` : 'Task Statistics'}
        </DialogTitle>
        <DialogContent>
          {loadingStats ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {!taskStats ? (
                <Alert severity="error">Failed to load task statistics.</Alert>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>Completion Rate</Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress
                          variant="determinate"
                          value={taskStats.completionRate}
                          size={80}
                          thickness={4}
                          sx={{ circle: { strokeLinecap: 'round' } }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="subtitle1" component="div">
                            {`${taskStats.completionRate}%`}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {taskStats.totalCompletions} completions
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>Average Time</Typography>
                      <Typography variant="h4">{taskStats.averageTimeMinutes.toFixed(1)}</Typography>
                      <Typography variant="body2" color="textSecondary">minutes</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>Steps</Typography>
                      <Typography variant="h4">{selectedTask?.steps.length}</Typography>
                      <Typography variant="body2" color="textSecondary">in sequence</Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Step Completion</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Step</TableCell>
                            <TableCell align="right">Completions</TableCell>
                            <TableCell align="right">Dropoff Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {taskStats.stepCompletions.map((stepData, index) => (
                            <TableRow key={index}>
                              <TableCell>{stepData.step}</TableCell>
                              <TableCell align="right">{Math.round(stepData.completions)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${stepData.dropoffRate}%`}
                                  size="small"
                                  color={stepData.dropoffRate > 15 ? 'warning' : 'default'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      This task has been assigned to users in the "{getSegmentName(selectedTask?.segmentId)}" segment.
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaskStats}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskManager; 