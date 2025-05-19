import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Stack
} from '@mui/material';
import {
  VideocamOutlined as VideoIcon,
  MicOutlined as MicIcon,
  ScreenShareOutlined as ScreenShareIcon,
  MouseOutlined as MouseIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

// In a real app, this would be an actual service
const mockConsentService = {
  consents: {},
  
  async getUserConsent() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get stored consent or create default settings
    const userId = 'current-user'; // In a real app, this would come from auth service
    return this.consents[userId] || {
      screen: false,
      camera: false,
      microphone: false,
      interactions: false,
      storage: false,
      consentGiven: false,
      lastUpdated: null
    };
  },
  
  async updateUserConsent(consentData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const userId = 'current-user'; // In a real app, this would come from auth service
    this.consents[userId] = {
      ...consentData,
      lastUpdated: new Date().toISOString()
    };
    
    return this.consents[userId];
  }
};

const SessionRecordingConsent = () => {
  const [consent, setConsent] = useState({
    screen: false,
    camera: false,
    microphone: false,
    interactions: false,
    storage: false,
    consentGiven: false,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    loadUserConsent();
  }, []);
  
  const loadUserConsent = async () => {
    setLoading(true);
    try {
      const userConsent = await mockConsentService.getUserConsent();
      setConsent(userConsent);
      
      // Show dialog if consent has not been given yet
      if (!userConsent.consentGiven) {
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to load user consent settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConsentChange = (event) => {
    const { name, checked } = event.target;
    setConsent(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleOptOutAll = () => {
    setConsent(prev => ({
      ...prev,
      screen: false,
      camera: false,
      microphone: false,
      interactions: false,
      storage: false
    }));
  };
  
  const handleOptInAll = () => {
    setConsent(prev => ({
      ...prev,
      screen: true,
      camera: true,
      microphone: true,
      interactions: true,
      storage: true
    }));
  };
  
  const handleSaveConsent = async (accepted = false) => {
    setSaving(true);
    
    try {
      const updatedConsent = {
        ...consent,
        consentGiven: accepted
      };
      
      // If user opted out, ensure all settings are false
      if (!accepted) {
        updatedConsent.screen = false;
        updatedConsent.camera = false;
        updatedConsent.microphone = false;
        updatedConsent.interactions = false;
        updatedConsent.storage = false;
      }
      
      await mockConsentService.updateUserConsent(updatedConsent);
      setConsent(updatedConsent);
      setDialogOpen(false);
      
      setSuccessMessage(accepted 
        ? 'Your consent preferences have been saved. Thank you for participating in our user testing program.' 
        : 'You have opted out of session recording. No data will be recorded during your session.'
      );
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Failed to save consent settings:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleOpenConsentDialog = () => {
    setDialogOpen(true);
  };
  
  const handleCloseConsentDialog = () => {
    // Only allow closing if consent has been given before
    if (consent.consentGiven) {
      setDialogOpen(false);
    }
  };
  
  const handleOpenMoreInfo = () => {
    setMoreInfoOpen(true);
  };
  
  const handleCloseMoreInfo = () => {
    setMoreInfoOpen(false);
  };
  
  const isAnyConsentGiven = consent.screen || consent.camera || consent.microphone || consent.interactions || consent.storage;
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">Session Recording Consent</Typography>
          <Button 
            variant="outlined" 
            onClick={handleOpenConsentDialog}
            startIcon={<VideoIcon />}
          >
            Manage Consent
          </Button>
        </Box>
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>
        )}
        
        <Typography variant="body1" paragraph>
          By participating in our user testing program, you can help us improve the application by allowing us to record and analyze your session.
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Your Current Consent Settings:</Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <ScreenShareIcon color={consent.screen ? 'primary' : 'disabled'} />
              </ListItemIcon>
              <ListItemText 
                primary="Screen Recording" 
                secondary={consent.screen ? 'Allowed' : 'Not allowed'} 
              />
              {consent.screen ? <CheckIcon color="success" /> : <CancelIcon color="disabled" />}
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <VideoIcon color={consent.camera ? 'primary' : 'disabled'} />
              </ListItemIcon>
              <ListItemText 
                primary="Camera Recording" 
                secondary={consent.camera ? 'Allowed' : 'Not allowed'} 
              />
              {consent.camera ? <CheckIcon color="success" /> : <CancelIcon color="disabled" />}
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <MicIcon color={consent.microphone ? 'primary' : 'disabled'} />
              </ListItemIcon>
              <ListItemText 
                primary="Microphone Recording" 
                secondary={consent.microphone ? 'Allowed' : 'Not allowed'} 
              />
              {consent.microphone ? <CheckIcon color="success" /> : <CancelIcon color="disabled" />}
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <MouseIcon color={consent.interactions ? 'primary' : 'disabled'} />
              </ListItemIcon>
              <ListItemText 
                primary="User Interactions" 
                secondary={consent.interactions ? 'Tracked' : 'Not tracked'} 
              />
              {consent.interactions ? <CheckIcon color="success" /> : <CancelIcon color="disabled" />}
            </ListItem>
          </List>
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Last updated: {formatDate(consent.lastUpdated)}
          </Typography>
          
          <Typography variant="body2" color="textSecondary">
            Consent status: {consent.consentGiven ? 'Consent provided' : 'No consent provided'}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="subtitle1" gutterBottom>About Session Recording</Typography>
          <Typography variant="body2" paragraph>
            Our user testing program helps us understand how users interact with our application.
            This feedback is invaluable for improving the user experience and identifying areas for enhancement.
          </Typography>
          
          <Button
            variant="text"
            startIcon={<InfoIcon />}
            onClick={handleOpenMoreInfo}
          >
            Learn More About Data Usage
          </Button>
        </Box>
      </Paper>
      
      {/* Consent Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseConsentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Session Recording Consent</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            To improve our application and provide the best possible user experience, we would like to record your session. This may include:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <ScreenShareIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Screen Recording" 
                secondary="Recording what appears on your screen during testing" 
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={consent.screen} 
                    onChange={handleConsentChange} 
                    name="screen" 
                  />
                }
                label=""
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <VideoIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Camera Recording" 
                secondary="Recording your facial expressions to understand reactions" 
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={consent.camera} 
                    onChange={handleConsentChange} 
                    name="camera" 
                  />
                }
                label=""
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <MicIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Microphone Recording" 
                secondary="Recording your voice for think-aloud testing" 
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={consent.microphone} 
                    onChange={handleConsentChange} 
                    name="microphone" 
                  />
                }
                label=""
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <MouseIcon />
              </ListItemIcon>
              <ListItemText 
                primary="User Interactions" 
                secondary="Tracking mouse movements, clicks, and keyboard activity" 
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={consent.interactions} 
                    onChange={handleConsentChange} 
                    name="interactions" 
                  />
                }
                label=""
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Data Storage" 
                secondary="Storing recorded data securely for up to 60 days" 
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={consent.storage} 
                    onChange={handleConsentChange} 
                    name="storage" 
                  />
                }
                label=""
              />
            </ListItem>
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" paragraph>
            You can revoke or modify this consent at any time. Your data privacy is important to us, and all recordings are stored securely and used only for product improvement purposes.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={handleOptOutAll}>Opt Out of All</Button>
            <Button variant="outlined" onClick={handleOptInAll}>Opt In to All</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSaveConsent(false)}>
            Decline All
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleSaveConsent(true)}
            disabled={!isAnyConsentGiven || saving}
          >
            {saving ? 'Saving...' : 'Save Consent'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* More Info Dialog */}
      <Dialog
        open={moreInfoOpen}
        onClose={handleCloseMoreInfo}
        maxWidth="md"
      >
        <DialogTitle>About Our Data Collection & Usage</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>How We Use Your Data</Typography>
          <Typography variant="body2" paragraph>
            The data collected during user testing sessions is used exclusively for:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Identifying usability issues and pain points" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Understanding user behavior and preferences" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Improving the user interface and experience" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Prioritizing feature development based on actual usage" />
            </ListItem>
          </List>
          
          <Typography variant="h6" gutterBottom>Data Security & Retention</Typography>
          <Typography variant="body2" paragraph>
            We take the security of your data seriously:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="All recordings are encrypted both in transit and at rest" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Access to recordings is strictly limited to authorized personnel" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Data is automatically deleted after 60 days" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="You can request immediate deletion of your data at any time" />
            </ListItem>
          </List>
          
          <Typography variant="h6" gutterBottom>Your Rights</Typography>
          <Typography variant="body2" paragraph>
            As a participant in our user testing program, you have the right to:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Access your recorded sessions" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Modify your consent settings at any time" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Request deletion of your data" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Opt out of future recordings" />
            </ListItem>
          </List>
          
          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            For any questions or concerns regarding your data, please contact our privacy team at
            <Link href="mailto:privacy@example.com" sx={{ ml: 1 }}>
              privacy@example.com
            </Link>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMoreInfo}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionRecordingConsent; 