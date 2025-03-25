import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import authService from '../services/AuthService';
import inviteCodeService from '../services/InviteCodeService';
import CodeRedemptionForm from './onboarding/CodeRedemptionForm';
import UserProfileSetup from './onboarding/UserProfileSetup';
import PreferencesSetup from './onboarding/PreferencesSetup';
import WelcomeScreen from './onboarding/WelcomeScreen';

// Styled components
const OnboardingPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius * 2,
}));

const StepContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  minHeight: '300px',
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(4),
}));

/**
 * Onboarding flow for new beta users
 * Guides users through the complete setup process including code redemption
 * 
 * @param {Object} props Component props
 * @param {Function} props.onComplete Callback function when onboarding is complete
 * @param {String} props.initialCode Initial beta code (if provided)
 */
const OnboardingFlow = ({ onComplete, initialCode = '' }) => {
  // Onboarding steps
  const steps = [
    'Redeem Beta Code',
    'Setup Your Profile',
    'Set Preferences',
    'Welcome to Beta'
  ];

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [betaCode, setBetaCode] = useState(initialCode);
  const [userProfile, setUserProfile] = useState({
    displayName: '',
    jobTitle: '',
    company: '',
    profilePicture: null,
    bio: ''
  });
  const [preferences, setPreferences] = useState({
    notificationEmail: true,
    dataSharingLevel: 'minimal',
    tourPreferences: [],
    interestTopics: []
  });

  // Initialize with code if provided
  useEffect(() => {
    if (initialCode) {
      setBetaCode(initialCode);
      // If code is provided and valid, we might want to skip to next step
      validateAndProceed(initialCode);
    }
  }, [initialCode]);

  // Validate code and move to next step if valid
  const validateAndProceed = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      const isValid = await inviteCodeService.validateCode(code);
      
      if (isValid) {
        setSuccess('Beta code accepted!');
        setTimeout(() => {
          setActiveStep(1);
          setSuccess(null);
        }, 1000);
      } else {
        setError('Invalid or expired beta code. Please check and try again.');
      }
    } catch (err) {
      console.error('Error validating beta code:', err);
      setError('Error validating beta code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle code redemption
  const handleCodeRedemption = (code) => {
    setBetaCode(code);
    validateAndProceed(code);
  };

  // Handle profile setup
  const handleProfileSetup = (profileData) => {
    setUserProfile(profileData);
    setActiveStep(2);
  };

  // Handle preferences setup
  const handlePreferencesSetup = (preferencesData) => {
    setPreferences(preferencesData);
    setActiveStep(3);
  };

  // Handle completion of onboarding
  const handleFinishOnboarding = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Save all data to user profile
      await authService.updateUserProfile({
        ...userProfile,
        preferences,
        onboardingCompleted: true
      });
      
      setSuccess('Onboarding completed successfully!');
      
      // Notify parent component
      setTimeout(() => {
        if (onComplete) {
          onComplete({
            betaCode,
            profile: userProfile,
            preferences
          });
        }
      }, 1500);
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Error saving your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    setActiveStep(prevStep => prevStep + 1);
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Render current step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <CodeRedemptionForm 
            initialCode={betaCode} 
            onSubmit={handleCodeRedemption} 
          />
        );
      case 1:
        return (
          <UserProfileSetup
            initialData={userProfile}
            onSubmit={handleProfileSetup}
          />
        );
      case 2:
        return (
          <PreferencesSetup
            initialData={preferences}
            onSubmit={handlePreferencesSetup}
          />
        );
      case 3:
        return (
          <WelcomeScreen
            profile={userProfile}
            onFinish={handleFinishOnboarding}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md">
      <OnboardingPaper>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Beta Program Onboarding
        </Typography>
        
        <Typography variant="body1" color="textSecondary" align="center" paragraph>
          Complete the following steps to set up your beta experience
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ my: 2 }}>
            {success}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <StepContainer>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            getStepContent(activeStep)
          )}
        </StepContainer>
        
        <ButtonContainer>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={loading || (activeStep === 0 && !betaCode)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleFinishOnboarding}
              disabled={loading}
            >
              Finish
            </Button>
          )}
        </ButtonContainer>
      </OnboardingPaper>
    </Container>
  );
};

export default OnboardingFlow; 