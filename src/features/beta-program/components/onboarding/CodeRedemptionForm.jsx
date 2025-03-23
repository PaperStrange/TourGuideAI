import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Alert,
  Link,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import inviteCodeService from '../../services/InviteCodeService';

/**
 * Beta code redemption form
 * Used in the onboarding flow to validate beta access codes
 * 
 * @param {Object} props Component props
 * @param {String} props.initialCode Initial code value (if provided)
 * @param {Function} props.onSubmit Callback function when a valid code is submitted
 */
const CodeRedemptionForm = ({ initialCode = '', onSubmit }) => {
  // Form state
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  
  // Check code format (6 character alphanumeric)
  const isValidFormat = (code) => {
    return /^[A-Za-z0-9]{6}$/.test(code);
  };
  
  // Effect to format code (uppercase, trim)
  useEffect(() => {
    if (code) {
      const formattedCode = code.trim().toUpperCase();
      if (formattedCode !== code) {
        setCode(formattedCode);
      }
      
      // Clear validation state when code changes
      if (hasAttempted) {
        setIsValid(false);
        setError(null);
      }
    }
  }, [code, hasAttempted]);
  
  // Handle code input change
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    
    // Reset validation state
    if (isValid || error) {
      setIsValid(false);
      setError(null);
    }
  };
  
  // Validate the beta code
  const validateCode = async () => {
    if (!code || !isValidFormat(code)) {
      setError('Please enter a valid 6-character beta code');
      setHasAttempted(true);
      return;
    }
    
    setIsValidating(true);
    setError(null);
    
    try {
      const valid = await inviteCodeService.validateCode(code);
      setIsValid(valid);
      setHasAttempted(true);
      
      if (!valid) {
        setError('Invalid or expired beta code. Please check and try again.');
      }
    } catch (err) {
      console.error('Error validating code:', err);
      setError('An error occurred while validating your code. Please try again.');
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isValid) {
      // If already validated, just submit
      onSubmit(code);
    } else {
      // Validate and then submit if valid
      await validateCode();
      if (isValid) {
        onSubmit(code);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Enter your beta access code
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Please enter the 6-character code you received in your invitation email.
        This code grants you exclusive access to the TourGuideAI beta program.
      </Typography>
      
      <TextField
        fullWidth
        label="Beta Access Code"
        variant="outlined"
        value={code}
        onChange={handleCodeChange}
        error={!!error}
        helperText={error}
        placeholder="Enter 6-character code"
        disabled={isValidating}
        inputProps={{ 
          maxLength: 6,
          style: { textTransform: 'uppercase' }
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {isValid && <CheckCircleOutlineIcon color="success" />}
              {error && <ErrorOutlineIcon color="error" />}
              <Tooltip title="Your beta code is a 6-character alphanumeric code you received via email">
                <IconButton edge="end">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, mt: 2 }}
      />
      
      {isValid && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Beta code verified successfully!
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Implement request code functionality or redirect to support
            window.open('/beta/request-code', '_blank');
          }}
          sx={{ fontSize: '0.875rem' }}
        >
          Don't have a code?
        </Link>
        
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={isValidating || (!isValid && !code)}
        >
          {isValidating ? 'Validating...' : isValid ? 'Continue' : 'Validate Code'}
        </Button>
      </Box>
    </Box>
  );
};

export default CodeRedemptionForm; 