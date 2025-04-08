import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Avatar, 
  Card,
  CardContent,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  InputAdornment
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';
import { apiHelpers } from '../../../../core/services/apiClient';

/**
 * User Profile Setup Component
 * Allows beta users to create their profile during onboarding
 */
const UserProfileSetup = ({ initialData = {}, onComplete }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    username: initialData.username || '',
    profilePicture: initialData.profilePicture || null
  });
  
  const [preview, setPreview] = useState(null);
  const [validating, setValidating] = useState({
    username: false,
    email: false
  });
  const [validation, setValidation] = useState({
    name: null,
    email: null,
    username: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Generate preview URL for the selected profile image
  useEffect(() => {
    if (formData.profilePicture && typeof formData.profilePicture === 'object') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(formData.profilePicture);
    } else if (formData.profilePicture && typeof formData.profilePicture === 'string') {
      // If it's already a URL string
      setPreview(formData.profilePicture);
    } else {
      setPreview(null);
    }
  }, [formData.profilePicture]);
  
  /**
   * Handle input field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation errors when field changes
    if (validation[name]) {
      setValidation(prev => ({
        ...prev,
        [name]: null
      }));
    }
    
    // Real-time validation for some fields
    if (name === 'email') {
      validateEmail(value, false);
    } else if (name === 'username') {
      validateUsername(value, false);
    }
  };
  
  /**
   * Handle profile picture selection
   */
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Selected file must be an image');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        profilePicture: file
      }));
      setError(null);
    }
  };
  
  /**
   * Remove the selected profile picture
   */
  const handleRemoveProfilePicture = () => {
    setFormData(prev => ({
      ...prev,
      profilePicture: null
    }));
    setPreview(null);
  };
  
  /**
   * Validate email format and availability
   */
  const validateEmail = async (email, showFeedback = true) => {
    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setValidation(prev => ({
        ...prev,
        email: { valid: false, message: 'Please enter a valid email address' }
      }));
      return false;
    }
    
    if (showFeedback) {
      setValidating(prev => ({ ...prev, email: true }));
    }
    
    try {
      // Check if the email is already in use
      const response = await apiHelpers.get(`/beta/validate-email?email=${encodeURIComponent(email)}`);
      
      setValidating(prev => ({ ...prev, email: false }));
      
      if (response.available) {
        setValidation(prev => ({
          ...prev,
          email: { valid: true, message: 'Email is available' }
        }));
        return true;
      } else {
        setValidation(prev => ({
          ...prev,
          email: { valid: false, message: 'Email is already in use' }
        }));
        return false;
      }
    } catch (err) {
      setValidating(prev => ({ ...prev, email: false }));
      setValidation(prev => ({
        ...prev,
        email: { valid: false, message: 'Unable to validate email' }
      }));
      return false;
    }
  };
  
  /**
   * Validate username format and availability
   */
  const validateUsername = async (username, showFeedback = true) => {
    // Basic username format validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setValidation(prev => ({
        ...prev,
        username: { 
          valid: false, 
          message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
        }
      }));
      return false;
    }
    
    if (showFeedback) {
      setValidating(prev => ({ ...prev, username: true }));
    }
    
    try {
      // Check if the username is already taken
      const response = await apiHelpers.get(`/beta/validate-username?username=${encodeURIComponent(username)}`);
      
      setValidating(prev => ({ ...prev, username: false }));
      
      if (response.available) {
        setValidation(prev => ({
          ...prev,
          username: { valid: true, message: 'Username is available' }
        }));
        return true;
      } else {
        setValidation(prev => ({
          ...prev,
          username: { valid: false, message: 'Username is already taken' }
        }));
        return false;
      }
    } catch (err) {
      setValidating(prev => ({ ...prev, username: false }));
      setValidation(prev => ({
        ...prev,
        username: { valid: false, message: 'Unable to validate username' }
      }));
      return false;
    }
  };
  
  /**
   * Validate name field
   */
  const validateName = (name) => {
    if (!name || name.trim().length < 2) {
      setValidation(prev => ({
        ...prev,
        name: { valid: false, message: 'Please enter your name (minimum 2 characters)' }
      }));
      return false;
    }
    
    setValidation(prev => ({
      ...prev,
      name: { valid: true, message: null }
    }));
    return true;
  };
  
  /**
   * Validate all form fields
   */
  const validateForm = async () => {
    const nameValid = validateName(formData.name);
    const emailValid = await validateEmail(formData.email);
    const usernameValid = await validateUsername(formData.username);
    
    return nameValid && emailValid && usernameValid;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    
    const isValid = await validateForm();
    
    if (!isValid) {
      setLoading(false);
      setError('Please fix the validation errors before proceeding');
      return;
    }
    
    try {
      // In a real implementation, this would upload the profile picture and save the profile
      if (formData.profilePicture && typeof formData.profilePicture === 'object') {
        // Simulate file upload
        // In a real app, you would use FormData and send it to the server
        console.log('Uploading profile picture...');
        // Simulate a successful upload that returns a URL
        formData.profilePicture = URL.createObjectURL(formData.profilePicture);
      }
      
      // Call the completion callback with the profile data
      onComplete(formData);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
      setLoading(false);
    }
  };
  
  /**
   * Get validation feedback for a field
   */
  const getFieldFeedback = (fieldName) => {
    if (!validation[fieldName]) return null;
    
    const { valid, message } = validation[fieldName];
    
    if (valid) {
      return (
        <InputAdornment position="end">
          <CheckCircleIcon color="success" />
        </InputAdornment>
      );
    } else {
      return (
        <InputAdornment position="end">
          <ErrorIcon color="error" />
        </InputAdornment>
      );
    }
  };
  
  return (
    <Card sx={{ maxWidth: 700, mx: 'auto', boxShadow: 0 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Create Your Profile
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph align="center">
          Set up your profile information for the beta program.
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            {/* Profile Picture */}
            <Grid item xs={12} display="flex" justifyContent="center">
              <Box textAlign="center">
                <Avatar
                  src={preview}
                  sx={{
                    width: 120,
                    height: 120,
                    mb: 2,
                    bgcolor: 'primary.main'
                  }}
                >
                  {!preview && (formData.name ? formData.name.charAt(0).toUpperCase() : 'U')}
                </Avatar>
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                  >
                    {preview ? 'Change Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                    />
                  </Button>
                  
                  {preview && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleRemoveProfilePicture}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
                
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Max size: 5MB. Recommended: 400x400px
                </Typography>
              </Box>
            </Grid>
            
            {/* Name Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
                placeholder="Enter your full name"
                helperText={validation.name?.message || "Your name as you'd like it to appear in the beta program"}
                error={validation.name?.valid === false}
                InputProps={{
                  endAdornment: getFieldFeedback('name')
                }}
                required
              />
            </Grid>
            
            {/* Email Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                placeholder="your@email.com"
                helperText={validation.email?.message || "We'll send beta invites to this email"}
                error={validation.email?.valid === false}
                InputProps={{
                  endAdornment: validating.email ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : getFieldFeedback('email')
                }}
                required
              />
            </Grid>
            
            {/* Username Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                variant="outlined"
                placeholder="username"
                helperText={validation.username?.message || "Choose a unique username (3-20 characters)"}
                error={validation.username?.valid === false}
                InputProps={{
                  startAdornment: <InputAdornment position="start">@</InputAdornment>,
                  endAdornment: validating.username ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : getFieldFeedback('username')
                }}
                required
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ minWidth: 150 }}
            >
              {loading ? <CircularProgress size={24} /> : "Save Profile"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserProfileSetup; 