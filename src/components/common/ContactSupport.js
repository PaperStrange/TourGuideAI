import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Email, BugReport, Help, Feedback } from '@mui/icons-material';

const ContactSupport = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'general',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // For MVP, we'll just show a success message
    // In production, this would send to a support system
    console.log('Support request:', formData);
    
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        type: 'general',
        email: '',
        subject: '',
        message: ''
      });
      onClose();
    }, 3000);
  };

  const supportTypes = [
    { value: 'general', label: 'General Question', icon: <Help /> },
    { value: 'bug', label: 'Bug Report', icon: <BugReport /> },
    { value: 'feedback', label: 'Feedback', icon: <Feedback /> },
    { value: 'feature', label: 'Feature Request', icon: <Email /> }
  ];

  if (submitted) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Thank you for contacting us!
            </Alert>
            <Typography variant="body1">
              We've received your message and will get back to you soon.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              For urgent issues, please check our FAQ in the User Guide.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Email />
          Contact Support
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Quick Help:</strong> Check our User Quick Start Guide for common questions and troubleshooting tips.
              </Typography>
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Type of Request</InputLabel>
              <Select
                value={formData.type}
                onChange={handleChange('type')}
                label="Type of Request"
              >
                {supportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Your Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              required
              helperText="We'll use this to respond to your request"
            />

            <TextField
              fullWidth
              label="Subject"
              value={formData.subject}
              onChange={handleChange('subject')}
              required
              placeholder="Brief description of your issue or question"
            />

            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={formData.message}
              onChange={handleChange('message')}
              required
              placeholder="Please provide as much detail as possible..."
              helperText="Include steps to reproduce if reporting a bug"
            />

            <Box>
              <Typography variant="h6" gutterBottom>
                Common Issues & Quick Solutions:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Route generation not working:</strong> Check your internet connection and try again<br/>
                • <strong>Map not loading:</strong> Refresh the page and ensure location permissions are enabled<br/>
                • <strong>Login issues:</strong> Try the demo account (demo@example.com / demo123)<br/>
                • <strong>Performance issues:</strong> Clear browser cache and try again
              </Typography>
            </Box>

          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!formData.email || !formData.subject || !formData.message}
          >
            Send Message
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContactSupport; 