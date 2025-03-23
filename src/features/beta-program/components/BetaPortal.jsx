import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useMediaQuery,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import authService from '../services/AuthService';
import { Role, Permission, AccessControl } from './auth';
import { PERMISSIONS, ROLES } from '../services/PermissionsService';
import { useCurrentPermissions } from '../hooks';
import axios from 'axios';
import UserPermissionsCard from './user/UserPermissionsCard';
// Placeholder imports for components to be implemented later
// import FeedbackWidget from './FeedbackWidget';
// import SurveyList from './SurveyList';
// import AnalyticsDashboard from './AnalyticsDashboard';

// Lazy load FeedbackWidget and AnalyticsDashboard to reduce initial bundle size
const FeedbackWidget = lazy(() => import('./feedback/FeedbackWidget'));
const AnalyticsDashboard = lazy(() => import('./analytics/AnalyticsDashboard'));

/**
 * Beta Portal main component
 * Provides the main interface for beta testers to register, provide feedback,
 * participate in surveys, and view their dashboard.
 * Uses RBAC components for conditional rendering.
 */
const BetaPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin, isModerator, isLoading: permissionsLoading } = useCurrentPermissions();
  
  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Configure axios to include the auth token in requests
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [isAuthenticated]);

  // Use AuthService to check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const userData = await authService.checkAuthStatus();
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // Set up authentication header
          const token = authService.getToken();
          if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate. Please try again.');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Handle successful registration
  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    
    // Set up authentication header
    const token = authService.getToken();
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed. Please try again.');
    }
  };

  // Loading state
  if (isLoading || permissionsLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Render content based on authentication status
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          TourGuideAI Beta Program
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {isAuthenticated ? (
          // Authenticated user view
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6">
                  Welcome, {user.name || user.email}
                </Typography>
                
                <Box sx={{ mt: 1 }}>
                  <Role role={ROLES.ADMIN}>
                    <Chip 
                      label="Admin" 
                      color="error" 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                  </Role>
                  
                  <Role role={ROLES.MODERATOR}>
                    <Chip 
                      label="Moderator" 
                      color="warning" 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                  </Role>
                  
                  <Chip 
                    label="Beta Tester" 
                    color="primary" 
                    size="small" 
                  />
                </Box>
              </Box>
              
              <Box>
                <AccessControl role={[ROLES.ADMIN, ROLES.MODERATOR]}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    component={Link} 
                    to="/admin" 
                    sx={{ mr: 2 }}
                  >
                    Admin Panel
                  </Button>
                </AccessControl>
                
                <Button variant="outlined" color="primary" onClick={handleLogout}>
                  Logout
                </Button>
              </Box>
            </Box>

            <Paper elevation={3} sx={{ mb: 4 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                variant={isMobile ? "scrollable" : "fullWidth"}
                scrollButtons={isMobile ? "auto" : false}
                centered={!isMobile}
              >
                <Tab label="Dashboard" />
                <Tab label="Provide Feedback" />
                <Tab label="Surveys" />
                
                <Permission permission={PERMISSIONS.VIEW_ANALYTICS}>
                  <Tab label="Analytics" />
                </Permission>
                
                <Tab label="Resources" />
              </Tabs>

              <Box sx={{ p: 3 }}>
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Beta Tester Dashboard
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            User Information
                          </Typography>
                          <Typography variant="body2">
                            <strong>Name:</strong> {user.name}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Email:</strong> {user.email}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Role:</strong> {user.role}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Member Since:</strong> {new Date(user.registrationDate).toLocaleDateString()}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Beta Activity
                          </Typography>
                          <Typography variant="body2">
                            <strong>Feedback Submitted:</strong> 0
                          </Typography>
                          <Typography variant="body2">
                            <strong>Surveys Completed:</strong> 0
                          </Typography>
                          <Typography variant="body2">
                            <strong>Features Tested:</strong> 0
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <UserPermissionsCard />
                      </Grid>
                      
                      <AccessControl role={[ROLES.ADMIN, ROLES.MODERATOR]}>
                        <Grid item xs={12}>
                          <Paper elevation={2} sx={{ p: 2, bgcolor: isAdmin ? 'error.50' : 'warning.50' }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Administrative Tools
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                              <Permission permission={PERMISSIONS.CREATE_INVITE}>
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  component={Link} 
                                  to="/admin/invite-codes"
                                >
                                  Manage Invite Codes
                                </Button>
                              </Permission>
                              
                              <Role role={ROLES.ADMIN}>
                                <Button 
                                  variant="contained" 
                                  color="error"
                                  size="small" 
                                  component={Link} 
                                  to="/admin"
                                >
                                  Admin Dashboard
                                </Button>
                              </Role>
                            </Box>
                          </Paper>
                        </Grid>
                      </AccessControl>
                    </Grid>
                  </Box>
                )}
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Provide Your Feedback
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Your feedback is essential for improving TourGuideAI. Please share your thoughts, report bugs, or suggest new features.
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                          <Suspense fallback={<CircularProgress />}>
                            <FeedbackWidget />
                          </Suspense>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                {activeTab === 2 && (
                  <Typography variant="body1">
                    Surveys will be implemented in subsequent tasks.
                  </Typography>
                )}
                <Permission permission={PERMISSIONS.VIEW_ANALYTICS}>
                  {activeTab === 3 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Analytics Dashboard
                      </Typography>
                      <Typography variant="body1" paragraph>
                        View real-time insights into beta program usage and feedback.
                      </Typography>
                      
                      <Suspense fallback={<CircularProgress />}>
                        <AnalyticsDashboard />
                      </Suspense>
                    </Box>
                  )}
                </Permission>
                {activeTab === (
                  isAdmin || isModerator ? 4 : 3
                ) && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Beta Program Resources
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Access documentation, guides, and resources for the beta program.
                    </Typography>
                    
                    {/* Resources content here */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Getting Started
                          </Typography>
                          <Typography variant="body2" paragraph>
                            A guide to help you get started with TourGuideAI's beta program.
                          </Typography>
                          <Button size="small" variant="outlined">View Guide</Button>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Providing Effective Feedback
                          </Typography>
                          <Typography variant="body2" paragraph>
                            Learn how to provide feedback that helps us improve TourGuideAI.
                          </Typography>
                          <Button size="small" variant="outlined">View Guide</Button>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        ) : (
          // Non-authenticated view - Registration Form
          <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom align="center">
                Join Our Beta Program
              </Typography>
              <Typography variant="body1" paragraph align="center">
                Get early access to TourGuideAI and help shape the future of travel planning.
              </Typography>
              
              <RegistrationForm onSuccess={handleRegisterSuccess} />
            </Paper>
          </Box>
        )}
      </Box>
      
      {/* Floating feedback widget for authenticated users */}
      {isAuthenticated && (
        <Suspense fallback={null}>
          <FeedbackWidget />
        </Suspense>
      )}
    </Container>
  );
};

export default BetaPortal; 