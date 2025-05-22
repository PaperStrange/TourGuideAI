import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  MoreVert as MoreVertIcon,
  Flag as FlagIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sort as SortIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

/**
 * Beta Community Forum component
 * Provides a discussion platform for beta users
 */
const BetaCommunityForum = () => {
  // State
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [sortOption, setSortOption] = useState('newest');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    tags: []
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Load discussions on component mount
  useEffect(() => {
    loadDiscussions();
  }, []);
  
  // Load discussions from API (mock implementation)
  const loadDiscussions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demo
      setTimeout(() => {
        const mockDiscussions = [
          {
            id: 'disc-1',
            title: 'How to use the map feature effectively?',
            content: 'I\'ve been trying to plan a route with multiple stops, but I\'m having trouble optimizing the order. Does anyone have tips on how to use the map feature more effectively?',
            author: {
              id: 'user-1',
              name: 'Alex Johnson',
              avatar: null
            },
            createdAt: '2023-03-18T09:22:17Z',
            updatedAt: '2023-03-18T09:22:17Z',
            upvotes: 12,
            commentCount: 5,
            tags: ['Maps', 'Routes', 'Tips'],
            pinned: false,
            bookmarked: false,
            category: 'Help & Support'
          },
          {
            id: 'disc-2',
            title: 'Offline mode suggestion',
            content: 'Has anyone found a good workaround for using the app in areas with poor connectivity? I\'m going hiking next month and I\'d like to be able to access my saved routes.',
            author: {
              id: 'user-2',
              name: 'Maria Garcia',
              avatar: 'https://i.pravatar.cc/150?u=user-2'
            },
            createdAt: '2023-03-15T14:33:41Z',
            updatedAt: '2023-03-16T10:15:22Z',
            upvotes: 24,
            commentCount: 8,
            tags: ['Offline', 'Feature Request'],
            pinned: false,
            bookmarked: true,
            category: 'Feature Discussions'
          },
          {
            id: 'disc-3',
            title: 'Introducing myself to the beta community',
            content: 'Hello everyone! I\'m new to the beta program and wanted to introduce myself. I\'m a travel enthusiast from Canada and I\'m excited to help test and improve TourGuideAI!',
            author: {
              id: 'user-3',
              name: 'David Wong',
              avatar: 'https://i.pravatar.cc/150?u=user-3'
            },
            createdAt: '2023-03-20T11:42:09Z',
            updatedAt: '2023-03-20T11:42:09Z',
            upvotes: 18,
            commentCount: 12,
            tags: ['Introduction', 'Community'],
            pinned: true,
            bookmarked: false,
            category: 'General'
          },
          {
            id: 'disc-4',
            title: 'Integration with weather services',
            content: 'I think it would be great if we could see weather forecasts for our planned routes directly in the app. What do others think about this idea?',
            author: {
              id: 'user-4',
              name: 'Samantha Lee',
              avatar: 'https://i.pravatar.cc/150?u=user-4'
            },
            createdAt: '2023-03-17T16:23:47Z',
            updatedAt: '2023-03-19T08:45:11Z',
            upvotes: 36,
            commentCount: 15,
            tags: ['Weather', 'Feature Request', 'Integration'],
            pinned: false,
            bookmarked: false,
            category: 'Feature Discussions'
          },
          {
            id: 'disc-5',
            title: 'Beta program feedback process',
            content: 'The beta program has been running for a few weeks now. I\'m curious how our feedback is being used to improve the app. Can any moderators provide insights?',
            author: {
              id: 'user-5',
              name: 'James Wilson',
              avatar: null
            },
            createdAt: '2023-03-12T10:11:23Z',
            updatedAt: '2023-03-18T13:27:56Z',
            upvotes: 29,
            commentCount: 6,
            tags: ['Feedback', 'Process', 'Beta Program'],
            pinned: false,
            bookmarked: true,
            category: 'General'
          }
        ];
        
        setDiscussions(mockDiscussions);
        setLoading(false);
      }, 1000); // Simulate network delay
      
    } catch (err) {
      console.error('Error loading discussions:', err);
      setError('Failed to load discussions. Please try again.');
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle search input
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Handle menu open
  const handleMenuOpen = (event, discussion) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedDiscussion(discussion);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDiscussion(null);
  };
  
  // Handle bookmark
  const handleBookmark = (discussionId) => {
    setDiscussions(prev => 
      prev.map(disc => {
        if (disc.id === discussionId) {
          return { ...disc, bookmarked: !disc.bookmarked };
        }
        return disc;
      })
    );
    handleMenuClose();
  };
  
  // Handle upvote
  const handleUpvote = (discussionId) => {
    setDiscussions(prev => 
      prev.map(disc => {
        if (disc.id === discussionId) {
          // In a real app, we would track if the user has already upvoted
          // For this mock, we'll just increment the count
          return { 
            ...disc, 
            upvotes: disc.upvotes + 1 
          };
        }
        return disc;
      })
    );
  };
  
  // Handle sort change
  const handleSortChange = (option) => {
    setSortOption(option);
  };
  
  // Handle create discussion dialog open
  const handleCreateDialogOpen = () => {
    setNewDiscussion({
      title: '',
      content: '',
      tags: []
    });
    setFormErrors({});
    setShowCreateDialog(true);
  };
  
  // Handle create discussion dialog close
  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
  };
  
  // Handle new discussion input change
  const handleNewDiscussionChange = (e) => {
    const { name, value } = e.target;
    setNewDiscussion(prev => ({
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
      if (tag && !newDiscussion.tags.includes(tag)) {
        setNewDiscussion(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
      }
      e.target.value = '';
    }
  };
  
  // Remove a tag
  const handleRemoveTag = (tag) => {
    setNewDiscussion(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!newDiscussion.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!newDiscussion.content.trim()) {
      errors.content = 'Content is required';
    } else if (newDiscussion.content.length < 20) {
      errors.content = 'Content must be at least 20 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle create discussion
  const handleCreateDiscussion = () => {
    if (!validateForm()) {
      return;
    }
    
    // Create new discussion (in a real app, this would be an API call)
    const newDiscussionObj = {
      id: `disc-${Date.now()}`,
      title: newDiscussion.title,
      content: newDiscussion.content,
      author: {
        id: 'current-user',
        name: 'Current User',
        avatar: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvotes: 0,
      commentCount: 0,
      tags: newDiscussion.tags,
      pinned: false,
      bookmarked: false,
      category: 'General' // In a real app, the user would select this
    };
    
    setDiscussions(prev => [newDiscussionObj, ...prev]);
    handleCreateDialogClose();
  };
  
  // Filter and sort discussions
  const filteredDiscussions = discussions.filter(discussion => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !discussion.title.toLowerCase().includes(query) &&
        !discussion.content.toLowerCase().includes(query) &&
        !discussion.tags.some(tag => tag.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    
    // Filter by tab
    if (activeTab === 1 && !discussion.pinned) {
      return false;
    }
    
    if (activeTab === 2 && !discussion.bookmarked) {
      return false;
    }
    
    if (activeTab === 3 && discussion.category !== 'Feature Discussions') {
      return false;
    }
    
    if (activeTab === 4 && discussion.category !== 'Help & Support') {
      return false;
    }
    
    return true;
  });
  
  // Sort discussions
  const sortedDiscussions = [...filteredDiscussions].sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'most_upvoted':
        return b.upvotes - a.upvotes;
      case 'most_commented':
        return b.commentCount - a.commentCount;
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  return (
    <Box>
      {/* Create Discussion Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={handleCreateDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Start a New Discussion</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={newDiscussion.title}
                onChange={handleNewDiscussionChange}
                error={!!formErrors.title}
                helperText={formErrors.title}
                placeholder="Enter a clear, specific title for your discussion"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content"
                name="content"
                value={newDiscussion.content}
                onChange={handleNewDiscussionChange}
                error={!!formErrors.content}
                helperText={formErrors.content}
                multiline
                rows={6}
                placeholder="Share your thoughts, questions, or ideas in detail"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags"
                placeholder="Type tag and press comma to add"
                onKeyUp={handleTagInput}
                helperText="Add relevant tags to help others find your discussion"
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {newDiscussion.tags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateDiscussion}
            variant="contained"
            color="primary"
          >
            Post Discussion
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Forum Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Beta Community Forum
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
        >
          Start Discussion
        </Button>
      </Box>
      
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={handleSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Sort by:
              </Typography>
              <Button
                size="small"
                endIcon={<SortIcon />}
                onClick={(e) => setMenuAnchorEl(e.currentTarget)}
              >
                {sortOption === 'newest' && 'Newest'}
                {sortOption === 'oldest' && 'Oldest'}
                {sortOption === 'most_upvoted' && 'Most Upvoted'}
                {sortOption === 'most_commented' && 'Most Commented'}
              </Button>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl) && !selectedDiscussion}
                onClose={() => setMenuAnchorEl(null)}
              >
                <MenuItem onClick={() => handleSortChange('newest')}>Newest</MenuItem>
                <MenuItem onClick={() => handleSortChange('oldest')}>Oldest</MenuItem>
                <MenuItem onClick={() => handleSortChange('most_upvoted')}>Most Upvoted</MenuItem>
                <MenuItem onClick={() => handleSortChange('most_commented')}>Most Commented</MenuItem>
              </Menu>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          aria-label="forum tabs"
        >
          <Tab label="All Discussions" />
          <Tab label="Pinned" />
          <Tab label="Bookmarked" />
          <Tab label="Feature Discussions" />
          <Tab label="Help & Support" />
        </Tabs>
      </Box>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Discussions List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredDiscussions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No discussions found
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {searchQuery ? 
              'No discussions match your search criteria.' :
              activeTab === 0 ?
                'There are no discussions yet.' :
                activeTab === 1 ?
                  'There are no pinned discussions.' :
                  activeTab === 2 ?
                    'You have no bookmarked discussions.' :
                    activeTab === 3 ?
                      'There are no feature discussions.' :
                      'There are no help & support discussions.'
            }
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateDialogOpen}
            sx={{ mt: 2 }}
          >
            Start a New Discussion
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sortedDiscussions.map(discussion => (
            <Grid item xs={12} key={discussion.id}>
              <Paper 
                variant="outlined"
                sx={{
                  p: 2,
                  position: 'relative',
                  bgcolor: discussion.pinned ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                  border: discussion.pinned ? '1px solid rgba(144, 202, 249, 0.5)' : '1px solid rgba(0, 0, 0, 0.12)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {/* Discussion Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ mr: 1 }}>
                      {discussion.title}
                    </Typography>
                    {discussion.pinned && (
                      <Chip 
                        label="Pinned" 
                        size="small" 
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, discussion)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                {/* Discussion Meta */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <Avatar 
                      src={discussion.author.avatar} 
                      alt={discussion.author.name}
                      sx={{ width: 24, height: 24 }}
                    />
                  </ListItemAvatar>
                  <Typography variant="body2" color="textSecondary">
                    {discussion.author.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mx: 1 }}>
                    •
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatDate(discussion.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mx: 1 }}>
                    •
                  </Typography>
                  <Chip 
                    label={discussion.category} 
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                </Box>
                
                {/* Discussion Content */}
                <Typography variant="body1" paragraph>
                  {discussion.content.length > 300 ?
                    `${discussion.content.slice(0, 300)}...` :
                    discussion.content
                  }
                </Typography>
                
                {/* Tags */}
                {discussion.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {discussion.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
                
                {/* Discussion Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<ThumbUpIcon />}
                      onClick={() => handleUpvote(discussion.id)}
                    >
                      {discussion.upvotes}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<CommentIcon />}
                      sx={{ ml: 1 }}
                    >
                      {discussion.commentCount}
                    </Button>
                  </Box>
                  
                  <Box>
                    {discussion.bookmarked ? (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleBookmark(discussion.id)}
                      >
                        <BookmarkedIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleBookmark(discussion.id)}
                      >
                        <BookmarkIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Discussion Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && Boolean(selectedDiscussion)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleBookmark(selectedDiscussion?.id)}>
          {selectedDiscussion?.bookmarked ? 'Remove Bookmark' : 'Bookmark'}
        </MenuItem>
        <MenuItem>View Discussion</MenuItem>
        <MenuItem>Share</MenuItem>
        <MenuItem>Report</MenuItem>
      </Menu>
    </Box>
  );
};

export default BetaCommunityForum; 