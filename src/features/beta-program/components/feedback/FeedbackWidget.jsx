import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Collapse,
  Fade
} from '@mui/material';
import {
  Close as CloseIcon,
  Feedback as FeedbackIcon,
  Camera as CameraIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import feedbackService from '../../services/feedback/FeedbackService';
import html2canvas from 'html2canvas';

/**
 * Feedback Widget component
 * Provides a floating button that expands into a feedback form
 */
const FeedbackWidget = () => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [screenshotData, setScreenshotData] = useState(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  
  // Refs
  const widgetRef = useRef(null);
  
  // Feedback types
  const feedbackTypes = [
    { value: 'general', label: 'General Feedback' },
    { value: 'bug', label: 'Report a Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'ux', label: 'User Experience' },
    { value: 'performance', label: 'Performance Issue' }
  ];
  
  // Toggle widget open/closed
  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsExpanded(false);
      setFeedbackText('');
      setFeedbackType('general');
      setScreenshotData(null);
      setError(null);
      setSuccess(false);
    }
  };
  
  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle feedback type change
  const handleTypeChange = (event) => {
    setFeedbackType(event.target.value);
  };
  
  // Handle feedback text change
  const handleTextChange = (event) => {
    setFeedbackText(event.target.value);
  };
  
  // Capture screenshot
  const captureScreenshot = async () => {
    try {
      setIsCapturingScreenshot(true);
      
      // Hide the widget temporarily for screenshot
      if (widgetRef.current) {
        widgetRef.current.style.display = 'none';
      }
      
      // Capture the screen
      const canvas = await html2canvas(document.body);
      const screenshot = canvas.toDataURL('image/png');
      
      // Show the widget again
      if (widgetRef.current) {
        widgetRef.current.style.display = 'block';
      }
      
      setScreenshotData(screenshot);
      setIsCapturingScreenshot(false);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      setError('Failed to capture screenshot. Please try again.');
      setIsCapturingScreenshot(false);
      
      // Make sure widget is visible again
      if (widgetRef.current) {
        widgetRef.current.style.display = 'block';
      }
    }
  };
  
  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshotData(null);
  };
  
  // Submit feedback
  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      setError('Please provide feedback text');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await feedbackService.submitFeedback({
        type: feedbackType,
        content: feedbackText,
        screenshot: screenshotData
      });
      
      setSuccess(true);
      setFeedbackText('');
      setScreenshotData(null);
      
      // Close the widget after a delay
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Close the success message
  const handleCloseSuccess = () => {
    setSuccess(false);
  };
  
  // Close the error message
  const handleCloseError = () => {
    setError(null);
  };
  
  return (
    <Box 
      ref={widgetRef}
      sx={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}
    >
      {/* Success message */}
      <Snackbar 
        open={success} 
        autoHideDuration={3000} 
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSuccess} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Feedback submitted successfully!
        </Alert>
      </Snackbar>
      
      {/* Error message */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={5000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
      
      {/* Feedback widget */}
      <Fade in={isOpen}>
        <Paper 
          elevation={3} 
          sx={{ 
            width: 320,
            mb: 2,
            overflow: 'hidden',
            display: isOpen ? 'block' : 'none'
          }}
        >
          {/* Header */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              px: 2,
              py: 1
            }}
          >
            <Typography variant="subtitle1">
              Provide Feedback
            </Typography>
            <IconButton 
              size="small" 
              onClick={toggleWidget}
              sx={{ color: 'primary.contrastText' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Basic feedback form */}
          <Box sx={{ p: 2 }}>
            <FormControl 
              fullWidth 
              variant="outlined" 
              margin="normal" 
              size="small"
            >
              <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
              <Select
                labelId="feedback-type-label"
                id="feedback-type"
                value={feedbackType}
                onChange={handleTypeChange}
                label="Feedback Type"
                disabled={loading}
              >
                {feedbackTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              margin="normal"
              label="Your Feedback"
              placeholder="Tell us what you think..."
              value={feedbackText}
              onChange={handleTextChange}
              disabled={loading}
            />
            
            {/* Screenshot preview */}
            {screenshotData && (
              <Box 
                sx={{ 
                  mt: 1, 
                  position: 'relative', 
                  width: '100%',
                  height: 150,
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <img 
                  src={screenshotData} 
                  alt="Screenshot" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    }
                  }}
                  onClick={removeScreenshot}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* Advanced options */}
            <Box sx={{ mt: 2 }}>
              <Box 
                onClick={toggleExpanded}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'text.secondary'
                }}
              >
                <ExpandMoreIcon 
                  sx={{ 
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.3s'
                  }} 
                />
                <Typography variant="body2">
                  Advanced Options
                </Typography>
              </Box>
              
              <Collapse in={isExpanded}>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Tooltip title="Take Screenshot">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CameraIcon />}
                      onClick={captureScreenshot}
                      disabled={loading || isCapturingScreenshot}
                    >
                      {isCapturingScreenshot ? (
                        <CircularProgress size={20} />
                      ) : (
                        'Screenshot'
                      )}
                    </Button>
                  </Tooltip>
                </Box>
              </Collapse>
            </Box>
            
            {/* Submit button */}
            <Box 
              sx={{ 
                mt: 2, 
                display: 'flex', 
                justifyContent: 'flex-end' 
              }}
            >
              <Button
                variant="contained"
                color="primary"
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={submitFeedback}
                disabled={loading || !feedbackText.trim()}
              >
                Submit
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>
      
      {/* Toggle button */}
      <Tooltip title={isOpen ? "Close Feedback" : "Provide Feedback"}>
        <Button
          variant="contained"
          color="primary"
          aria-label="feedback"
          onClick={toggleWidget}
          startIcon={<FeedbackIcon />}
          sx={{ 
            borderRadius: '50%',
            minWidth: '56px',
            width: '56px',
            height: '56px',
            p: 0,
            '& .MuiButton-startIcon': {
              margin: 0
            }
          }}
        >
          <span className="sr-only">Feedback</span>
        </Button>
      </Tooltip>
    </Box>
  );
};

export default FeedbackWidget; 