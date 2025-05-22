import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import SortIcon from '@mui/icons-material/Sort';
import { useNavigate } from 'react-router-dom';
import featureRequestService from '../../services/FeatureRequestService';

/**
 * Feature Request List Component
 * Displays a list of feature requests with filtering and sorting options
 */
const FeatureRequestList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('votes');
  const [statusFilter, setStatusFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [userVotes, setUserVotes] = useState({});

  // Status options for filtering
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'implemented', label: 'Implemented' },
    { value: 'declined', label: 'Declined' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'votes', label: 'Most Votes' },
    { value: 'recent', label: 'Most Recent' },
    { value: 'updated', label: 'Recently Updated' }
  ];

  useEffect(() => {
    // Load feature requests and categories
    fetchFeatureRequests();
    fetchCategories();

    // For demo purposes, initialize some user votes
    setUserVotes({
      'feature_1': true,
      'feature_3': true
    });
  }, []);

  // Fetch feature requests with current filters
  const fetchFeatureRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: searchQuery,
        category: selectedCategory,
        status: statusFilter,
        sortBy
      };
      
      const data = await featureRequestService.getFeatureRequests(filters);
      setRequests(data);
    } catch (err) {
      console.error('Error fetching feature requests:', err);
      setError('Failed to load feature requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const data = await featureRequestService.getCategories();
      setCategories([{ id: '', name: 'All Categories' }, ...data]);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error state as categories are not critical
    }
  };

  // Apply filters when they change
  useEffect(() => {
    fetchFeatureRequests();
  }, [selectedCategory, statusFilter, sortBy]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFeatureRequests();
  };

  // Handle category filter change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  // Handle status filter change
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Handle sort by change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Navigate to create feature request page
  const handleCreateRequest = () => {
    navigate('/beta/feature-requests/new');
  };

  // Navigate to feature request details
  const handleViewRequest = (requestId) => {
    navigate(`/beta/feature-requests/${requestId}`);
  };

  // Toggle vote on a feature request
  const handleToggleVote = async (e, requestId) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      const isCurrentlyVoted = userVotes[requestId];
      const newVoteState = !isCurrentlyVoted;
      
      // Optimistic update
      setUserVotes(prev => ({
        ...prev,
        [requestId]: newVoteState
      }));
      
      // Update the vote count optimistically
      setRequests(prev => 
        prev.map(request => 
          request.id === requestId
            ? { ...request, votes: request.votes + (newVoteState ? 1 : -1) }
            : request
        )
      );
      
      // Call API
      await featureRequestService.voteOnFeatureRequest(requestId, newVoteState);
      
      // No need to refresh as we updated optimistically
    } catch (err) {
      console.error('Error toggling vote:', err);
      
      // Revert optimistic update on error
      setUserVotes(prev => ({
        ...prev,
        [requestId]: !userVotes[requestId]
      }));
      
      // Revert vote count on error
      setRequests(prev => 
        prev.map(request => 
          request.id === requestId
            ? { ...request, votes: request.votes + (userVotes[requestId] ? 1 : -1) }
            : request
        )
      );
      
      alert('Failed to update vote. Please try again.');
    }
  };

  // Get color for status chip
  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return theme.palette.info.main;
      case 'under_review':
        return theme.palette.warning.main;
      case 'planned':
        return theme.palette.primary.main;
      case 'in_progress':
        return theme.palette.secondary.main;
      case 'implemented':
        return theme.palette.success.main;
      case 'declined':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Get formatted status label
  const getStatusLabel = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Feature Requests
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRequest}
          >
            Submit Request
          </Button>
        </Box>
        
        <Grid container spacing={2} mb={3}>
          {/* Search Bar */}
          <Grid item xs={12} md={6}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                placeholder="Search feature requests..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" edge="end">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                size="small"
              />
            </form>
          </Grid>
          
          {/* Filters and Sorting */}
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="category-filter-label">
                  <Box display="flex" alignItems="center">
                    <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Category
                  </Box>
                </InputLabel>
                <Select
                  labelId="category-filter-label"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  {statusOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="sort-label">
                  <Box display="flex" alignItems="center">
                    <SortIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Sort By
                  </Box>
                </InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort By"
                >
                  {sortOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box textAlign="center" py={5}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No feature requests found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || selectedCategory || statusFilter
                ? 'Try adjusting your filters or search query'
                : 'Be the first to submit a feature request!'}
            </Typography>
            {(searchQuery || selectedCategory || statusFilter) && (
              <Button 
                variant="outlined" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setStatusFilter('');
                  setSortBy('votes');
                }}
                sx={{ mt: 2 }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={3}>
            {requests.map(request => (
              <Grid item xs={12} md={6} lg={4} key={request.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleViewRequest(request.id)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Chip
                        label={getStatusLabel(request.status)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(request.status),
                          color: '#fff'
                        }}
                      />
                      
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(request.createdAt)}
                      </Typography>
                    </Box>
                    
                    <Typography variant="h6" component="h2" gutterBottom>
                      {request.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {request.description.length > 120
                        ? `${request.description.substring(0, 120)}...`
                        : request.description}
                    </Typography>
                    
                    {request.category && (
                      <Chip
                        label={request.category}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    
                    {request.tags && request.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                    <Box display="flex" alignItems="center">
                      <Tooltip title={userVotes[request.id] ? "Remove Vote" : "Vote"}>
                        <IconButton 
                          color={userVotes[request.id] ? "primary" : "default"} 
                          onClick={(e) => handleToggleVote(e, request.id)}
                          size="small"
                        >
                          {userVotes[request.id] ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight="medium" sx={{ ml: 0.5 }}>
                        {request.votes}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center">
                      <CommentIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        {request.comments} {request.comments === 1 ? 'comment' : 'comments'}
                      </Typography>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default FeatureRequestList; 