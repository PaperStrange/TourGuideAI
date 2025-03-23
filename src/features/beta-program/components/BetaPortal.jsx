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
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RegistrationForm from './RegistrationForm';
import authService from '../services/AuthService';
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
 */
const BetaPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Use AuthService to check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const userData = await authService.checkAuthStatus();
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate. Please try again.');
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
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  // Loading state
  if (isLoading) {
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
              <Typography variant="h6">
                Welcome, {user.name}
              </Typography>
              <Button variant="outlined" color="primary" onClick={handleLogout}>
                Logout
              </Button>
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
              </Box>
            </Paper>
          </Box>
        ) : (
          // Unauthenticated user view
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Join Our Beta Program
                </Typography>
                <Typography variant="body1" paragraph>
                  Help us shape the future of TourGuideAI by joining our exclusive beta testing program. 
                  As a beta tester, you'll get early access to new features and have a direct impact on our development.
                </Typography>
                <Typography variant="body1" paragraph>
                  Benefits include:
                </Typography>
                <ul>
                  <li>Early access to new features</li>
                  <li>Direct influence on product development</li>
                  <li>Special recognition in our community</li>
                  <li>Exclusive beta tester badge</li>
                </ul>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Register
                </Typography>
                <RegistrationForm onRegisterSuccess={handleRegisterSuccess} />
              </Paper>
            </Grid>
          </Grid>
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