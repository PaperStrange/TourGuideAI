import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LoginIcon from '@mui/icons-material/Login';

import authService from '../services/AuthService';
import emailService from '../services/EmailService';

/**
 * Email Verification Page
 * 
 * This page handles two scenarios:
 * 1. User clicks verification link from email (with token in URL)
 * 2. User visits page directly to request a new verification email
 */
const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  // If token is present, verify email on component mount
  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);
  
  // Function to verify email with token
  const verifyEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Try to verify with token by logging in
      await authService.loginWithToken(token);
      setVerified(true);
    } catch (err) {
      console.error('Error verifying email:', err);
      
      // Extract error message from response if available
      const errorMessage = err.response?.data?.error || 
                          'Unable to verify your email. The link may have expired or is invalid.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to request a new verification email
  const requestVerification = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    } else {
      setEmailError('');
    }
    
    setLoading(true);
    setError('');
    
    try {
      await emailService.resendVerificationEmail(email);
      setEmailSent(true);
    } catch (err) {
      console.error('Error requesting verification email:', err);
      
      // Don't show error message to prevent email enumeration
      // Just say it was sent anyway for security
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to login
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  // Navigate to beta portal if already verified
  const handleGoToBeta = () => {
    navigate('/beta');
  };
  
  // Render verification result if token was present
  if (verifying) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom>
                Verifying Your Email
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please wait while we verify your email address...
              </Typography>
            </Box>
          ) : verified ? (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Email Verified Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Thank you for verifying your email address. You can now access all beta features.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleGoToBeta}
                sx={{ mt: 2 }}
              >
                Go to Beta Portal
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verification Failed
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {error || 'We could not verify your email address. The link may have expired or is invalid.'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                You can request a new verification email below:
              </Typography>
              
              <Box component="form" onSubmit={requestVerification}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Your Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!emailError}
                  helperText={emailError}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }
  
  // Render the request verification email form
  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {!emailSent ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <MarkEmailReadIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verify Your Email
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Enter your email address below and we'll send you a verification link.
              </Typography>
            </Box>
            
            <Box component="form" onSubmit={requestVerification}>
              <TextField
                fullWidth
                margin="normal"
                label="Your Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!emailError}
                helperText={emailError}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? 'Sending...' : 'Send Verification Email'}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Check Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              If an account exists with the email you provided, we've sent a verification link.
              Please check your email and follow the instructions to verify your account.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/')}
              sx={{ mt: 2, mr: 2 }}
            >
              Return to Home
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<LoginIcon />}
              onClick={handleGoToLogin}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default VerifyEmailPage; 