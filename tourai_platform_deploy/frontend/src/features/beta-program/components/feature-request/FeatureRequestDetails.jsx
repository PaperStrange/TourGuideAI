import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Button,
  IconButton,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  Breadcrumbs,
  Link,
  useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import SendIcon from '@mui/icons-material/Send';
import FlagIcon from '@mui/icons-material/Flag';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import featureRequestService from '../../services/FeatureRequestService';

/**
 * Feature Request Details Component
 * Displays the details of a feature request, comments, and voting functionality
 */
const FeatureRequestDetails = () => {
  const { requestId } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userVoted, setUserVoted] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);

  useEffect(() => {
    fetchFeatureRequest();
  }, [requestId]);

  // Fetch feature request details
  const fetchFeatureRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await featureRequestService.getFeatureRequestById(requestId);
      setRequest(data);
      
      // Demo: Simulate if user has voted on this request
      setUserVoted(Math.random() > 0.5);
    } catch (err) {
      console.error('Error fetching feature request:', err);
      setError('Failed to load feature request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigating back to list
  const handleBack = () => {
    navigate('/beta/feature-requests');
  };

  // Handle voting on the feature request
  const handleToggleVote = async () => {
    try {
      // Optimistic update
      setUserVoted(!userVoted);
      
      // Update local vote count optimistically
      setRequest(prev => ({
        ...prev,
        votes: prev.votes + (userVoted ? -1 : 1)
      }));
      
      // Call API
      await featureRequestService.voteOnFeatureRequest(requestId, !userVoted);
      
      // No need to refresh as we updated optimistically
    } catch (err) {
      console.error('Error toggling vote:', err);
      
      // Revert optimistic update on error
      setUserVoted(!userVoted);
      setRequest(prev => ({
        ...prev,
        votes: prev.votes + (userVoted ? 1 : -1)
      }));
      
      alert('Failed to update vote. Please try again.');
    }
  };

  // Handle comment input change
  const handleCommentChange = (e) => {
    setCommentInput(e.target.value);
    if (commentError) setCommentError(null);
  };

  // Handle submitting a comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!commentInput.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }
    
    try {
      setSubmittingComment(true);
      setCommentError(null);
      
      const newComment = await featureRequestService.addComment(requestId, commentInput);
      
      // Update request with new comment
      setRequest(prev => ({
        ...prev,
        comments: [...(Array.isArray(prev.comments) ? prev.comments : []), newComment]
      }));
      
      // Clear input
      setCommentInput('');
    } catch (err) {
      console.error('Error submitting comment:', err);
      setCommentError(err.message || 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Get status color
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
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Requests
        </Button>
        
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  // Render not found state
  if (!request) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Requests
        </Button>
        
        <Alert severity="info">
          Feature request not found.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Breadcrumbs separator="›">
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={handleBack}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <ArrowBackIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Feature Requests
          </Link>
          <Typography color="text.primary">
            {request.title}
          </Typography>
        </Breadcrumbs>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Chip
                  label={getStatusLabel(request.status)}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(request.status),
                    color: '#fff',
                    mb: 2
                  }}
                />
                <Typography variant="h4" component="h1" gutterBottom>
                  {request.title}
                </Typography>
              </Box>
              
              <Button
                variant={userVoted ? "contained" : "outlined"}
                color="primary"
                startIcon={userVoted ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                onClick={handleToggleVote}
              >
                {userVoted ? 'Upvoted' : 'Upvote'} ({request.votes})
              </Button>
            </Box>
            
            <Typography variant="body1" paragraph>
              {request.description}
            </Typography>
            
            <Box display="flex" alignItems="center" mt={2} mb={1}>
              <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Requested by {request.userName}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" mb={2}>
              <ScheduleIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Submitted on {formatDate(request.createdAt)}
              </Typography>
            </Box>
            
            <Box mt={2}>
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
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comments
            </Typography>
            
            <Box component="form" onSubmit={handleSubmitComment} mb={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Add your comment..."
                value={commentInput}
                onChange={handleCommentChange}
                error={!!commentError}
                helperText={commentError}
                sx={{ mb: 2 }}
              />
              
              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  disabled={submittingComment || !commentInput.trim()}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {Array.isArray(request.comments) && request.comments.length > 0 ? (
              <List>
                {request.comments.map(comment => (
                  <ListItem
                    key={comment.id}
                    alignItems="flex-start"
                    sx={{ px: 0, py: 2 }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {comment.userName.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">
                            {comment.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(comment.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Typography variant="body2" color="text.primary">
                            {comment.content}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No comments yet. Be the first to add one!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Information
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box mb={2}>
                <Typography variant="subtitle2">
                  Current Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getStatusLabel(request.status)}
                </Typography>
              </Box>
              
              {request.status === 'planned' && request.plannedReleaseVersion && (
                <Box mb={2}>
                  <Typography variant="subtitle2">
                    Planned Release
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version {request.plannedReleaseVersion}
                  </Typography>
                </Box>
              )}
              
              {request.status === 'in_progress' && request.assignedDeveloper && (
                <Box mb={2}>
                  <Typography variant="subtitle2">
                    Assigned Team
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {request.assignedDeveloper}
                  </Typography>
                </Box>
              )}
              
              {request.status === 'in_progress' && request.estimatedCompletion && (
                <Box mb={2}>
                  <Typography variant="subtitle2">
                    Estimated Completion
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(request.estimatedCompletion)}
                  </Typography>
                </Box>
              )}
              
              {request.status === 'implemented' && request.implementedVersion && (
                <Box mb={2}>
                  <Typography variant="subtitle2">
                    Implemented In
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version {request.implementedVersion}
                  </Typography>
                </Box>
              )}
              
              {request.status === 'implemented' && request.releaseDate && (
                <Box mb={2}>
                  <Typography variant="subtitle2">
                    Release Date
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(request.releaseDate)}
                  </Typography>
                </Box>
              )}
              
              <Box mb={2}>
                <Typography variant="subtitle2">
                  Implementation Difficulty
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {request.implementationDifficulty === 'undetermined' 
                    ? 'Under assessment' 
                    : request.implementationDifficulty.charAt(0).toUpperCase() + 
                      request.implementationDifficulty.slice(1)}
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2">
                  Business Value
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {request.businessValue === 'undetermined' 
                    ? 'Under assessment' 
                    : request.businessValue.charAt(0).toUpperCase() + 
                      request.businessValue.slice(1)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Similar Requests
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These requests are similar or related to this one.
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <List sx={{ p: 0 }}>
                <ListItem
                  button
                  onClick={() => navigate('/beta/feature-requests/feature_2')}
                >
                  <ListItemText
                    primary="Dark mode theme"
                    secondary={
                      <Box display="flex" alignItems="center">
                        <Chip
                          label="Planned"
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor('planned'),
                            color: '#fff',
                            mr: 1,
                            height: 20,
                            fontSize: '0.6rem'
                          }}
                        />
                        <ThumbUpIcon fontSize="small" sx={{ mr: 0.5, fontSize: 12 }} />
                        <Typography variant="caption">78</Typography>
                      </Box>
                    }
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem
                  button
                  onClick={() => navigate('/beta/feature-requests/feature_5')}
                >
                  <ListItemText
                    primary="Image annotation tools"
                    secondary={
                      <Box display="flex" alignItems="center">
                        <Chip
                          label="New"
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor('new'),
                            color: '#fff',
                            mr: 1,
                            height: 20,
                            fontSize: '0.6rem'
                          }}
                        />
                        <ThumbUpIcon fontSize="small" sx={{ mr: 0.5, fontSize: 12 }} />
                        <Typography variant="caption">12</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FeatureRequestDetails; 