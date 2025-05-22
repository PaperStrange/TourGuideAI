import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  Badge,
  Alert
} from '@mui/material';
import {
  AddCircleOutline as AddIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  MoreVert as MoreVertIcon,
  CheckCircleOutline as ImplementedIcon,
  Schedule as PlannedIcon,
  Close as RejectedIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Label as LabelIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

/**
 * Feature Request Board component
 * Allows beta users to submit, vote on, and track feature requests
 * 
 * @param {Object} props Component props
 * @param {Object} props.featureService Service for managing feature requests
 */
const FeatureRequestBoard = ({ featureService }) => {
  // Available categories
  const CATEGORIES = [
    'UI/UX', 'Mobile App', 'Performance', 'Navigation',
    'Tours', 'Maps', 'Integrations', 'Accessibility',
    'Offline Mode', 'Accounts', 'Social Features', 'Other'
  ];
  
  // Feature statuses
  const STATUSES = {
    REQUESTED: 'requested',
    UNDER_REVIEW: 'under_review',
    PLANNED: 'planned',
    IN_PROGRESS: 'in_progress',
    IMPLEMENTED: 'implemented',
    REJECTED: 'rejected'
  };
  
  // State
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortBy, setSortBy] = useState('votes');
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all'
  });
  
  // New feature request state
  const [newFeature, setNewFeature] = useState({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState({});
  
  // Load features on component mount
  useEffect(() => {
    loadFeatures();
  }, []);
  
  // Load feature requests
  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would call the service
      // const data = await featureService.getFeatures();
      
      // Mock data for demo
      const mockFeatures = [
        {
          id: 'feat-1',
          title: 'Add dark mode support',
          description: 'Implement a dark mode theme option to reduce eye strain during nighttime use.',
          category: 'UI/UX',
          status: STATUSES.PLANNED,
          votes: 36,
          comments: 12,
          userVoted: true,
          tags: ['Dark Mode', 'Usability'],
          createdBy: {
            id: 'user-1',
            name: 'Alex Johnson',
            avatar: null
          },
          createdAt: '2023-03-15T08:22:17Z',
          updatedAt: '2023-03-22T16:33:41Z'
        },
        {
          id: 'feat-2',
          title: 'Offline maps for saved routes',
          description: 'Allow users to download maps for their saved routes to use when no internet connection is available.',
          category: 'Offline Mode',
          status: STATUSES.IN_PROGRESS,
          votes: 58,
          comments: 23,
          userVoted: false,
          tags: ['Offline', 'Maps'],
          createdBy: {
            id: 'user-2',
            name: 'Maria Garcia',
            avatar: 'https://i.pravatar.cc/150?u=user-2'
          },
          createdAt: '2023-03-10T11:42:35Z',
          updatedAt: '2023-03-25T09:17:22Z'
        },
        {
          id: 'feat-3',
          title: 'Export routes to GPX/KML formats',
          description: 'Add the ability to export created routes in standard GPX and KML formats for use in other applications.',
          category: 'Integrations',
          status: STATUSES.REQUESTED,
          votes: 24,
          comments: 8,
          userVoted: true,
          tags: ['Export', 'Integration'],
          createdBy: {
            id: 'user-3',
            name: 'David Wong',
            avatar: 'https://i.pravatar.cc/150?u=user-3'
          },
          createdAt: '2023-03-20T14:52:09Z',
          updatedAt: '2023-03-20T14:52:09Z'
        },
        {
          id: 'feat-4',
          title: 'Improve route optimization algorithm',
          description: 'Enhance the current route optimization to consider factors like traffic patterns, opening hours, and weather.',
          category: 'Performance',
          status: STATUSES.UNDER_REVIEW,
          votes: 42,
          comments: 16,
          userVoted: false,
          tags: ['Algorithm', 'Optimization'],
          createdBy: {
            id: 'user-4',
            name: 'Samantha Lee',
            avatar: 'https://i.pravatar.cc/150?u=user-4'
          },
          createdAt: '2023-03-18T09:12:47Z',
          updatedAt: '2023-03-24T11:32:18Z'
        },
        {
          id: 'feat-5',
          title: 'Social sharing of created routes',
          description: 'Allow users to share their created routes on social media platforms directly from the app.',
          category: 'Social Features',
          status: STATUSES.IMPLEMENTED,
          votes: 31,
          comments: 7,
          userVoted: true,
          tags: ['Social', 'Sharing'],
          createdBy: {
            id: 'user-5',
            name: 'James Wilson',
            avatar: null
          },
          createdAt: '2023-03-05T16:41:23Z',
          updatedAt: '2023-03-27T13:45:56Z'
        }
      ];
      
      setFeatures(mockFeatures);
    } catch (err) {
      console.error('Error loading features:', err);
      setError('Failed to load feature requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle opening add dialog
  const handleOpenAddDialog = () => {
    setNewFeature({
      title: '',
      description: '',
      category: '',
      tags: []
    });
    setFormErrors({});
    setShowAddDialog(true);
  };
  
  // Handle closing add dialog
  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
  };
  
  // Handle new feature input change
  const handleFeatureInputChange = (e) => {
    const { name, value } = e.target;
    setNewFeature(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field changes
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle tag input (comma separated)
  const handleTagInput = (e) => {
    const value = e.target.value;
    if (value.endsWith(',')) {
      const tag = value.slice(0, -1).trim();
      if (tag && !newFeature.tags.includes(tag)) {
        setNewFeature(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
      }
      e.target.value = '';
    }
  };
  
  // Remove a tag
  const handleRemoveTag = (tag) => {
    setNewFeature(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!newFeature.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!newFeature.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!newFeature.category) {
      errors.category = 'Category is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Submit new feature request
  const handleSubmitFeature = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real implementation, this would call the service
      // const result = await featureService.createFeature(newFeature);
      
      // Mock implementation
      const mockNewFeature = {
        id: `feat-${Date.now()}`,
        ...newFeature,
        status: STATUSES.REQUESTED,
        votes: 1,
        comments: 0,
        userVoted: true,
        createdBy: {
          id: 'current-user',
          name: 'Current User',
          avatar: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setFeatures(prev => [mockNewFeature, ...prev]);
      setShowAddDialog(false);
    } catch (err) {
      console.error('Error creating feature request:', err);
      setError('Failed to create feature request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Vote for a feature
  const handleVote = async (featureId) => {
    try {
      // In a real implementation, this would call the service
      // await featureService.voteFeature(featureId);
      
      // Update local state
      setFeatures(prev => 
        prev.map(feature => {
          if (feature.id === featureId) {
            return {
              ...feature,
              votes: feature.userVoted ? feature.votes - 1 : feature.votes + 1,
              userVoted: !feature.userVoted
            };
          }
          return feature;
        })
      );
    } catch (err) {
      console.error('Error voting for feature:', err);
      // Show error notification
    }
  };
  
  // Handle sort change
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case STATUSES.IMPLEMENTED:
        return <ImplementedIcon color="success" />;
      case STATUSES.PLANNED:
      case STATUSES.IN_PROGRESS:
        return <PlannedIcon color="primary" />;
      case STATUSES.REJECTED:
        return <RejectedIcon color="error" />;
      default:
        return null;
    }
  };
  
  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case STATUSES.REQUESTED:
        return 'Requested';
      case STATUSES.UNDER_REVIEW:
        return 'Under Review';
      case STATUSES.PLANNED:
        return 'Planned';
      case STATUSES.IN_PROGRESS:
        return 'In Progress';
      case STATUSES.IMPLEMENTED:
        return 'Implemented';
      case STATUSES.REJECTED:
        return 'Rejected';
      default:
        return status;
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case STATUSES.REQUESTED:
        return 'default';
      case STATUSES.UNDER_REVIEW:
        return 'warning';
      case STATUSES.PLANNED:
        return 'info';
      case STATUSES.IN_PROGRESS:
        return 'primary';
      case STATUSES.IMPLEMENTED:
        return 'success';
      case STATUSES.REJECTED:
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Filter features
  const filteredFeatures = features.filter(feature => {
    if (filters.category !== 'all' && feature.category !== filters.category) {
      return false;
    }
    
    if (filters.status !== 'all' && feature.status !== filters.status) {
      return false;
    }
    
    // Filter by tab
    if (activeTab === 1 && !feature.userVoted) {
      return false;
    }
    
    if (activeTab === 2 && feature.status !== STATUSES.IMPLEMENTED) {
      return false;
    }
    
    return true;
  });
  
  // Sort features
  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return b.votes - a.votes;
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      default:
        return b.votes - a.votes;
    }
  });
  
  return (
    <Box>
      {/* Add Feature Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={handleCloseAddDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Submit Feature Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={newFeature.title}
                onChange={handleFeatureInputChange}
                error={!!formErrors.title}
                helperText={formErrors.title}
                placeholder="Enter a concise title for your feature request"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.category}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={newFeature.category}
                  onChange={handleFeatureInputChange}
                  label="Category"
                  required
                >
                  {CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error">
                    {formErrors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tags"
                placeholder="Type tag and press comma to add"
                onKeyUp={handleTagInput}
                helperText="Enter tags to help categorize your request"
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {newFeature.tags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newFeature.description}
                onChange={handleFeatureInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description || 'Provide a detailed description of the feature you would like to see'}
                multiline
                rows={4}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitFeature}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Feature Board Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Feature Requests
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Submit Request
        </Button>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          aria-label="feature request tabs"
        >
          <Tab label="All Requests" />
          <Tab label="My Votes" />
          <Tab label="Implemented" />
        </Tabs>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <FilterIcon color="action" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {Object.values(STATUSES).map(status => (
                  <MenuItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-label">Sort By</InputLabel>
              <Select
                labelId="sort-label"
                value={sortBy}
                onChange={handleSortChange}
                label="Sort By"
              >
                <MenuItem value="votes">Most Votes</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="textSecondary">
              {filteredFeatures.length} {filteredFeatures.length === 1 ? 'request' : 'requests'} found
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Feature List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredFeatures.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No feature requests found
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {activeTab === 0 ? 
              'No feature requests match your current filters.' :
              activeTab === 1 ? 
                'You haven\'t voted for any feature requests yet.' :
                'No implemented features match your current filters.'
            }
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{ mt: 2 }}
          >
            Submit a New Request
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sortedFeatures.map(feature => (
            <Grid item xs={12} key={feature.id}>
              <Card 
                variant="outlined"
                sx={{
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {/* Status indicator */}
                {getStatusIcon(feature.status) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 1
                    }}
                  >
                    <Tooltip title={getStatusLabel(feature.status)}>
                      {getStatusIcon(feature.status)}
                    </Tooltip>
                  </Box>
                )}
                
                <Grid container>
                  {/* Vote count column */}
                  <Grid item xs={1} sm={1}>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        height: '100%',
                        borderRight: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <IconButton 
                        onClick={() => handleVote(feature.id)}
                        color={feature.userVoted ? 'primary' : 'default'}
                        size="small"
                      >
                        <ArrowUpIcon />
                      </IconButton>
                      <Typography 
                        variant="h6" 
                        color={feature.userVoted ? 'primary' : 'textPrimary'}
                        sx={{ fontWeight: feature.userVoted ? 'bold' : 'normal' }}
                      >
                        {feature.votes}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        votes
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Feature content column */}
                  <Grid item xs={11} sm={11}>
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Box sx={{ display: 'flex', mb: 1 }}>
                          <Chip 
                            label={feature.category} 
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={getStatusLabel(feature.status)} 
                            size="small"
                            color={getStatusColor(feature.status)}
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {feature.description}
                        </Typography>
                        
                        {/* Tags */}
                        {feature.tags.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {feature.tags.map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                icon={<LabelIcon />}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Feature metadata */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={feature.createdBy.avatar}
                            alt={feature.createdBy.name}
                            sx={{ width: 24, height: 24, mr: 1 }}
                          />
                          <Typography variant="body2" color="textSecondary">
                            {feature.createdBy.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mx: 1 }}>
                            •
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatDate(feature.createdAt)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Tooltip title="Comments">
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                              <CommentIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                              <Typography variant="body2" color="textSecondary">
                                {feature.comments}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default FeatureRequestBoard; 