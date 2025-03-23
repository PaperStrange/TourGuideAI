import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  FormControl,
  FormControlLabel,
  FormLabel,
  FormGroup,
  FormHelperText,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  Chip,
  Autocomplete,
  TextField,
  Divider
} from '@mui/material';

/**
 * User preferences setup component for onboarding flow
 * Allows new beta users to set their preferences for the application
 * 
 * @param {Object} props Component props
 * @param {Object} props.initialData Initial preferences data
 * @param {Function} props.onSubmit Callback function when preferences are submitted
 */
const PreferencesSetup = ({ initialData = {}, onSubmit }) => {
  // Available interest topics
  const availableTopics = [
    'Cultural Tours', 'Nature Exploration', 'Adventure Travel', 
    'City Sightseeing', 'Food Tourism', 'Historical Sites',
    'Beach Holidays', 'Mountain Hikes', 'Road Trips',
    'Museum Tours', 'Architecture', 'Wildlife Viewing',
    'Photography Spots', 'Shopping Tours', 'Local Festivals',
    'Nightlife Experience', 'Family Activities', 'Luxury Travel'
  ];
  
  // Tour preferences
  const tourPreferenceOptions = [
    { value: 'walking', label: 'Walking Tours' },
    { value: 'driving', label: 'Driving Routes' },
    { value: 'public_transit', label: 'Public Transit' },
    { value: 'cycling', label: 'Cycling Routes' },
    { value: 'wheelchair', label: 'Wheelchair Accessible' },
    { value: 'group', label: 'Group Activities' },
    { value: 'solo', label: 'Solo Activities' },
    { value: 'family', label: 'Family-friendly' }
  ];
  
  // Set default values from initial data
  const [preferences, setPreferences] = useState({
    notificationEmail: initialData.notificationEmail !== undefined ? initialData.notificationEmail : true,
    dataSharingLevel: initialData.dataSharingLevel || 'minimal',
    tourPreferences: initialData.tourPreferences || [],
    interestTopics: initialData.interestTopics || []
  });
  
  // Handle email notification toggle
  const handleNotificationToggle = (e) => {
    setPreferences(prev => ({
      ...prev,
      notificationEmail: e.target.checked
    }));
  };
  
  // Handle data sharing level change
  const handleDataSharingChange = (e) => {
    setPreferences(prev => ({
      ...prev,
      dataSharingLevel: e.target.value
    }));
  };
  
  // Handle tour preference change
  const handleTourPreferenceChange = (e) => {
    const { checked, value } = e.target;
    
    setPreferences(prev => {
      const updatedPreferences = checked
        ? [...prev.tourPreferences, value]
        : prev.tourPreferences.filter(pref => pref !== value);
        
      return {
        ...prev,
        tourPreferences: updatedPreferences
      };
    });
  };
  
  // Handle interest topics change
  const handleInterestTopicsChange = (event, newValues) => {
    setPreferences(prev => ({
      ...prev,
      interestTopics: newValues
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(preferences);
  };
  
  // Get data sharing level description
  const getDataSharingDescription = (level) => {
    switch (level) {
      case 'minimal':
        return 'We collect only essential data required for the application to function';
      case 'standard':
        return 'We collect usage data to improve the application and your experience';
      case 'comprehensive':
        return 'We collect detailed analytics data to optimize all aspects of the application';
      default:
        return '';
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Set Your Preferences
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure your preferences to personalize your beta experience.
        You can update these settings at any time from your profile.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Notification preferences */}
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Notifications</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.notificationEmail}
                    onChange={handleNotificationToggle}
                    name="notificationEmail"
                  />
                }
                label="Receive email notifications about beta updates and new features"
              />
            </FormGroup>
          </FormControl>
        </Grid>
        
        {/* Data sharing preferences */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <FormControl component="fieldset">
            <FormLabel component="legend">Data Sharing Level</FormLabel>
            <RadioGroup
              name="dataSharingLevel"
              value={preferences.dataSharingLevel}
              onChange={handleDataSharingChange}
            >
              <FormControlLabel value="minimal" control={<Radio />} label="Minimal" />
              <FormControlLabel value="standard" control={<Radio />} label="Standard" />
              <FormControlLabel value="comprehensive" control={<Radio />} label="Comprehensive" />
            </RadioGroup>
            <FormHelperText>
              {getDataSharingDescription(preferences.dataSharingLevel)}
            </FormHelperText>
          </FormControl>
        </Grid>
        
        {/* Tour preferences */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <FormControl component="fieldset">
            <FormLabel component="legend">Tour Preferences</FormLabel>
            <FormHelperText sx={{ mt: 0, mb: 1 }}>
              Select your preferred types of tours (select all that apply)
            </FormHelperText>
            <FormGroup row>
              {tourPreferenceOptions.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={preferences.tourPreferences.includes(option.value)}
                      onChange={handleTourPreferenceChange}
                      value={option.value}
                    />
                  }
                  label={option.label}
                  sx={{ width: { xs: '100%', sm: '50%', md: '33%' } }}
                />
              ))}
            </FormGroup>
          </FormControl>
        </Grid>
        
        {/* Interest topics */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <FormControl fullWidth component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">Interest Topics</FormLabel>
            <FormHelperText sx={{ mt: 0, mb: 1 }}>
              Select topics you're interested in exploring
            </FormHelperText>
            <Autocomplete
              multiple
              id="interest-topics"
              options={availableTopics}
              value={preferences.interestTopics}
              onChange={handleInterestTopicsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Select topics..."
                />
              )}
            />
          </FormControl>
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

export default PreferencesSetup; 