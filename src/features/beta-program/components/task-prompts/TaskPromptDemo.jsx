import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Map as MapIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { InAppTaskPrompt } from './index';

/**
 * Demo component showing various ways task prompts can be 
 * integrated into different parts of the application
 */
const TaskPromptDemo = () => {
  const [showTaskPrompt, setShowTaskPrompt] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [demoContext, setDemoContext] = useState('map_navigation');
  
  // Sample task IDs for demonstration
  const availableTasks = [
    { id: 'task-1', name: 'Create First Tour' },
    { id: 'task-2', name: 'Customize Profile' },
    { id: 'task-3', name: 'Explore Map Features' },
    { id: 'task-4', name: 'Submit Feedback' }
  ];
  
  // Sample contexts for demonstration
  const availableContexts = [
    { id: 'map_navigation', name: 'Map Navigation' },
    { id: 'profile_setup', name: 'Profile Setup' },
    { id: 'tour_creation', name: 'Tour Creation' },
    { id: 'feedback_collection', name: 'Feedback Collection' }
  ];
  
  const handleTaskComplete = (taskId) => {
    console.log('Task completed:', taskId);
    setShowTaskPrompt(false);
  };
  
  const handleTaskDismiss = (taskId) => {
    console.log('Task dismissed:', taskId);
    setShowTaskPrompt(false);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Task Prompt System Demo
      </Typography>
      
      <Typography variant="body1" paragraph>
        This demo shows how to use the task prompt system to guide users through specific tasks in the beta program.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Display Task Prompt by ID
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="task-select-label">Select Task</InputLabel>
                <Select
                  labelId="task-select-label"
                  value={selectedTask}
                  label="Select Task"
                  onChange={(e) => setSelectedTask(e.target.value)}
                >
                  {availableTasks.map(task => (
                    <MenuItem key={task.id} value={task.id}>
                      {task.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button 
                variant="contained" 
                onClick={() => setShowTaskPrompt(true)}
                disabled={!selectedTask}
                fullWidth
              >
                Show Task Prompt
              </Button>
            </Box>
            
            {showTaskPrompt && selectedTask && (
              <Box sx={{ mt: 3 }}>
                <InAppTaskPrompt
                  taskId={selectedTask}
                  onComplete={handleTaskComplete}
                  onDismiss={handleTaskDismiss}
                  variant="card"
                />
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Context-Based Task Prompts
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="context-select-label">Simulate Context</InputLabel>
                <Select
                  labelId="context-select-label"
                  value={demoContext}
                  label="Simulate Context"
                  onChange={(e) => setDemoContext(e.target.value)}
                >
                  {availableContexts.map(context => (
                    <MenuItem key={context.id} value={context.id}>
                      {context.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button 
                variant="contained" 
                color="secondary"
                fullWidth
              >
                Simulate Context Change
              </Button>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {demoContext === 'map_navigation' && (
                      <>
                        <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Map Navigation
                      </>
                    )}
                    {demoContext === 'profile_setup' && (
                      <>
                        <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Profile Setup
                      </>
                    )}
                    {demoContext === 'tour_creation' && (
                      <>
                        <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Tour Creation
                      </>
                    )}
                    {demoContext === 'feedback_collection' && (
                      <>
                        <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Feedback Collection
                      </>
                    )}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    This is a simulated context. In a real application, the context would be determined by the current page, user actions, and application state.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small">Action 1</Button>
                  <Button size="small">Action 2</Button>
                </CardActions>
              </Card>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Task prompts will appear based on this context
                </Typography>
                
                {demoContext === 'map_navigation' && (
                  <InAppTaskPrompt
                    contextId={demoContext}
                    onComplete={handleTaskComplete}
                    onDismiss={handleTaskDismiss}
                    variant="card"
                  />
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Integration Options
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable Task Prompts Globally"
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show Task Prompts for New Features"
              />
              
              <FormControlLabel
                control={<Switch />}
                label="Show Task Prompts for Completed Features"
              />
              
              <TextField
                label="Maximum Concurrent Prompts"
                type="number"
                defaultValue={1}
                InputProps={{ inputProps: { min: 1, max: 5 } }}
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TaskPromptDemo; 