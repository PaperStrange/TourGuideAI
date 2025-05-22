import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FeedbackIcon from '@mui/icons-material/Feedback';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import surveyService from '../services/SurveyService';
import featureRequestService from '../services/FeatureRequestService';

/**
 * Beta Dashboard
 * Main dashboard for beta program participants
 */
const BetaDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingSurveys, setPendingSurveys] = useState([]);
  const [topFeatureRequests, setTopFeatureRequests] = useState([]);
  const [userStats, setUserStats] = useState({
    completedSurveys: 0,
    featureRequestsSubmitted: 0,
    feedbackProvided: 0,
    rewardPoints: 125,
    rank: 'Bronze',
    participationDays: 15
  });

  // Get user stats and data when component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch pending surveys
        const surveys = await surveyService.getSurveys();
        const activeSurveys = surveys.filter(s => s.status === 'new' || s.status === 'in_progress');
        setPendingSurveys(activeSurveys.slice(0, 3)); // Top 3 active surveys
        
        // Fetch top feature requests
        const requests = await featureRequestService.getFeatureRequests({ sortBy: 'votes', sortDesc: true });
        setTopFeatureRequests(requests.slice(0, 3)); // Top 3 feature requests by votes
        
        // Update user stats with mock data
        setUserStats({
          completedSurveys: 8,
          featureRequestsSubmitted: 3,
          feedbackProvided: 12,
          rewardPoints: 125,
          rank: 'Bronze',
          participationDays: 15
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Get participation level as a percentage (max is 30 days)
  const getParticipationPercentage = () => {
    return Math.min(100, (userStats.participationDays / 30) * 100);
  };

  // Get rank color
  const getRankColor = () => {
    switch (userStats.rank) {
      case 'Bronze':
        return '#CD7F32';
      case 'Silver':
        return '#C0C0C0';
      case 'Gold':
        return '#FFD700';
      case 'Platinum':
        return '#E5E4E2';
      default:
        return theme.palette.primary.main;
    }
  };

  // Handle navigating to a survey
  const handleGoToSurvey = (surveyId) => {
    navigate(`/beta/surveys/${surveyId}`);
  };

  // Handle navigating to feature requests
  const handleGoToFeatureRequests = () => {
    navigate('/beta/feature-requests');
  };

  // Handle navigating to a specific feature request
  const handleGoToFeatureRequest = (requestId) => {
    navigate(`/beta/feature-requests/${requestId}`);
  };

  // Handle going to surveys
  const handleGoToSurveys = () => {
    navigate('/beta/surveys');
  };

  // Handle going to feedback page
  const handleGoToFeedback = () => {
    navigate('/beta/feedback');
  };

  // Get status color for a feature request
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

  // Format status label
  const getStatusLabel = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Beta Program Dashboard
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Welcome to the TourGuideAI Beta Program. Your participation helps us improve the platform.
        </Typography>
        
        <Grid container spacing={3}>
          {/* User Stats Section */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    bgcolor: theme.palette.primary.main,
                    mr: 2
                  }}
                >
                  <PersonIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="div">
                    Beta Tester
                  </Typography>
                  <Chip 
                    label={userStats.rank} 
                    size="small"
                    sx={{ 
                      bgcolor: getRankColor(),
                      color: userStats.rank === 'Bronze' || userStats.rank === 'Gold' ? '#000' : '#fff' 
                    }}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Participation Level
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={getParticipationPercentage()} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {userStats.participationDays}/30 days
                </Typography>
              </Box>
              
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Reward Points
                </Typography>
                <Box display="flex" alignItems="center">
                  <StarIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
                  <Typography variant="h6" component="div">
                    {userStats.rewardPoints} points
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List disablePadding>
                <ListItem disableGutters disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${userStats.completedSurveys} surveys completed`}
                  />
                </ListItem>
                <ListItem disableGutters disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LightbulbIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${userStats.featureRequestsSubmitted} feature requests submitted`}
                  />
                </ListItem>
                <ListItem disableGutters disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ForumIcon color="info" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${userStats.feedbackProvided} feedback items provided`}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          {/* Pending Surveys Section */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    Pending Surveys
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={handleGoToSurveys}
                >
                  View All
                </Button>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {pendingSurveys.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No pending surveys available right now
                </Typography>
              ) : (
                <List disablePadding>
                  {pendingSurveys.map(survey => (
                    <ListItem 
                      key={survey.id}
                      disablePadding
                      sx={{
                        mb: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        '&:last-child': { mb: 0 }
                      }}
                    >
                      <ListItemAvatar sx={{ pl: 1 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={survey.title}
                        secondary={`${survey.estimatedTimeMinutes} min • ${survey.rewardPoints || 0} points`}
                        sx={{ pr: 2 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => handleGoToSurvey(survey.id)}
                        startIcon={survey.status === 'in_progress' ? <PlayArrowIcon /> : null}
                        sx={{ mr: 2 }}
                      >
                        {survey.status === 'in_progress' ? 'Continue' : 'Start'}
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
          
          {/* Top Feature Requests */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <LightbulbIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    Top Feature Requests
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={handleGoToFeatureRequests}
                >
                  View All
                </Button>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {topFeatureRequests.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No feature requests available
                </Typography>
              ) : (
                <List disablePadding>
                  {topFeatureRequests.map(request => (
                    <ListItem 
                      key={request.id}
                      onClick={() => handleGoToFeatureRequest(request.id)}
                      button
                      sx={{
                        mb: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: theme.palette.action.hover }
                      }}
                    >
                      <ListItemIcon>
                        <Chip
                          label={getStatusLabel(request.status)}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(request.status),
                            color: '#fff',
                            minWidth: 80,
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={request.title}
                        secondary={`${request.votes} votes`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/beta/feature-requests/new')}
                  startIcon={<LightbulbIcon />}
                >
                  Submit New Idea
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Quick Actions Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <BarChartIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Beta Program Statistics
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Surveys Completed
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                        {userStats.completedSurveys}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Program total: 256
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Feature Requests
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                        {userStats.featureRequestsSubmitted}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Program total: 94
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Feedback Provided
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                        {userStats.feedbackProvided}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Program total: 325
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Beta Testers
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                        68
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Active today: 42
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box display="flex" justifyContent="center" mt={3}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleGoToFeedback}
                  startIcon={<FeedbackIcon />}
                >
                  Provide General Feedback
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default BetaDashboard; 