import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  useTheme
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import surveyService from '../../services/SurveyService';

/**
 * Survey List Component
 * Displays a list of available surveys for beta users
 */
const SurveyList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSurveys();
  }, []);

  /**
   * Fetch available surveys
   */
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await surveyService.getSurveys();
      setSurveys(data);
    } catch (err) {
      setError('Failed to load surveys. Please try again later.');
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to a survey
   */
  const handleOpenSurvey = (surveyId) => {
    navigate(`/beta/surveys/${surveyId}`);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  /**
   * Render survey cards
   */
  const renderSurveys = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      );
    }

    if (surveys.length === 0) {
      return (
        <Box textAlign="center" p={4}>
          <Typography variant="h6" color="text.secondary">
            No surveys available at the moment
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Check back later for new surveys
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {surveys.map((survey) => (
          <Grid item xs={12} md={6} lg={4} key={survey.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssignmentIcon 
                    color="primary" 
                    sx={{ mr: 1, fontSize: 28 }} 
                  />
                  <Typography variant="h6" component="h3">
                    {survey.title}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {survey.description || 'Help us improve our product by completing this survey.'}
                </Typography>
                
                <Box mt={2} mb={1}>
                  {survey.category && (
                    <Chip 
                      label={survey.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                  
                  {survey.status === 'completed' && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Completed"
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                  
                  {survey.estimatedTimeMinutes && (
                    <Chip
                      label={`${survey.estimatedTimeMinutes} min`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center">
                    <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(survey.createdAt)}
                    </Typography>
                  </Box>
                  
                  {survey.responses !== undefined && (
                    <Box display="flex" alignItems="center">
                      <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {survey.responses} {survey.responses === 1 ? 'response' : 'responses'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
              
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={() => handleOpenSurvey(survey.id)}
                  disabled={survey.status === 'completed'}
                  fullWidth
                >
                  {survey.status === 'completed' ? 'Completed' : 'Take Survey'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Surveys
        </Typography>
        
        <Button 
          variant="outlined" 
          onClick={fetchSurveys}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {renderSurveys()}
    </Box>
  );
};

export default SurveyList; 