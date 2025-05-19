import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Button,
  Breadcrumbs,
  Link,
  Divider,
  useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import surveyService from '../../services/SurveyService';
import Survey from './Survey';

/**
 * Survey Details Component
 * Displays a single survey and allows users to take it
 */
const SurveyDetails = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  /**
   * Fetch survey details
   */
  const fetchSurvey = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await surveyService.getSurveyById(surveyId);
      setSurvey(data);
      
      // Check if the user has already completed this survey
      if (data.status === 'completed') {
        setCompleted(true);
      }
    } catch (err) {
      setError('Failed to load survey. Please try again later.');
      console.error('Error fetching survey:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle survey completion
   */
  const handleSurveyComplete = async (responses) => {
    try {
      setSubmitting(true);
      await surveyService.submitSurveyResponses(surveyId, responses);
      setCompleted(true);
    } catch (error) {
      console.error('Error submitting survey:', error);
      setError('Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle error during survey submission
   */
  const handleSurveyError = (error) => {
    setError(`Survey error: ${error.message || 'Unknown error occurred'}`);
  };

  /**
   * Navigate back to the surveys list
   */
  const handleBackToSurveys = () => {
    navigate('/beta/surveys');
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
   * Render completion message
   */
  const renderCompletionMessage = () => {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Thank you for your feedback!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your responses have been submitted successfully. Your feedback helps us improve our product.
        </Typography>
        <Button
          variant="contained"
          onClick={handleBackToSurveys}
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Surveys
        </Button>
      </Paper>
    );
  };

  /**
   * Render survey content
   */
  const renderSurveyContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 3, mb: 3 }}>
          {error}
        </Alert>
      );
    }

    if (!survey) {
      return (
        <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
          Survey not found.
        </Alert>
      );
    }

    if (completed) {
      return renderCompletionMessage();
    }

    return (
      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <AssignmentIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            {survey.title}
          </Typography>
        </Box>
        
        {survey.description && (
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            {survey.description}
          </Typography>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            Created: {formatDate(survey.createdAt)}
          </Typography>
          {survey.estimatedTimeMinutes && (
            <Typography variant="caption" color="text.secondary" component="div">
              Estimated time: {survey.estimatedTimeMinutes} minutes
            </Typography>
          )}
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {submitting ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
          </Box>
        ) : (
          <Survey 
            survey={survey} 
            onComplete={handleSurveyComplete}
            onError={handleSurveyError}
          />
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Box mb={3}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          <Link 
            color="inherit" 
            onClick={handleBackToSurveys}
            sx={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowBackIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Surveys
          </Link>
          <Typography color="text.primary">
            {loading ? 'Loading...' : survey?.title || 'Survey Details'}
          </Typography>
        </Breadcrumbs>
      </Box>
      
      {renderSurveyContent()}
    </Box>
  );
};

export default SurveyDetails; 