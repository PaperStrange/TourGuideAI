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
  IconButton,
  InputAdornment
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';

import emailService from '../services/EmailService';

/**
 * Reset Password Page
 * 
 * This page is displayed when a user clicks on a reset password link from their email.
 * It allows them to set a new password.
 */
const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(!!token);
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  
  // Form validation
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // If no token is provided, show the request password reset form
  // Otherwise, show the password reset form
  const isResetForm = !!token;
  
  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate form
    let valid = true;
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else {
      setPasswordError('');
    }
    
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    } else {
      setConfirmError('');
    }
    
    if (!valid) return;
    
    setLoading(true);
    setError('');
    
    try {
      await emailService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Error resetting password:', err);
      
      // Extract error message from response if available
      const errorMessage = err.response?.data?.error?.message || 
                          'Unable to reset password. The link may have expired or is invalid.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle request password reset
  const handleRequestReset = async (e) => {
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
      await emailService.requestPasswordReset(email);
      setRequestSent(true);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      
      // Don't show error message to prevent email enumeration
      // Just say it was sent anyway
      setRequestSent(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Navigate to login
  const handleGoLogin = () => {
    navigate('/login');
  };
  
  // Render the password reset form
  if (isResetForm) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {!success ? (
            <>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <LockResetIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Reset Your Password
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Please enter your new password below.
                </Typography>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              <form onSubmit={handleResetPassword}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={!!passwordError}
                  helperText={passwordError}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={!!confirmError}
                  helperText={confirmError}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LockResetIcon />}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            </>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Password Reset Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Your password has been successfully reset. You can now log in with your new password.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<LoginIcon />}
                onClick={handleGoLogin}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }
  
  // Render the request password reset form
  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {!requestSent ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LockResetIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Forgot Your Password?
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Enter your email address below and we'll send you a link to reset your password.
              </Typography>
            </Box>
            
            <form onSubmit={handleRequestReset}>
              <TextField
                fullWidth
                margin="normal"
                label="Email Address"
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
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LockResetIcon />}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </Button>
            </form>
          </>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Check Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              If an account exists with the email you provided, we've sent a password reset link.
              Please check your email and follow the instructions to reset your password.
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
              onClick={handleGoLogin}
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

export default ResetPasswordPage; 