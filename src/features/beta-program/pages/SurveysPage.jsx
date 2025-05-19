import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Breadcrumbs, 
  Link, 
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  LinearProgress,
  IconButton,
  useTheme
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssignmentIcon from '@mui/icons-material/Assignment';
import surveyService from '../services/SurveyService';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

/**
 * Surveys Page
 * Displays a list of available surveys for the beta user
 */
const SurveysPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch surveys on component mount
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const surveys = await surveyService.getSurveys();
        setSurveys(surveys);
      } catch (err) {
        console.error('Error fetching surveys:', err);
        setError('Failed to load surveys. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSurveys();
  }, []);

  // Handle navigating to a survey
  const handleStartSurvey = (surveyId) => {
    navigate(`/beta/surveys/${surveyId}`);
  };

  // Get status color based on survey status
  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return theme.palette.info.main;
      case 'in_progress':
        return theme.palette.warning.main;
      case 'completed':
        return theme.palette.success.main;
      case 'expired':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Calculate progress percentage for in-progress surveys
  const getProgressPercentage = (survey) => {
    if (survey.status === 'in_progress') {
      return Math.round((survey.completedQuestions / survey.totalQuestions) * 100);
    }
    
    if (survey.status === 'completed') {
      return 100;
    }
    
    return 0;
  };

  // Format estimated time in minutes
  const formatEstimatedTime = (minutes) => {
    if (minutes < 1) {
      return 'Less than a minute';
    }
    
    if (minutes === 1) {
      return '1 minute';
    }
    
    return `${minutes} minutes`;
  };

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/beta" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Surveys</Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Surveys
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete surveys to provide feedback and help improve TourGuideAI
            </Typography>
          </Box>
        </Box>
        
        {loading ? (
          <Box textAlign="center" py={6}>
            <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading surveys...
            </Typography>
            <LinearProgress sx={{ maxWidth: 300, mx: 'auto' }} />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" paragraph>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </Paper>
        ) : surveys.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No surveys available right now
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Check back later for new opportunities to provide feedback
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {surveys.map(survey => (
              <Grid item xs={12} md={6} lg={4} key={survey.id}>
                <Card 
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Chip
                        label={survey.status === 'new' ? 'New' : 
                               survey.status === 'in_progress' ? 'In Progress' :
                               survey.status === 'completed' ? 'Completed' : 'Expired'}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(survey.status),
                          color: '#fff'
                        }}
                      />
                      {survey.rewardPoints > 0 && (
                        <Chip
                          label={`${survey.rewardPoints} Points`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                    
                    <Typography variant="h5" component="h2" gutterBottom>
                      {survey.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {survey.description}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatEstimatedTime(survey.estimatedTimeMinutes)}
                      </Typography>
                    </Box>
                    
                    {survey.category && (
                      <Chip
                        label={survey.category}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                    
                    {survey.status === 'in_progress' && (
                      <Box mt={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getProgressPercentage(survey)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={getProgressPercentage(survey)} 
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    )}
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions>
                    <Button
                      fullWidth
                      variant={survey.status === 'completed' ? 'outlined' : 'contained'}
                      color={survey.status === 'completed' ? 'success' : 'primary'}
                      onClick={() => handleStartSurvey(survey.id)}
                      startIcon={survey.status === 'completed' ? <CheckCircleIcon /> : <PlayArrowIcon />}
                      disabled={survey.status === 'expired'}
                    >
                      {survey.status === 'new' ? 'Start Survey' : 
                       survey.status === 'in_progress' ? 'Continue Survey' :
                       survey.status === 'completed' ? 'View Responses' : 'Expired'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default SurveysPage; 