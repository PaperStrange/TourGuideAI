import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Chip,
  OutlinedInput,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterListIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Search as SearchIcon,
  BarChart as BarChartIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';
import userSegmentService from '../../services/UserSegmentService';

/**
 * User Segment Manager
 * Allows creating and managing user segments with demographic profiles
 */
const UserSegmentManager = () => {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // User list state
  const [selectedSegmentUsers, setSelectedSegmentUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: {
      demographics: {
        ageRange: [],
        experienceLevel: [],
        location: []
      },
      usageFrequency: '',
      minSessions: 1,
      deviceType: '',
      interests: []
    }
  });
  
  // Available attributes
  const [demographicAttributes, setDemographicAttributes] = useState([]);
  const [behavioralAttributes, setBehavioralAttributes] = useState([]);
  
  // View state
  const [viewUsers, setViewUsers] = useState(false);
  const [viewDemographics, setViewDemographics] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [usersList, setUsersList] = useState({ users: [], total: 0, page: 1 });
  const [demographicsData, setDemographicsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Age range options
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  
  // Experience level options
  const experienceLevels = ['beginner', 'intermediate', 'expert'];
  
  // Location options
  const locations = ['urban', 'suburban', 'rural'];
  
  // Device type options
  const deviceTypes = ['desktop', 'mobile', 'tablet', 'all'];
  
  // Usage frequency options
  const usageFrequencies = ['low', 'medium', 'high', ''];
  
  // Interest options
  const interestOptions = [
    'local exploration', 'international travel', 'cultural experiences', 
    'outdoor activities', 'city tours', 'historical sites', 'food tourism',
    'budget travel', 'luxury travel', 'adventure'
  ];
  
  // Load segments and attributes on mount
  useEffect(() => {
    loadSegments();
    setDemographicAttributes(userSegmentService.getDemographicAttributes());
    setBehavioralAttributes(userSegmentService.getBehavioralAttributes());
  }, []);
  
  // Load segments from service
  const loadSegments = async () => {
    try {
      setLoading(true);
      setError(null);
      const segments = userSegmentService.getSegments();
      setSegments(segments);
    } catch (error) {
      console.error('Error loading segments:', error);
      setError('Failed to load user segments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Open segment dialog for creation
  const handleCreateSegment = () => {
    setFormData({
      name: '',
      description: '',
      criteria: {
        demographics: {
          ageRange: [],
          experienceLevel: [],
          location: []
        },
        usageFrequency: '',
        minSessions: 1,
        deviceType: '',
        interests: []
      }
    });
    setSelectedSegment(null);
    setSegmentDialogOpen(true);
  };
  
  // Open segment dialog for editing
  const handleEditSegment = (segment) => {
    setFormData({
      name: segment.name,
      description: segment.description,
      criteria: {
        demographics: {
          ageRange: [...(segment.criteria.demographics.ageRange || [])],
          experienceLevel: [...(segment.criteria.demographics.experienceLevel || [])],
          location: [...(segment.criteria.demographics.location || [])]
        },
        usageFrequency: segment.criteria.usageFrequency || '',
        minSessions: segment.criteria.minSessions || 1,
        deviceType: segment.criteria.deviceType || '',
        interests: [...(segment.criteria.interests || [])]
      }
    });
    setSelectedSegment(segment);
    setSegmentDialogOpen(true);
  };
  
  // Handle form field changes
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle criteria change
  const handleCriteriaChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      criteria: {
        ...formData.criteria,
        [name]: value
      }
    });
  };
  
  // Handle demographics change
  const handleDemographicsChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      criteria: {
        ...formData.criteria,
        demographics: {
          ...formData.criteria.demographics,
          [name]: value
        }
      }
    });
  };
  
  // Save segment
  const handleSaveSegment = async () => {
    try {
      // Validate required fields
      if (!formData.name) {
        setError('Segment name is required');
        return;
      }
      
      // Validate criteria
      const hasInvalidCriteria = [...formData.criteria.demographics.ageRange, ...formData.criteria.demographics.experienceLevel, ...formData.criteria.demographics.location, ...formData.criteria.interests]
        .some(c => !c);
      
      if (hasInvalidCriteria) {
        setError('Please complete all demographic criteria');
        return;
      }
      
      setLoading(true);
      
      if (selectedSegment) {
        // Update existing segment
        const updatedSegment = await userSegmentService.updateSegment(selectedSegment.id, formData);
        setSuccessMessage(`Segment "${updatedSegment.name}" updated successfully`);
      } else {
        // Create new segment
        const newSegment = await userSegmentService.createSegment(formData);
        setSuccessMessage(`Segment "${newSegment.name}" created successfully`);
      }
      
      // Reload segments
      await loadSegments();
      setSegmentDialogOpen(false);
    } catch (error) {
      console.error('Error saving segment:', error);
      setError('Failed to save segment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (segment) => {
    setSelectedSegment(segment);
    setDeleteConfirmOpen(true);
  };
  
  // Delete segment
  const handleDeleteSegment = async () => {
    try {
      setLoading(true);
      const result = await userSegmentService.deleteSegment(selectedSegment.id);
      
      if (result) {
        setSuccessMessage(`Segment "${selectedSegment.name}" deleted successfully`);
        await loadSegments();
      } else {
        setError('Failed to delete segment');
      }
      
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting segment:', error);
      setError('Failed to delete segment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // View users in segment
  const handleViewUsers = async (segment) => {
    try {
      setSelectedSegment(segment);
      setTabValue(1); // Switch to Users tab
      await loadSegmentUsers(segment.id, 1);
    } catch (error) {
      console.error('Error loading segment users:', error);
      setError('Failed to load users for this segment. Please try again.');
    }
  };
  
  // Load users for a segment
  const loadSegmentUsers = async (segmentId, page = 1) => {
    try {
      setUsersLoading(true);
      const result = await userSegmentService.getUsersInSegment(segmentId, { page, pageSize: 10 });
      setSelectedSegmentUsers(result.users);
      setUsersPagination(result.pagination);
    } catch (error) {
      console.error('Error loading segment users:', error);
      setError('Failed to load users for this segment. Please try again.');
      setSelectedSegmentUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };
  
  // Handle user page change
  const handleUserPageChange = (event, page) => {
    if (selectedSegment) {
      loadSegmentUsers(selectedSegment.id, page);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Load users when switching to Users tab
    if (newValue === 1 && selectedSegment) {
      loadSegmentUsers(selectedSegment.id);
    }
  };
  
  // View demographics for a segment
  const handleViewDemographics = async (segmentId) => {
    setSelectedSegmentId(segmentId);
    setViewDemographics(true);
    setViewUsers(false);
    setLoadingDetails(true);
    
    try {
      const demographics = await userSegmentService.getSegmentDemographics(segmentId);
      setDemographicsData(demographics);
    } catch (error) {
      console.error('Failed to load demographics for segment:', error);
      setError('Failed to load demographics for this segment. Please try again.');
    } finally {
      setLoadingDetails(false);
    }
  };
  
  // Handle close details
  const handleCloseDetails = () => {
    setViewUsers(false);
    setViewDemographics(false);
    setSelectedSegmentId(null);
  };
  
  // Render distribution chart (simple text-based chart for now)
  const renderDistributionChart = (distribution) => {
    return Object.entries(distribution).map(([key, data]) => (
      <Box key={key} sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2">{key}</Typography>
          <Typography variant="body2">{data.percentage}% ({data.count})</Typography>
        </Box>
        <Box 
          sx={{ 
            width: '100%', 
            height: 8, 
            bgcolor: '#e0e0e0', 
            borderRadius: 1, 
            overflow: 'hidden' 
          }}
        >
          <Box 
            sx={{ 
              width: `${data.percentage}%`, 
              height: '100%', 
              bgcolor: 'primary.main' 
            }} 
          />
        </Box>
      </Box>
    ));
  };
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          User Segment Manager
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateSegment}
        >
          Create New Segment
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {segments.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                No user segments defined yet. Create your first segment to start targeting specific user groups.
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateSegment}
              >
                Create First Segment
              </Button>
            </Paper>
          ) : (
            <>
              {selectedSegment ? (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label="Segment Details" id="segment-tab-0" />
                        <Tab label="Users" id="segment-tab-1" />
                      </Tabs>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => setSelectedSegment(null)}
                        size="small"
                        sx={{ ml: 2 }}
                      >
                        Back to All Segments
                      </Button>
                    </Box>
                  </Box>
                  
                  {tabValue === 0 && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {selectedSegment.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {selectedSegment.description}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Demographic Criteria
                        </Typography>
                        {selectedSegment.criteria.demographics && Object.entries(selectedSegment.criteria.demographics).length > 0 ? (
                          <Box sx={{ mb: 2 }}>
                            {Object.entries(selectedSegment.criteria.demographics).map(([key, values]) => (
                              <Box key={key} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>{key}:</strong>{' '}
                                  {values.join(', ')}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No demographic criteria defined
                          </Typography>
                        )}
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Usage Pattern
                        </Typography>
                        {selectedSegment.criteria.usageFrequency && (
                          <Box>
                            <Typography variant="body2">
                              <strong>Usage Frequency:</strong> {selectedSegment.criteria.usageFrequency}
                            </Typography>
                          </Box>
                        )}
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Interests
                        </Typography>
                        {selectedSegment.criteria.interests && selectedSegment.criteria.interests.length > 0 ? (
                          <Box>
                            {selectedSegment.criteria.interests.map((interest, index) => (
                              <Box key={`interest-${index}`} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>Interest:</strong> {interest}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No interests defined
                          </Typography>
                        )}
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Chip 
                            label={`Created: ${new Date(selectedSegment.createdAt).toLocaleDateString()}`} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={`Updated: ${new Date(selectedSegment.updatedAt).toLocaleDateString()}`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditSegment(selectedSegment)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={() => handleDeleteClick(selectedSegment)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          startIcon={<PeopleIcon />}
                          onClick={() => handleViewUsers(selectedSegment)}
                        >
                          View Users
                        </Button>
                      </CardActions>
                    </Card>
                  )}
                  
                  {tabValue === 1 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Users in Segment: {selectedSegment.name}
                      </Typography>
                      
                      {usersLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <>
                          {selectedSegmentUsers.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                              <Typography variant="body1">
                                No users found in this segment.
                              </Typography>
                            </Paper>
                          ) : (
                            <>
                              <TableContainer component={Paper} variant="outlined">
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Name</TableCell>
                                      <TableCell>Email</TableCell>
                                      <TableCell>Join Date</TableCell>
                                      <TableCell>Demographics</TableCell>
                                      <TableCell>Behavior</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {selectedSegmentUsers.map((user) => (
                                      <TableRow key={user.id}>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{new Date(user.joinDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                          {Object.entries(user.demographic || {}).map(([key, value]) => (
                                            <Box key={key} sx={{ mb: 0.5 }}>
                                              <Typography variant="caption">
                                                <strong>{key}:</strong> {value}
                                              </Typography>
                                            </Box>
                                          ))}
                                        </TableCell>
                                        <TableCell>
                                          {Object.entries(user.behavioral || {}).map(([key, value]) => (
                                            <Box key={key} sx={{ mb: 0.5 }}>
                                              <Typography variant="caption">
                                                <strong>{key}:</strong> {value}
                                              </Typography>
                                            </Box>
                                          ))}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Pagination
                                  count={usersPagination.totalPages}
                                  page={usersPagination.page}
                                  onChange={handleUserPageChange}
                                  color="primary"
                                />
                              </Box>
                            </>
                          )}
                        </>
                      )}
                    </Box>
                  )}
                </>
              ) : (
                <Grid container spacing={3}>
                  {segments.map((segment) => (
                    <Grid item xs={12} sm={6} md={4} key={segment.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          borderLeft: `4px solid ${segment.color || '#2196f3'}` 
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {segment.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {segment.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                            {Object.entries(segment.criteria.demographics).length > 0 && (
                              <Chip 
                                size="small" 
                                label={`${Object.entries(segment.criteria.demographics).length} demographic criteria`} 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => setSelectedSegment(segment)}>
                            View Details
                          </Button>
                          <Button 
                            size="small" 
                            startIcon={<EditIcon />}
                            onClick={() => handleEditSegment(segment)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteClick(segment)}
                          >
                            Delete
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </>
      )}
      
      {/* Segment Form Dialog */}
      <Dialog 
        open={segmentDialogOpen} 
        onClose={() => setSegmentDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedSegment ? `Edit Segment: ${selectedSegment.name}` : 'Create New Segment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Segment Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              margin="normal"
              multiline
              rows={2}
            />
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Demographic Criteria
              <Tooltip title="Add demographic criterion">
                <IconButton 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }}
                  onClick={() => handleDemographicsChange({ target: { name: 'ageRange', value: '' } })}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            
            {Object.entries(formData.criteria.demographics).map(([key, values]) => (
              <Box key={key} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <FormControl fullWidth sx={{ mr: 1 }}>
                    <InputLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</InputLabel>
                    <Select
                      multiple
                      value={values}
                      onChange={(e) => handleDemographicsChange({ target: { name: key, value: e.target.value } })}
                      input={<OutlinedInput label="Values" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {key === 'ageRange' && ageRanges.map((age) => (
                        <MenuItem key={age} value={age}>{age}</MenuItem>
                      ))}
                      {key === 'experienceLevel' && experienceLevels.map((level) => (
                        <MenuItem key={level} value={level}>{level}</MenuItem>
                      ))}
                      {key === 'location' && locations.map((location) => (
                        <MenuItem key={location} value={location}>{location}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <IconButton 
                    color="error" 
                    size="small"
                    onClick={() => handleDemographicsChange({ target: { name: key, value: values.filter((v) => v !== '') } })}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Usage Pattern
              <Tooltip title="Add usage pattern criterion">
                <IconButton 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }}
                  onClick={() => handleCriteriaChange({ target: { name: 'usageFrequency', value: '' } })}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel id="usage-frequency-label">Usage Frequency</InputLabel>
              <Select
                labelId="usage-frequency-label"
                name="usageFrequency"
                value={formData.criteria.usageFrequency || ''}
                onChange={handleCriteriaChange}
              >
                <MenuItem value="">Any Frequency</MenuItem>
                <MenuItem value="low">Low (1-4 sessions)</MenuItem>
                <MenuItem value="medium">Medium (5-14 sessions)</MenuItem>
                <MenuItem value="high">High (15+ sessions)</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Interests
              <Tooltip title="Add interest criterion">
                <IconButton 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }}
                  onClick={() => handleCriteriaChange({ target: { name: 'interests', value: '' } })}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel id="interests-label">User Interests</InputLabel>
              <Select
                labelId="interests-label"
                name="interests"
                multiple
                value={formData.criteria.interests || []}
                onChange={handleCriteriaChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {interestOptions.map((interest) => (
                  <MenuItem key={interest} value={interest}>{interest}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSegmentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSegment} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the segment "{selectedSegment?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteSegment} 
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Demographics Dialog */}
      <Dialog 
        open={viewDemographics} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSegment ? `Demographics for "${selectedSegment.name}" Segment` : 'Segment Demographics'}
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {!demographicsData ? (
                <Alert severity="error">Failed to load demographic data.</Alert>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Total users in segment: {demographicsData.totalUsers}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Age Distribution</Typography>
                    {renderDistributionChart(demographicsData.ageDistribution)}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Gender Distribution</Typography>
                    {renderDistributionChart(demographicsData.genderDistribution)}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Experience Level</Typography>
                    {renderDistributionChart(demographicsData.experienceDistribution)}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Device Usage</Typography>
                    {renderDistributionChart(demographicsData.deviceDistribution)}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Location</Typography>
                    {renderDistributionChart(demographicsData.locationDistribution)}
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserSegmentManager; 