import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Tabs, 
  Tab, 
  Box, 
  Alert,
  Snackbar
} from '@mui/material';
import authService from '../../services/AuthService';

/**
 * Login Page component
 * Provides interface for user authentication and beta code registration
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/beta';
  const message = location.state?.message || '';
  
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await authService.checkAuthStatus();
      if (isAuthenticated) {
        navigate('/beta');
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const success = await authService.login(email, password);
      if (success) {
        navigate(from);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerEmail || !betaCode || !name || !registerPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Create user data object to match the expected format in AuthService
      const userData = {
        email: registerEmail,
        name: name,
        password: registerPassword // Add password field
      };
      
      // Call register with the correct parameter format
      const result = await authService.register(userData, betaCode);
      
      if (result) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          navigate(from);
        }, 1500);
      } else {
        setError('Registration failed. Please check your beta invitation code.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      {message && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          TourGuideAI Beta Program
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Login" id="login-tab" />
            <Tab label="Join Beta" id="register-tab" />
          </Tabs>
        </Box>
        
        {activeTab === 0 ? (
          <Box component="form" onSubmit={handleLogin}>
            <Typography variant="h6" gutterBottom>
              Sign in to your account
            </Typography>
            
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <Link to="/reset-password" style={{ textDecoration: 'none' }}>
                  Forgot your password?
                </Link>
              </Typography>
              <Typography variant="body2">
                <Link to="/verify-email" style={{ textDecoration: 'none' }}>
                  Need to verify your email?
                </Link>
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleRegister}>
            <Typography variant="h6" gutterBottom>
              Register with beta invitation
            </Typography>
            
            <TextField
              label="Full Name"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              disabled={loading}
              required
            />
            
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              disabled={loading}
              required
            />
            
            <TextField
              label="Beta Invitation Code"
              fullWidth
              margin="normal"
              value={betaCode}
              onChange={(e) => setBetaCode(e.target.value)}
              disabled={loading}
              required
              helperText="Enter the invitation code you received"
            />
            
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register & Join Beta'}
            </Button>
          </Box>
        )}
      </Paper>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoginPage; 