import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Rating,
  Slider,
  Switch,
  FormControlLabel,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  Screenshot as ScreenshotIcon,
  BugReport as BugIcon,
  AccessibilityNew as AccessibilityIcon,
  Speed as SpeedIcon,
  PlayCircleOutline as PlayIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import analyticsService from '../../services/analytics/AnalyticsService';

/**
 * Component-Level UX Evaluation Tool
 * 
 * A tool for evaluating individual UI components against UX criteria
 * like usability, accessibility, and visual design.
 */
const ComponentEvaluationTool = () => {
  // State for main component
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);
  const [evaluationScores, setEvaluationScores] = useState({});
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedView, setSelectedView] = useState('card');
  const [showAccessibilityIssues, setShowAccessibilityIssues] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [screenCapture, setScreenCapture] = useState(null);
  
  // State for component dialog
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentDescription, setNewComponentDescription] = useState('');
  const [newComponentCategory, setNewComponentCategory] = useState('');
  const [newComponentLocation, setNewComponentLocation] = useState('');
  const [newComponentTags, setNewComponentTags] = useState([]);
  
  // Component categories
  const componentCategories = [
    { id: 'input', name: 'Input Controls' },
    { id: 'navigation', name: 'Navigation' },
    { id: 'display', name: 'Information Display' },
    { id: 'container', name: 'Containers' },
    { id: 'feedback', name: 'User Feedback' },
    { id: 'chart', name: 'Data Visualization' }
  ];
  
  // Available tags for components
  const availableTags = [
    'High Traffic', 'Critical Path', 'Conversion Point', 'Mobile', 
    'Desktop', 'Accessibility Focus', 'New Design', 'User Reported Issues'
  ];

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [componentsData, criteriaData] = await Promise.all([
          analyticsService.getUIComponents(),
          analyticsService.getEvaluationCriteria()
        ]);
        
        setComponents(componentsData);
        setEvaluationCriteria(criteriaData);
        
        if (componentsData.length > 0) {
          setSelectedComponent(componentsData[0]);
          fetchComponentEvaluations(componentsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching component data:', err);
        setError('Failed to load component data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Fetch component evaluations
  const fetchComponentEvaluations = async (componentId) => {
    try {
      const data = await analyticsService.getComponentEvaluations(componentId);
      setEvaluationScores(data);
    } catch (err) {
      console.error('Error fetching component evaluations:', err);
      setError('Failed to load component evaluations. Please try again.');
    }
  };
  
  // Handle component selection
  const handleSelectComponent = (component) => {
    setSelectedComponent(component);
    fetchComponentEvaluations(component.id);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Handle adding a new component
  const handleAddComponent = () => {
    setNewComponentName('');
    setNewComponentDescription('');
    setNewComponentCategory('');
    setNewComponentLocation('');
    setNewComponentTags([]);
    setScreenCapture(null);
    setOpenAddDialog(true);
  };
  
  // Handle saving a new component
  const handleSaveComponent = async () => {
    try {
      const componentData = {
        name: newComponentName,
        description: newComponentDescription,
        categoryId: newComponentCategory,
        location: newComponentLocation,
        tags: newComponentTags,
        screenshot: screenCapture
      };
      
      const newComponent = await analyticsService.createUIComponent(componentData);
      
      setComponents([...components, newComponent]);
      setSelectedComponent(newComponent);
      setOpenAddDialog(false);
      
      // Initialize empty evaluations for the new component
      setEvaluationScores({
        scores: {},
        issues: [],
        recommendations: []
      });
    } catch (err) {
      console.error('Error saving component:', err);
      setError('Failed to save component. Please try again.');
    }
  };
  
  // Handle capturing a screenshot
  const handleCaptureScreenshot = async () => {
    try {
      // Placeholder for actual screenshot capture functionality
      // In a real implementation, this would use a browser API or a library
      console.log('Capturing screenshot...');
      setScreenCapture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    } catch (err) {
      console.error('Error capturing screenshot:', err);
    }
  };
  
  // Handle updating an evaluation score
  const handleUpdateScore = async (criterionId, score) => {
    try {
      if (!selectedComponent) return;
      
      // Update score in local state for immediate feedback
      const updatedScores = {
        ...evaluationScores,
        scores: {
          ...evaluationScores.scores,
          [criterionId]: score
        }
      };
      
      setEvaluationScores(updatedScores);
      
      // Send update to the server
      await analyticsService.updateComponentEvaluation(
        selectedComponent.id,
        criterionId,
        score
      );
    } catch (err) {
      console.error('Error updating score:', err);
      setError('Failed to update score. Please try again.');
    }
  };
  
  // Calculate overall score for a component
  const calculateOverallScore = (component) => {
    if (!evaluationScores.scores || !evaluationCriteria.length) return null;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    evaluationCriteria.forEach(criterion => {
      if (evaluationScores.scores[criterion.id] !== undefined) {
        weightedSum += evaluationScores.scores[criterion.id] * criterion.weight;
        totalWeight += criterion.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null;
  };
  
  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 4.5) return '#4CAF50'; // Excellent - Green
    if (score >= 3.5) return '#8BC34A'; // Good - Light Green
    if (score >= 2.5) return '#FFC107'; // Average - Yellow
    if (score >= 1.5) return '#FF9800'; // Below Average - Orange
    return '#F44336'; // Poor - Red
  };
  
  // Handle filtering by category
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
  };
  
  // Get filtered components based on selected category
  const getFilteredComponents = () => {
    if (selectedCategory === 'all') {
      return components;
    }
    return components.filter(component => component.categoryId === selectedCategory);
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }
  
  // Calculate overall score for the selected component
  const overallScore = selectedComponent ? calculateOverallScore(selectedComponent) : null;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Component UX Evaluation Tool
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddComponent}
          >
            Add Component
          </Button>
        </Box>
      </Box>
      
      {/* Filter controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-filter-label">Filter by Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategory}
                label="Filter by Category"
                onChange={(e) => handleCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {componentCategories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch 
                  checked={showAccessibilityIssues}
                  onChange={() => setShowAccessibilityIssues(prev => !prev)}
                />
              }
              label="Show Accessibility Issues"
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant={selectedView === 'card' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedView('card')}
                sx={{ mr: 1 }}
              >
                Card View
              </Button>
              <Button
                variant={selectedView === 'list' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedView('list')}
              >
                List View
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Main content area */}
      <Grid container spacing={3}>
        {/* Component list */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%' }}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                UI Components
              </Typography>
              
              {getFilteredComponents().length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No components found for the selected filters
                </Typography>
              ) : (
                <List sx={{ mt: 2 }}>
                  {getFilteredComponents().map(component => {
                    const category = componentCategories.find(c => c.id === component.categoryId);
                    
                    return (
                      <ListItem 
                        key={component.id}
                        button
                        selected={selectedComponent?.id === component.id}
                        onClick={() => handleSelectComponent(component)}
                        sx={{ 
                          mb: 1, 
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                            }
                          }
                        }}
                      >
                        <ListItemText
                          primary={component.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {category?.name || 'Uncategorized'}
                              </Typography>
                              {component.location && (
                                <Typography variant="caption" component="div" color="text.secondary">
                                  {component.location}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        
                        {component.accessibilityIssues > 0 && showAccessibilityIssues && (
                          <Tooltip title={`${component.accessibilityIssues} accessibility issues`}>
                            <Chip 
                              icon={<WarningIcon />} 
                              label={component.accessibilityIssues} 
                              size="small"
                              color="error"
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Component details and evaluation */}
        <Grid item xs={12} md={8}>
          {selectedComponent ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{selectedComponent.name}</Typography>
                  <Box display="flex" alignItems="center" mt={0.5}>
                    {selectedComponent.tags && selectedComponent.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
                
                {overallScore !== null && (
                  <Box 
                    sx={{ 
                      bgcolor: getScoreColor(overallScore),
                      color: 'white',
                      borderRadius: '50%',
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">{overallScore}</Typography>
                    <Typography variant="caption">/ 5</Typography>
                  </Box>
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
                {selectedComponent.description || 'No description provided.'}
              </Typography>
              
              {selectedComponent.location && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Location:</strong> {selectedComponent.location}
                </Typography>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                sx={{ mb: 2 }}
              >
                <Tab label="Evaluation" />
                <Tab label="Issues" />
                <Tab label="Screenshot" />
                <Tab label="History" />
              </Tabs>
              
              {currentTab === 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Component Evaluation
                  </Typography>
                  
                  {evaluationCriteria.length > 0 ? (
                    <Grid container spacing={3}>
                      {evaluationCriteria.map(criterion => (
                        <Grid item xs={12} key={criterion.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography variant="subtitle2">
                                    {criterion.name}
                                    {criterion.weight > 1 && (
                                      <Chip 
                                        label={`${criterion.weight}x`} 
                                        size="small" 
                                        color="primary"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {criterion.description}
                                  </Typography>
                                </Box>
                                
                                <Box>
                                  <Rating 
                                    value={evaluationScores.scores?.[criterion.id] || 0}
                                    onChange={(e, newValue) => handleUpdateScore(criterion.id, newValue)}
                                    precision={0.5}
                                  />
                                </Box>
                              </Box>
                              
                              {criterion.examples && (
                                <Box mt={2}>
                                  <Typography variant="caption" color="text.secondary">
                                    Examples:
                                  </Typography>
                                  <Typography variant="body2">
                                    {criterion.examples}
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                      No evaluation criteria defined
                    </Typography>
                  )}
                </Box>
              )}
              
              {currentTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Issues and Recommendations
                  </Typography>
                  
                  {evaluationScores.issues?.length > 0 ? (
                    <List>
                      {evaluationScores.issues.map((issue, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            mb: 1, 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <ListItemIcon>
                            {issue.type === 'accessibility' ? (
                              <AccessibilityIcon color="error" />
                            ) : issue.type === 'usability' ? (
                              <BugIcon color="warning" />
                            ) : (
                              <InfoIcon color="info" />
                            )}
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={issue.title}
                            secondary={
                              <>
                                <Typography variant="body2" component="span">
                                  {issue.description}
                                </Typography>
                                
                                {issue.recommendation && (
                                  <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                    Recommendation: {issue.recommendation}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            <Chip 
                              label={issue.severity} 
                              size="small"
                              color={
                                issue.severity === 'Critical' ? 'error' :
                                issue.severity === 'High' ? 'warning' :
                                issue.severity === 'Medium' ? 'info' : 'default'
                              }
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      No issues found for this component
                    </Alert>
                  )}
                </Box>
              )}
              
              {currentTab === 2 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Component Screenshot
                  </Typography>
                  
                  {selectedComponent.screenshot ? (
                    <Box mt={2}>
                      <img 
                        src={selectedComponent.screenshot} 
                        alt={selectedComponent.name}
                        style={{ 
                          maxWidth: '100%', 
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  ) : (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center"
                      sx={{ 
                        height: 200, 
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography color="text.secondary" paragraph>
                        No screenshot available
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<ScreenshotIcon />}
                      >
                        Capture Screenshot
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
              
              {currentTab === 3 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Evaluation History
                  </Typography>
                  
                  {evaluationScores.history?.length > 0 ? (
                    <List>
                      {evaluationScores.history.map((entry, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            mb: 1, 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center">
                                <Typography variant="body1">
                                  {new Date(entry.date).toLocaleDateString()}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ ml: 1 }}
                                >
                                  {new Date(entry.date).toLocaleTimeString()}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box mt={1}>
                                <Typography variant="body2">
                                  {entry.changes.map((change, i) => (
                                    <Box key={i} mb={0.5}>
                                      {change.criterion}: {change.oldValue} → {change.newValue}
                                    </Box>
                                  ))}
                                </Typography>
                                {entry.comment && (
                                  <Typography variant="body2" color="text.secondary" mt={1}>
                                    Comment: {entry.comment}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                      No evaluation history available
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          ) : (
            <Paper 
              sx={{ 
                p: 5, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Component Selected
              </Typography>
              <Typography color="text.secondary" paragraph>
                Select a component from the list to view and evaluate it
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleAddComponent}
                sx={{ mt: 2 }}
              >
                Add New Component
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>
      
      {/* Dialog for adding a new component */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add New Component
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                margin="dense"
                label="Component Name"
                fullWidth
                variant="outlined"
                value={newComponentName}
                onChange={(e) => setNewComponentName(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel id="component-category-label">Category</InputLabel>
                <Select
                  labelId="component-category-label"
                  value={newComponentCategory}
                  label="Category"
                  onChange={(e) => setNewComponentCategory(e.target.value)}
                >
                  {componentCategories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                margin="dense"
                label="Location (Path or URL)"
                fullWidth
                variant="outlined"
                value={newComponentLocation}
                onChange={(e) => setNewComponentLocation(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={newComponentDescription}
                onChange={(e) => setNewComponentDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Autocomplete
                multiple
                options={availableTags}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Tags" 
                    variant="outlined"
                  />
                )}
                value={newComponentTags}
                onChange={(event, newValue) => {
                  setNewComponentTags(newValue);
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Component Screenshot
              </Typography>
              
              {screenCapture ? (
                <Box position="relative">
                  <img 
                    src={screenCapture} 
                    alt="Component screenshot"
                    style={{ 
                      width: '100%', 
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 4
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'background.paper'
                    }}
                    onClick={() => setScreenCapture(null)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center"
                  sx={{ 
                    height: 200, 
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography color="text.secondary" paragraph>
                    No screenshot captured
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<ScreenshotIcon />}
                    onClick={handleCaptureScreenshot}
                  >
                    Capture Screenshot
                  </Button>
                </Box>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                A screenshot helps identify the component and its context within the UI.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveComponent}
            variant="contained"
            disabled={!newComponentName || !newComponentCategory}
          >
            Add Component
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComponentEvaluationTool; 