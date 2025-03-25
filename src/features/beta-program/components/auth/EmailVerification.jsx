import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import VerifiedIcon from '@mui/icons-material/Verified';
import emailService from '../../services/EmailService';

/**
 * Email Verification Component
 * 
 * Displays email verification status and allows resending verification emails
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVerified - Whether the user's email is verified
 * @param {Function} props.onVerified - Callback when email is verified
 */
const EmailVerification = ({ isVerified, onVerified }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handle resending verification email
  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await emailService.requestEmailVerification();
      setSuccess('Verification email sent. Please check your inbox.');
    } catch (err) {
      setError('Failed to send verification email. Please try again later.');
      console.error('Error sending verification email:', err);
    } finally {
      setLoading(false);
    }
  };

  // If email is already verified, show success message
  if (isVerified) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.contrastText,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <VerifiedIcon color="success" fontSize="large" />
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Email Verified
          </Typography>
          <Typography variant="body2">
            Your email address has been successfully verified.
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Otherwise, show verification needed and resend option
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <EmailIcon fontSize="large" color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Email Verification Required
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ mb: 2 }}>
        Please verify your email address to access all features of the beta program.
        We've sent a verification link to your email address.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleResendVerification}
        disabled={loading}
        sx={{ mt: 1 }}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
      >
        {loading ? 'Sending...' : 'Resend Verification Email'}
      </Button>
    </Paper>
  );
};

export default EmailVerification; 