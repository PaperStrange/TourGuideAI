import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Grid,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * User profile setup component for onboarding flow
 * Allows new beta users to configure their profile information
 * 
 * @param {Object} props Component props
 * @param {Object} props.initialData Initial profile data
 * @param {Function} props.onSubmit Callback function when profile setup is submitted
 */
const UserProfileSetup = ({ initialData = {}, onSubmit }) => {
  // Set default values from initial data
  const [profile, setProfile] = useState({
    displayName: initialData.displayName || '',
    jobTitle: initialData.jobTitle || '',
    company: initialData.company || '',
    bio: initialData.bio || '',
    profilePicture: initialData.profilePicture || null
  });
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Image preview state
  const [imagePreview, setImagePreview] = useState(
    initialData.profilePicture ? URL.createObjectURL(initialData.profilePicture) : null
  );
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          profilePicture: 'Please upload a valid image file (JPEG, PNG, or GIF)'
        }));
        return;
      }
      
      // Max size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          profilePicture: 'Image size should be less than 5MB'
        }));
        return;
      }
      
      // Clear previous error
      if (errors.profilePicture) {
        setErrors(prev => ({
          ...prev,
          profilePicture: null
        }));
      }
      
      // Set file and generate preview
      setProfile(prev => ({
        ...prev,
        profilePicture: file
      }));
      
      // Create and set preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle removing profile picture
  const handleRemoveImage = () => {
    setProfile(prev => ({
      ...prev,
      profilePicture: null
    }));
    setImagePreview(null);
    
    // Clear any profile picture errors
    if (errors.profilePicture) {
      setErrors(prev => ({
        ...prev,
        profilePicture: null
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Display name is required
    if (!profile.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit(profile);
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Set Up Your Profile
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Customize your beta program profile. This information will help us
        provide a personalized experience and better understand our users.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Profile picture */}
        <Grid item xs={12} display="flex" flexDirection="column" alignItems="center">
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Avatar
              src={imagePreview}
              sx={{ 
                width: 120, 
                height: 120,
                border: theme => `2px solid ${theme.palette.primary.main}`
              }}
            />
            {imagePreview && (
              <IconButton
                onClick={handleRemoveImage}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'white'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          
          <Box>
            <input
              accept="image/*"
              id="profile-picture-upload"
              type="file"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <label htmlFor="profile-picture-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                size="medium"
              >
                {imagePreview ? 'Change Picture' : 'Upload Picture'}
              </Button>
            </label>
          </Box>
          
          {errors.profilePicture && (
            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
              {errors.profilePicture}
            </Typography>
          )}
        </Grid>
        
        {/* Form fields */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Display Name"
            name="displayName"
            value={profile.displayName}
            onChange={handleInputChange}
            error={!!errors.displayName}
            helperText={errors.displayName}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Job Title"
            name="jobTitle"
            value={profile.jobTitle}
            onChange={handleInputChange}
            placeholder="Optional"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Company/Organization"
            name="company"
            value={profile.company}
            onChange={handleInputChange}
            placeholder="Optional"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Bio"
            name="bio"
            value={profile.bio}
            onChange={handleInputChange}
            multiline
            rows={3}
            placeholder="Tell us a bit about yourself and how you plan to use TourGuideAI (optional)"
          />
        </Grid>
        
        <Grid item xs={12} display="flex" justifyContent="flex-end">
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            Continue
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserProfileSetup; 