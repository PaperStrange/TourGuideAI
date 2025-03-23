import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import ForumIcon from '@mui/icons-material/Forum';

// Styled components
const WelcomeCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
  color: theme.palette.primary.contrastText
}));

const BetaFeature = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

/**
 * Welcome screen for the final step of onboarding flow
 * Shows a summary of the profile and next steps for beta users
 * 
 * @param {Object} props Component props
 * @param {Object} props.profile User profile data
 * @param {Function} props.onFinish Callback function when user completes onboarding
 */
const WelcomeScreen = ({ profile, onFinish }) => {
  // Beta program features to highlight
  const betaFeatures = [
    {
      icon: <ExploreIcon color="primary" fontSize="large" />,
      title: 'Tour Planning',
      description: 'Generate personalized travel itineraries with AI-powered route optimization'
    },
    {
      icon: <MapIcon color="primary" fontSize="large" />,
      title: 'Interactive Maps',
      description: 'Explore your routes with detailed maps and points of interest'
    },
    {
      icon: <ForumIcon color="primary" fontSize="large" />,
      title: 'Beta Community',
      description: 'Join discussions and share feedback with other beta testers'
    }
  ];
  
  // Next steps for beta users
  const nextSteps = [
    'Explore the dashboard to see available features',
    'Create your first travel plan and provide feedback',
    'Join the beta community forum for discussions',
    'Check your email for upcoming feature releases',
    'Share your experience with us through the feedback widget'
  ];
  
  return (
    <Box sx={{ width: '100%' }}>
      <WelcomeCard>
        <EmojiEventsIcon sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" component="h2" gutterBottom>
          Welcome to the TourGuideAI Beta Program!
        </Typography>
        <Typography variant="body1">
          Congratulations, {profile.displayName || 'Beta Tester'}! Your setup is complete,
          and you're ready to start exploring TourGuideAI.
        </Typography>
      </WelcomeCard>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Avatar
          src={profile.profilePicture ? URL.createObjectURL(profile.profilePicture) : undefined}
          sx={{ width: 64, height: 64, mr: 2 }}
        />
        <Box>
          <Typography variant="h6">{profile.displayName || 'Beta Tester'}</Typography>
          {profile.jobTitle && profile.company && (
            <Typography variant="body2" color="textSecondary">
              {profile.jobTitle} at {profile.company}
            </Typography>
          )}
        </Box>
      </Box>
      
      <Typography variant="h6" gutterBottom>
        Beta Program Features
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {betaFeatures.map((feature, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <BetaFeature elevation={2}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                {feature.icon}
              </Box>
              <Typography variant="h6" align="center" gutterBottom>
                {feature.title}
              </Typography>
              <Typography variant="body2" align="center" color="textSecondary">
                {feature.description}
              </Typography>
            </BetaFeature>
          </Grid>
        ))}
      </Grid>
      
      <Divider sx={{ mb: 4 }} />
      
      <Typography variant="h6" gutterBottom>
        Next Steps
      </Typography>
      
      <List>
        {nextSteps.map((step, index) => (
          <ListItem key={index} sx={{ py: 1 }}>
            <ListItemIcon>
              <CheckCircleIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary={step} />
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mt: 4,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FeedbackIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography>
            Your feedback is valuable to us! Use the feedback button at any time.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onFinish}
          size="large"
        >
          Start Exploring
        </Button>
      </Box>
    </Box>
  );
};

export default WelcomeScreen; 