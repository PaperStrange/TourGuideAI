import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Breadcrumbs, 
  Link,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Divider,
  FormHelperText
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import BugReportIcon from '@mui/icons-material/BugReport';
import FeedbackIcon from '@mui/icons-material/Feedback';

/**
 * Feedback Page
 * Allows users to submit general feedback about the beta program
 */
const FeedbackPage = () => {
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});

  const handleFeedbackTypeChange = (e) => {
    setFeedbackType(e.target.value);
    
    // Clear any existing errors
    if (errors.feedbackType) {
      setErrors(prev => ({...prev, feedbackType: null}));
    }
  };

  const handleFeedbackTextChange = (e) => {
    setFeedbackText(e.target.value);
    
    // Clear any existing errors
    if (errors.feedbackText) {
      setErrors(prev => ({...prev, feedbackText: null}));
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    
    // Clear any existing errors
    if (errors.email) {
      setErrors(prev => ({...prev, email: null}));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!feedbackType) {
      newErrors.feedbackType = 'Please select a feedback type';
    }
    
    if (!feedbackText.trim()) {
      newErrors.feedbackText = 'Please enter your feedback';
    } else if (feedbackText.trim().length < 10) {
      newErrors.feedbackText = 'Feedback must be at least 10 characters';
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Submit feedback
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success
      setSubmitSuccess(true);
      
      // Reset form
      setFeedbackType('');
      setFeedbackText('');
      setEmail('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSnackbarClose = () => {
    setSubmitSuccess(false);
  };

  const getFeedbackTypeIcon = (type) => {
    switch (type) {
      case 'suggestion':
        return <ThumbUpIcon />;
      case 'bug':
        return <BugReportIcon />;
      case 'general':
        return <FeedbackIcon />;
      default:
        return <FeedbackIcon />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/beta" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Feedback</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" gutterBottom>
          Provide Feedback
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Your feedback helps us improve TourGuideAI. Let us know what you think!
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Submit Feedback
              </Typography>
              
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <FormControl 
                  fullWidth 
                  margin="normal" 
                  error={!!errors.feedbackType}
                >
                  <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
                  <Select
                    labelId="feedback-type-label"
                    id="feedback-type"
                    value={feedbackType}
                    label="Feedback Type"
                    onChange={handleFeedbackTypeChange}
                  >
                    <MenuItem value="general">
                      <Box display="flex" alignItems="center">
                        <FeedbackIcon sx={{ mr: 1 }} />
                        General Feedback
                      </Box>
                    </MenuItem>
                    <MenuItem value="suggestion">
                      <Box display="flex" alignItems="center">
                        <ThumbUpIcon sx={{ mr: 1 }} />
                        Suggestion
                      </Box>
                    </MenuItem>
                    <MenuItem value="bug">
                      <Box display="flex" alignItems="center">
                        <BugReportIcon sx={{ mr: 1 }} />
                        Bug Report
                      </Box>
                    </MenuItem>
                  </Select>
                  {errors.feedbackType && (
                    <FormHelperText>{errors.feedbackType}</FormHelperText>
                  )}
                </FormControl>
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="feedback-text"
                  label="Your Feedback"
                  multiline
                  rows={6}
                  value={feedbackText}
                  onChange={handleFeedbackTextChange}
                  error={!!errors.feedbackText}
                  helperText={errors.feedbackText}
                />
                
                <TextField
                  margin="normal"
                  fullWidth
                  id="email"
                  label="Email (optional for follow-up)"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!errors.email}
                  helperText={errors.email}
                />
                
                {submitError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {submitError}
                  </Alert>
                )}
                
                <Box display="flex" justifyContent="flex-end" mt={3}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    endIcon={<SendIcon />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback Guidelines
                </Typography>
                
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body2" paragraph>
                  When providing feedback, please consider the following guidelines:
                </Typography>
                
                <Typography variant="body2" component="div">
                  <ul>
                    <li>Be specific and provide details</li>
                    <li>Include steps to reproduce for bug reports</li>
                    <li>Let us know what you expected vs. what happened</li>
                    <li>Screenshots are helpful (you can attach them in bug reports)</li>
                    <li>For suggestions, explain the problem you're trying to solve</li>
                  </ul>
                </Typography>
                
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    All feedback is reviewed by our team and helps prioritize improvements.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Box mt={3}>
              <Typography variant="body2" color="text.secondary">
                Looking for more ways to help?
              </Typography>
              <Box mt={1} display="flex" flexDirection="column" gap={1}>
                <Button 
                  component={RouterLink} 
                  to="/beta/surveys"
                  variant="outlined"
                >
                  Complete Surveys
                </Button>
                <Button 
                  component={RouterLink} 
                  to="/beta/feature-requests"
                  variant="outlined"
                >
                  Vote on Feature Requests
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Snackbar
        open={submitSuccess}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Thank you for your feedback! We appreciate your input.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FeedbackPage; 