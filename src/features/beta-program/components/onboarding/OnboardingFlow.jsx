import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Typography,
  Paper,
  useTheme
} from '@mui/material';
import CodeRedemptionForm from './CodeRedemptionForm';
import UserProfileSetup from './UserProfileSetup';
import PreferencesSetup from './PreferencesSetup';
import WelcomeScreen from './WelcomeScreen';
import { apiHelpers } from '../../../../core/services/apiClient';

/**
 * Onboarding Flow Component
 * Manages the entire onboarding process for new beta users with multiple steps
 */
const OnboardingFlow = ({ onComplete, initialStep = 0 }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(initialStep);
  const [completed, setCompleted] = useState({});
  const [userData, setUserData] = useState({
    inviteCode: '',
    email: '',
    name: '',
    username: '',
    profilePicture: null,
    preferences: {
      notifications: {
        email: true,
        push: true,
        digest: 'daily'
      },
      privacy: {
        dataSharing: true,
        analyticsCollection: true
      },
      features: {
        earlyAccess: true,
        betaFeatures: true
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define the steps in the onboarding process
  const steps = [
    'Redeem Invite Code',
    'Create Your Profile',
    'Set Preferences',
    'Get Started'
  ];

  /**
   * Handle the completion of the code redemption step
   */
  const handleCodeRedemption = (codeData) => {
    setUserData({
      ...userData,
      inviteCode: codeData.code,
      email: codeData.email || userData.email
    });
    handleComplete();
  };

  /**
   * Handle the completion of the profile setup step
   */
  const handleProfileSetup = (profileData) => {
    setUserData({
      ...userData,
      ...profileData
    });
    handleComplete();
  };

  /**
   * Handle the completion of the preferences setup step
   */
  const handlePreferencesSetup = (preferencesData) => {
    setUserData({
      ...userData,
      preferences: {
        ...userData.preferences,
        ...preferencesData
      }
    });
    handleComplete();
  };

  /**
   * Handle the completion of the welcome step
   */
  const handleWelcomeComplete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Final submission to the API to complete the onboarding process
      const response = await apiHelpers.post('/beta/complete-onboarding', userData);
      
      if (response.success) {
        // Handle successful completion
        if (onComplete) {
          onComplete(userData);
        }
      } else {
        setError(response.message || 'Failed to complete onboarding');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark the current step as completed and advance to the next step
   */
  const handleComplete = () => {
    const newCompleted = { ...completed };
    newCompleted[activeStep] = true;
    setCompleted(newCompleted);
    handleNext();
  };

  /**
   * Advance to the next step
   */
  const handleNext = () => {
    const newActiveStep =
      activeStep === steps.length - 1
        ? activeStep // If we're at the last step, stay there
        : activeStep + 1;
    setActiveStep(newActiveStep);
  };

  /**
   * Go back to the previous step
   */
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  /**
   * Reset the onboarding flow
   */
  const handleReset = () => {
    setActiveStep(0);
    setCompleted({});
    setUserData({
      inviteCode: '',
      email: '',
      name: '',
      username: '',
      profilePicture: null,
      preferences: {
        notifications: {
          email: true,
          push: true,
          digest: 'daily'
        },
        privacy: {
          dataSharing: true,
          analyticsCollection: true
        },
        features: {
          earlyAccess: true,
          betaFeatures: true
        }
      }
    });
  };

  /**
   * Render the current step content
   */
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <CodeRedemptionForm onSuccess={handleCodeRedemption} onError={(msg) => setError(msg)} />;
      case 1:
        return <UserProfileSetup 
                 initialData={{ email: userData.email, name: userData.name, username: userData.username }}
                 onComplete={handleProfileSetup} 
               />;
      case 2:
        return <PreferencesSetup 
                 initialPreferences={userData.preferences}
                 onComplete={handlePreferencesSetup}
               />;
      case 3:
        return <WelcomeScreen 
                 userName={userData.name}
                 onComplete={handleWelcomeComplete}
                 loading={loading}
                 error={error}
               />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 4, 
          mb: 6, 
          borderRadius: 2,
          background: theme.palette.background.paper
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Beta Program Onboarding
        </Typography>
        
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label} completed={completed[index]}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          {renderStepContent(activeStep)}
        </Box>
        
        {activeStep !== 0 && activeStep !== steps.length - 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            
            <Button 
              variant="contained" 
              onClick={handleComplete}
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Continue'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default OnboardingFlow; 