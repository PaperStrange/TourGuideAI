import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  FormGroup,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Divider,
  Button,
  Alert,
  Grid,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import BetaIcon from '@mui/icons-material/NewReleases';

/**
 * User preferences setup component for onboarding flow
 * Allows new beta users to set their preferences for the application
 * 
 * @param {Object} props Component props
 * @param {Object} props.initialData Initial preferences data
 * @param {Function} props.onSubmit Callback function when preferences are submitted
 */
const PreferencesSetup = ({ initialPreferences = {}, onComplete }) => {
  // Merge default preferences with any provided initial values
  const defaultPreferences = {
    notifications: {
      email: true,
      push: true,
      digest: 'daily'
    },
    privacy: {
      dataSharing: true,
      analyticsCollection: true,
      feedbackSharing: true
    },
    features: {
      earlyAccess: true,
      betaFeatures: true,
      experimentalFeatures: false
    }
  };

  // Initialize state with merged preferences
  const [preferences, setPreferences] = useState({
    ...defaultPreferences,
    ...initialPreferences,
    notifications: {
      ...defaultPreferences.notifications,
      ...(initialPreferences.notifications || {})
    },
    privacy: {
      ...defaultPreferences.privacy,
      ...(initialPreferences.privacy || {})
    },
    features: {
      ...defaultPreferences.features,
      ...(initialPreferences.features || {})
    }
  });

  /**
   * Handle toggle switch changes
   * @param {string} section Preference section (notifications, privacy, features)
   * @param {string} name Preference name
   */
  const handleToggleChange = (section, name) => (event) => {
    setPreferences({
      ...preferences,
      [section]: {
        ...preferences[section],
        [name]: event.target.checked
      }
    });
  };

  /**
   * Handle radio button changes
   * @param {string} section Preference section
   * @param {string} name Preference name
   */
  const handleRadioChange = (section, name) => (event) => {
    setPreferences({
      ...preferences,
      [section]: {
        ...preferences[section],
        [name]: event.target.value
      }
    });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    onComplete(preferences);
  };

  return (
    <Card sx={{ maxWidth: 700, mx: 'auto', boxShadow: 0 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Set Your Preferences
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph align="center">
          Customize your beta experience with these preferences. You can change these settings anytime later.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Notification Preferences */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Notification Preferences</Typography>
                </Box>

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.email}
                        onChange={handleToggleChange('notifications', 'email')}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1, display: 'block' }}>
                    Receive important updates, feature announcements, and feedback requests via email
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.push}
                        onChange={handleToggleChange('notifications', 'push')}
                        color="primary"
                      />
                    }
                    label="Push Notifications"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1, display: 'block' }}>
                    Receive real-time alerts in your browser for important updates
                  </Typography>

                  <Box mt={2}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Digest Frequency</FormLabel>
                      <RadioGroup
                        value={preferences.notifications.digest}
                        onChange={handleRadioChange('notifications', 'digest')}
                        row
                      >
                        <FormControlLabel value="daily" control={<Radio />} label="Daily" />
                        <FormControlLabel value="weekly" control={<Radio />} label="Weekly" />
                        <FormControlLabel value="never" control={<Radio />} label="Never" />
                      </RadioGroup>
                    </FormControl>
                  </Box>
                </FormGroup>
              </Paper>
            </Grid>

            {/* Privacy Preferences */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <SecurityIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Privacy Preferences</Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  As a beta tester, your feedback and usage data help us improve the product. 
                  You can adjust how much information is shared with us.
                </Alert>

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.privacy.dataSharing}
                        onChange={handleToggleChange('privacy', 'dataSharing')}
                        color="primary"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center">
                        Usage Data Sharing
                        <Tooltip title="We collect anonymous usage data to improve the product experience. This includes features used, time spent, and interaction patterns.">
                          <IconButton size="small">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.privacy.analyticsCollection}
                        onChange={handleToggleChange('privacy', 'analyticsCollection')}
                        color="primary"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center">
                        Performance Analytics
                        <Tooltip title="Helps us identify performance issues, errors, and areas for optimization.">
                          <IconButton size="small">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.privacy.feedbackSharing}
                        onChange={handleToggleChange('privacy', 'feedbackSharing')}
                        color="primary"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center">
                        Feedback Sharing
                        <Tooltip title="Allow your feedback to be shared (anonymously) with the product team to prioritize features.">
                          <IconButton size="small">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />
                </FormGroup>
              </Paper>
            </Grid>

            {/* Feature Preferences */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <BetaIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Feature Preferences</Typography>
                </Box>

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.features.earlyAccess}
                        onChange={handleToggleChange('features', 'earlyAccess')}
                        color="primary"
                      />
                    }
                    label="Early Access Features"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1, display: 'block' }}>
                    Get access to new features before they're released to the public
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.features.betaFeatures}
                        onChange={handleToggleChange('features', 'betaFeatures')}
                        color="primary"
                      />
                    }
                    label="Beta Features"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1, display: 'block' }}>
                    Enable beta features that are still under active development
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.features.experimentalFeatures}
                        onChange={handleToggleChange('features', 'experimentalFeatures')}
                        color="primary"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center">
                        Experimental Features
                        <Tooltip title="Warning: These features may be unstable and could cause unexpected behavior.">
                          <IconButton size="small">
                            <InfoIcon fontSize="small" color="warning" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, mb: 1, display: 'block' }}>
                    Try experimental features that are in early stages of development
                  </Typography>
                </FormGroup>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              sx={{ minWidth: 150 }}
            >
              Save Preferences
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PreferencesSetup; 