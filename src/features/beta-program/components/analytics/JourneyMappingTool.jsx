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
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Share as ShareIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import AnalyticsService from '../../services/AnalyticsService';
import FigmaService from '../../services/FigmaService';

/**
 * Journey Mapping Tool Component
 * 
 * A comprehensive tool for creating, visualizing, and analyzing user journeys
 * with Figma integration for design collaboration.
 */
const JourneyMappingTool = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedStage, setSelectedStage] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [figmaProjects, setFigmaProjects] = useState([]);
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaLinked, setFigmaLinked] = useState(false);
  const [openFigmaDialog, setOpenFigmaDialog] = useState(false);
  const [selectedFigmaProject, setSelectedFigmaProject] = useState('');
  const [userSegments, setUserSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [showEmotionLabels, setShowEmotionLabels] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newJourneyName, setNewJourneyName] = useState('');
  const [newJourneyDescription, setNewJourneyDescription] = useState('');

  // Fetch journeys and user segments on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [journeysData, segmentsData] = await Promise.all([
          AnalyticsService.getUserJourneys(),
          AnalyticsService.getUserSegments()
        ]);
        setJourneys(journeysData);
        setUserSegments(segmentsData);
        if (journeysData.length > 0) {
          setSelectedJourney(journeysData[0]);
        }
      } catch (err) {
        console.error('Error fetching journey data:', err);
        setError('Failed to load journey data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check Figma connection status
  useEffect(() => {
    const checkFigmaConnection = async () => {
      try {
        setFigmaLoading(true);
        const status = await FigmaService.checkConnectionStatus();
        setFigmaLinked(status.connected);
        if (status.connected) {
          const projects = await FigmaService.getProjects();
          setFigmaProjects(projects);
        }
      } catch (err) {
        console.error('Error checking Figma connection:', err);
      } finally {
        setFigmaLoading(false);
      }
    };

    checkFigmaConnection();
  }, []);

  // Handle drag and drop of journey stages
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const reorderedJourney = { ...selectedJourney };
    const [removed] = reorderedJourney.stages.splice(result.source.index, 1);
    reorderedJourney.stages.splice(result.destination.index, 0, removed);
    
    setSelectedJourney(reorderedJourney);
    
    // Save the reordered journey
    saveJourney(reorderedJourney);
  };

  // Save journey changes to the server
  const saveJourney = async (journey) => {
    try {
      await AnalyticsService.updateUserJourney(journey.id, journey);
      
      // Update the journeys list
      setJourneys(prev => prev.map(j => j.id === journey.id ? journey : j));
    } catch (err) {
      console.error('Error saving journey:', err);
      setError('Failed to save journey changes. Please try again.');
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle open menu for journey actions
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle close menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle Figma dialog open
  const handleOpenFigmaDialog = () => {
    setOpenFigmaDialog(true);
    handleMenuClose();
  };

  // Handle Figma dialog close
  const handleCloseFigmaDialog = () => {
    setOpenFigmaDialog(false);
  };

  // Handle linking to Figma project
  const handleLinkFigma = async () => {
    if (!selectedFigmaProject) return;
    
    try {
      await FigmaService.linkJourneyToFigma(selectedJourney.id, selectedFigmaProject);
      
      // Update the journey with Figma link
      const updatedJourney = { 
        ...selectedJourney, 
        figmaProjectId: selectedFigmaProject 
      };
      
      setSelectedJourney(updatedJourney);
      saveJourney(updatedJourney);
      setOpenFigmaDialog(false);
      
      // Show success indication
      setFigmaLinked(true);
    } catch (err) {
      console.error('Error linking to Figma:', err);
      setError('Failed to link Figma project. Please try again.');
    }
  };

  // Handle selecting a journey
  const handleSelectJourney = (journey) => {
    setSelectedJourney(journey);
    
    // Check if this journey has Figma link
    setFigmaLinked(!!journey.figmaProjectId);
  };

  // Handle creating a new journey
  const handleCreateJourney = async () => {
    if (!newJourneyName.trim()) return;
    
    try {
      const newJourney = {
        name: newJourneyName,
        description: newJourneyDescription,
        stages: [],
        touchpoints: [],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      const createdJourney = await AnalyticsService.createUserJourney(newJourney);
      
      setJourneys([...journeys, createdJourney]);
      setSelectedJourney(createdJourney);
      setOpenCreateDialog(false);
      setNewJourneyName('');
      setNewJourneyDescription('');
    } catch (err) {
      console.error('Error creating journey:', err);
      setError('Failed to create new journey. Please try again.');
    }
  };

  // Handle adding a new stage to the journey
  const handleAddStage = async () => {
    if (!selectedJourney) return;
    
    const newStage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      description: 'Add a description for this stage',
      emotionScore: 0,
      touchpoints: [],
      metrics: [],
      painPoints: []
    };
    
    const updatedJourney = { 
      ...selectedJourney,
      stages: [...selectedJourney.stages, newStage],
      lastModified: new Date().toISOString()
    };
    
    setSelectedJourney(updatedJourney);
    saveJourney(updatedJourney);
  };

  // Handle editing a stage
  const handleEditStage = (stage) => {
    setSelectedStage(stage);
  };

  // Handle deleting a stage
  const handleDeleteStage = async (stageId) => {
    if (!selectedJourney) return;
    
    const updatedJourney = { 
      ...selectedJourney,
      stages: selectedJourney.stages.filter(stage => stage.id !== stageId),
      lastModified: new Date().toISOString()
    };
    
    setSelectedJourney(updatedJourney);
    saveJourney(updatedJourney);
  };

  // Handle syncing with Figma
  const handleSyncFigma = async () => {
    if (!selectedJourney?.figmaProjectId) return;
    
    try {
      setFigmaLoading(true);
      await FigmaService.syncJourneyWithFigma(selectedJourney.id);
      
      // Refresh journey data
      const updatedJourney = await AnalyticsService.getUserJourneyById(selectedJourney.id);
      setSelectedJourney(updatedJourney);
      
      // Update the journeys list
      setJourneys(prev => prev.map(j => j.id === updatedJourney.id ? updatedJourney : j));
    } catch (err) {
      console.error('Error syncing with Figma:', err);
      setError('Failed to sync with Figma. Please try again.');
    } finally {
      setFigmaLoading(false);
    }
  };

  // Handle exporting journey to Figma
  const handleExportToFigma = async () => {
    if (!selectedJourney?.figmaProjectId) return;
    
    try {
      setFigmaLoading(true);
      await FigmaService.exportJourneyToFigma(selectedJourney.id);
      handleMenuClose();
    } catch (err) {
      console.error('Error exporting to Figma:', err);
      setError('Failed to export journey to Figma. Please try again.');
    } finally {
      setFigmaLoading(false);
    }
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

  // Emotion color map for visualizing user emotions
  const getEmotionColor = (score) => {
    if (score >= 4) return '#4CAF50';  // Very positive (green)
    if (score >= 2) return '#8BC34A';  // Positive (light green)
    if (score >= 0) return '#FFC107';  // Neutral (yellow)
    if (score >= -2) return '#FF9800'; // Negative (orange)
    return '#F44336';                  // Very negative (red)
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          User Journey Mapping Tool
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{ mr: 1 }}
          >
            New Journey
          </Button>
          
          <FormControl sx={{ minWidth: 200, ml: 1 }}>
            <InputLabel id="segment-select-label">User Segment</InputLabel>
            <Select
              labelId="segment-select-label"
              value={selectedSegment}
              label="User Segment"
              onChange={(e) => setSelectedSegment(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Users</MenuItem>
              {userSegments.map(segment => (
                <MenuItem key={segment.id} value={segment.id}>
                  {segment.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {journeys.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Journey Maps Found
          </Typography>
          <Typography color="text.secondary" paragraph>
            Create your first user journey map to start visualizing the user experience.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Journey Map
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Journey selection sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Journey Maps
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {journeys.map(journey => (
                <Card 
                  key={journey.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer',
                    border: selectedJourney?.id === journey.id ? '2px solid #1976d2' : 'none'
                  }}
                  onClick={() => handleSelectJourney(journey)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {journey.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {journey.description || 'No description'}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(journey.lastModified).toLocaleDateString()}
                      </Typography>
                      {journey.figmaProjectId && (
                        <Tooltip title="Linked to Figma">
                          <LinkIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
          
          {/* Main journey mapping area */}
          <Grid item xs={12} md={9}>
            {selectedJourney ? (
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">{selectedJourney.name}</Typography>
                  
                  <Box>
                    {selectedJourney.figmaProjectId && (
                      <Tooltip title="Sync with Figma">
                        <IconButton 
                          onClick={handleSyncFigma}
                          disabled={figmaLoading}
                          sx={{ mr: 1 }}
                        >
                          <AutorenewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Button 
                      variant="outlined" 
                      startIcon={<AddIcon />}
                      onClick={handleAddStage}
                      sx={{ mr: 1 }}
                    >
                      Add Stage
                    </Button>
                    
                    <IconButton
                      onClick={handleMenuOpen}
                    >
                      <MoreVertIcon />
                    </IconButton>
                    
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={handleOpenFigmaDialog}>
                        <LinkIcon fontSize="small" sx={{ mr: 1 }} />
                        {figmaLinked ? 'Change Figma Link' : 'Link to Figma'}
                      </MenuItem>
                      {figmaLinked && (
                        <MenuItem onClick={handleExportToFigma}>
                          <CloudUploadIcon fontSize="small" sx={{ mr: 1 }} />
                          Export to Figma
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleMenuClose}>
                        <ShareIcon fontSize="small" sx={{ mr: 1 }} />
                        Share Journey Map
                      </MenuItem>
                      <MenuItem onClick={handleMenuClose}>
                        <CloudDownloadIcon fontSize="small" sx={{ mr: 1 }} />
                        Export as PDF
                      </MenuItem>
                    </Menu>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Tabs 
                  value={currentTab} 
                  onChange={handleTabChange}
                  sx={{ mb: 2 }}
                >
                  <Tab label="Journey Map" />
                  <Tab label="Analytics" />
                  <Tab label="Touchpoints" />
                </Tabs>
                
                {currentTab === 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedJourney.description || 'No description provided for this journey.'}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" mb={2}>
                      <Typography variant="subtitle2" sx={{ mr: 2 }}>
                        Show Emotion Labels:
                      </Typography>
                      <Button 
                        size="small" 
                        variant={showEmotionLabels ? "contained" : "outlined"}
                        onClick={() => setShowEmotionLabels(true)}
                        sx={{ mr: 1 }}
                      >
                        On
                      </Button>
                      <Button 
                        size="small" 
                        variant={!showEmotionLabels ? "contained" : "outlined"}
                        onClick={() => setShowEmotionLabels(false)}
                      >
                        Off
                      </Button>
                    </Box>
                    
                    {selectedJourney.stages.length === 0 ? (
                      <Box textAlign="center" py={4}>
                        <Typography color="text.secondary">
                          This journey has no stages yet. Add a stage to get started.
                        </Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={handleAddStage}
                          sx={{ mt: 2 }}
                        >
                          Add First Stage
                        </Button>
                      </Box>
                    ) : (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="stages" direction="horizontal">
                          {(provided) => (
                            <Box
                              display="flex"
                              alignItems="stretch"
                              sx={{ 
                                overflowX: 'auto', 
                                pb: 2,
                                '&::-webkit-scrollbar': {
                                  height: 8,
                                },
                                '&::-webkit-scrollbar-thumb': {
                                  backgroundColor: 'rgba(0,0,0,0.2)',
                                  borderRadius: 4,
                                }
                              }}
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {selectedJourney.stages.map((stage, index) => (
                                <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                  {(provided) => (
                                    <Paper
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      sx={{ 
                                        width: 250, 
                                        minHeight: 200,
                                        m: 1, 
                                        p: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderTop: `4px solid ${getEmotionColor(stage.emotionScore)}`,
                                      }}
                                    >
                                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          {stage.name}
                                        </Typography>
                                        <Box>
                                          <IconButton 
                                            size="small" 
                                            onClick={() => handleEditStage(stage)}
                                            sx={{ p: 0.5 }}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton 
                                            size="small" 
                                            onClick={() => handleDeleteStage(stage.id)}
                                            sx={{ p: 0.5 }}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                      
                                      <Typography variant="body2" mt={1}>
                                        {stage.description}
                                      </Typography>
                                      
                                      {showEmotionLabels && (
                                        <Box mt={2} display="flex" alignItems="center">
                                          <Typography variant="caption" mr={1}>
                                            User Sentiment:
                                          </Typography>
                                          <Chip 
                                            label={stage.emotionScore >= 2 ? 'Positive' : 
                                                  stage.emotionScore >= -1 ? 'Neutral' : 'Negative'}
                                            size="small"
                                            sx={{ 
                                              bgcolor: getEmotionColor(stage.emotionScore),
                                              color: 'white'
                                            }}
                                          />
                                        </Box>
                                      )}
                                      
                                      {stage.touchpoints && stage.touchpoints.length > 0 && (
                                        <Box mt={2}>
                                          <Typography variant="caption" component="div" fontWeight="bold">
                                            Touchpoints:
                                          </Typography>
                                          {stage.touchpoints.map(tp => (
                                            <Chip 
                                              key={tp.id}
                                              label={tp.name}
                                              size="small"
                                              sx={{ mt: 0.5, mr: 0.5 }}
                                            />
                                          ))}
                                        </Box>
                                      )}
                                      
                                      {index < selectedJourney.stages.length - 1 && (
                                        <Box 
                                          sx={{ 
                                            position: 'absolute', 
                                            right: -16, 
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            zIndex: 1
                                          }}
                                        >
                                          <ArrowForwardIcon color="action" />
                                        </Box>
                                      )}
                                    </Paper>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </Box>
                )}
                
                {currentTab === 1 && (
                  <Box p={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Journey Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Analytics visualization for this journey will be displayed here,
                      including metrics like completion rate, drop-off points, and average time spent.
                    </Typography>
                    
                    {/* Placeholder for analytics charts and metrics */}
                    <Box 
                      mt={3} 
                      height={300} 
                      bgcolor="action.hover" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      borderRadius={1}
                    >
                      <Typography color="text.secondary">
                        Analytics charts will be displayed here
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {currentTab === 2 && (
                  <Box p={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Touchpoints
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Manage the touchpoints across all stages of this journey.
                    </Typography>
                    
                    {/* Placeholder for touchpoints management */}
                    <Box 
                      mt={3} 
                      height={300} 
                      bgcolor="action.hover" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      borderRadius={1}
                    >
                      <Typography color="text.secondary">
                        Touchpoints management interface will be displayed here
                      </Typography>
                    </Box>
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
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Journey Selected
                </Typography>
                <Typography color="text.secondary">
                  Select a journey from the list or create a new one to get started.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* Dialog for creating a new journey */}
      <Dialog 
        open={openCreateDialog} 
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Journey Map</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Journey Name"
            fullWidth
            variant="outlined"
            value={newJourneyName}
            onChange={(e) => setNewJourneyName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newJourneyDescription}
            onChange={(e) => setNewJourneyDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateJourney} 
            variant="contained"
            disabled={!newJourneyName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Figma integration */}
      <Dialog 
        open={openFigmaDialog} 
        onClose={handleCloseFigmaDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {figmaLinked ? 'Change Figma Project Link' : 'Link to Figma Project'}
        </DialogTitle>
        <DialogContent>
          {figmaLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {figmaProjects.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No Figma projects found. Please make sure your Figma account is connected in settings.
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" paragraph>
                    Select a Figma project to link with this journey map. 
                    This will allow you to sync designs and export journey maps directly to Figma.
                  </Typography>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="figma-project-label">Figma Project</InputLabel>
                    <Select
                      labelId="figma-project-label"
                      value={selectedFigmaProject}
                      label="Figma Project"
                      onChange={(e) => setSelectedFigmaProject(e.target.value)}
                    >
                      {figmaProjects.map(project => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFigmaDialog}>Cancel</Button>
          <Button 
            onClick={handleLinkFigma} 
            variant="contained"
            disabled={figmaLoading || !selectedFigmaProject}
          >
            Link Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JourneyMappingTool; 