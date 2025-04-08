import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import ChatIcon from '@mui/icons-material/Chat';
import FeedbackIcon from '@mui/icons-material/Feedback';
import PersonIcon from '@mui/icons-material/Person';

/**
 * Welcome Screen Component
 * Final step in the onboarding flow showing feature highlights and next steps
 */
const WelcomeScreen = ({ userName, onComplete, loading, error }) => {
  // Key features to highlight
  const keyFeatures = [
    {
      icon: <ChatIcon color="primary" />,
      title: 'AI-Powered Chat',
      description: 'Generate personalized travel plans based on your preferences using our advanced AI'
    },
    {
      icon: <MapIcon color="primary" />,
      title: 'Interactive Maps',
      description: 'Visualize your travel routes and discover points of interest along the way'
    },
    {
      icon: <ExploreIcon color="primary" />,
      title: 'Customized Itineraries',
      description: 'Create and save detailed itineraries tailored to your travel style and interests'
    },
    {
      icon: <FeedbackIcon color="primary" />,
      title: 'Beta Feedback',
      description: 'Share your thoughts and suggestions to help shape the future of TourGuideAI'
    }
  ];

  // Next steps for the beta user
  const nextSteps = [
    'Explore the dashboard to get familiar with the interface',
    'Create your first travel plan using the Chat feature',
    'Visualize your route on the interactive Map',
    'Share your feedback about your experience'
  ];

  /**
   * Handle completion of the onboarding flow
   */
  const handleGetStarted = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', boxShadow: 0 }}>
      <CardContent>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to TourGuideAI Beta, {userName || 'Explorer'}!
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            Thank you for joining our beta program. We're excited to have you help us shape the future of travel planning!
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={4}>
          {/* Key Features */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ ml: 2 }}>
              Key Features to Explore
            </Typography>
            
            <Grid container spacing={2}>
              {keyFeatures.map((feature, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      height: '100%',
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box mr={1}>{feature.icon}</Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {feature.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
          
          {/* Next Steps */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ ml: 2 }}>
              Your Next Steps
            </Typography>
            
            <Paper
              elevation={1}
              sx={{
                p: 3,
                borderRadius: 2
              }}
            >
              <List>
                {nextSteps.map((step, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={step} />
                    </ListItem>
                    {index < nextSteps.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* Beta Badge */}
          <Grid item xs={12}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'primary.light',
                color: 'primary.contrastText'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight="medium">
                  You're now an official TourGuideAI Beta Tester! Your feedback will help us create a better product.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Box display="flex" justifyContent="center" mt={4}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGetStarted}
            disabled={loading}
            sx={{ 
              minWidth: 200,
              py: 1.5,
              fontSize: '1.1rem',
              boxShadow: 2
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Get Started!'
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WelcomeScreen; 