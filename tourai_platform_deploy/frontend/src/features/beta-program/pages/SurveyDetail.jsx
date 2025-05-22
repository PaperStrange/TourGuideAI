import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Breadcrumbs, 
  Link, 
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import surveyService from '../services/SurveyService';
import { Survey } from '../components/survey';

/**
 * Survey Detail Page
 * Displays a specific survey and allows the user to complete it
 */
const SurveyDetail = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const survey = await surveyService.getSurveyById(surveyId);
        setSurvey(survey);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError('Failed to load survey. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSurvey();
  }, [surveyId]);

  const handleSurveyComplete = async (responses) => {
    try {
      await surveyService.submitSurveyResponses(surveyId, responses);
      
      // Redirect to surveys page with success message
      navigate('/beta/surveys', { 
        state: { 
          successMessage: 'Survey completed successfully! Thank you for your feedback.' 
        } 
      });
    } catch (err) {
      console.error('Error submitting survey responses:', err);
      setError('Failed to submit survey. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/beta/surveys');
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading survey...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mb: 3 }}
          >
            Back to Surveys
          </Button>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  if (!survey) {
    return (
      <Container maxWidth="md">
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mb: 3 }}
          >
            Back to Surveys
          </Button>
          
          <Alert severity="info">
            Survey not found. It may have been removed or is no longer available.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/beta" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Link 
            component={RouterLink} 
            to="/beta/surveys" 
            underline="hover" 
            color="inherit"
          >
            Surveys
          </Link>
          <Typography color="text.primary">
            {survey.title}
          </Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {survey.title}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {survey.description}
          </Typography>
          
          {survey.instructions && (
            <Typography variant="body2" sx={{ mb: 3 }}>
              <strong>Instructions:</strong> {survey.instructions}
            </Typography>
          )}
          
          <Box mt={4}>
            <Survey 
              survey={survey} 
              onComplete={handleSurveyComplete} 
              onError={error => setError(error)} 
            />
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SurveyDetail; 