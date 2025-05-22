import React, { useState } from 'react';
import { 
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Collapse
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import ClearIcon from '@mui/icons-material/Clear';
import { apiHelpers } from '../../../../core/services/apiClient';

/**
 * Beta Code Redemption Form
 * Handles validation and redemption of beta invite codes
 */
const CodeRedemptionForm = ({ onSuccess, onError }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [validationState, setValidationState] = useState(null); // null, 'validating', 'valid', 'invalid'

  /**
   * Validate the invite code format
   * @param {string} codeValue The invite code to validate
   * @returns {boolean} Whether the code has a valid format
   */
  const isValidCodeFormat = (codeValue) => {
    // Beta codes should follow pattern: XXXX-XXXX-XXXX where X is alphanumeric
    const codePattern = /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/;
    return codePattern.test(codeValue);
  };

  /**
   * Handle input change and validate format in real-time
   */
  const handleCodeChange = (event) => {
    const newCode = event.target.value;
    setCode(newCode);
    setError(null);
    
    // Auto-format as user types (add hyphens)
    if (newCode.length === 4 && !newCode.includes('-')) {
      setCode(newCode + '-');
    } else if (newCode.length === 9 && newCode.indexOf('-', 5) === -1) {
      setCode(newCode + '-');
    }
    
    // Live validation
    if (newCode.length > 0) {
      if (isValidCodeFormat(newCode)) {
        setValidationState('valid');
      } else if (newCode.length >= 14) {
        setValidationState('invalid');
      } else {
        setValidationState('validating');
      }
    } else {
      setValidationState(null);
    }
  };

  /**
   * Handle form submission and code validation with the API
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!isValidCodeFormat(code)) {
      setError('Please enter a valid invite code (XXXX-XXXX-XXXX)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the beta code API endpoint
      const response = await apiHelpers.post('/beta/redeem-code', { code });
      
      setLoading(false);
      
      if (response.valid) {
        setSuccess(true);
        setValidationState('valid');
        
        // Call success callback with user data
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(response.userData);
          }, 1000); // Small delay for visual feedback
        }
      } else {
        setError(response.message || 'Invalid or expired code');
        setValidationState('invalid');
        if (onError) onError(response.message);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to validate code. Please try again.');
      setValidationState('invalid');
      if (onError) onError(err.message);
    }
  };

  /**
   * Get the appropriate icon based on validation state
   */
  const getValidationIcon = () => {
    if (validationState === 'valid') {
      return <CheckCircleIcon color="success" />;
    } else if (validationState === 'invalid') {
      return <ErrorIcon color="error" />;
    } else if (validationState === 'validating' && code.length > 0) {
      return <CircularProgress size={20} />;
    }
    return null;
  };

  return (
    <Card 
      sx={{ 
        maxWidth: 500, 
        mx: 'auto', 
        mt: 4,
        boxShadow: 3,
        borderRadius: 2
      }}
    >
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Enter Beta Invite Code
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph align="center">
          Please enter the invite code you received via email to access the beta program.
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <ClearIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setSuccess(false)}
              >
                <ClearIcon fontSize="inherit" />
              </IconButton>
            }
          >
            Code accepted! Proceeding to account setup...
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Beta Invite Code"
            variant="outlined"
            value={code}
            onChange={handleCodeChange}
            margin="normal"
            placeholder="XXXX-XXXX-XXXX"
            disabled={loading || success}
            error={validationState === 'invalid'}
            helperText={validationState === 'invalid' ? "Invalid code format" : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {getValidationIcon()}
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          
          <Collapse in={helpOpen}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your beta invite code was sent to your email address when you were selected for the beta program.
                The code is in the format XXXX-XXXX-XXXX (e.g., A1B2-C3D4-E5F6).
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                If you've lost your code or didn't receive one, please contact support at beta@tourguideai.com
              </Typography>
            </Alert>
          </Collapse>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              startIcon={<HelpIcon />}
              onClick={() => setHelpOpen(!helpOpen)}
              color="secondary"
            >
              {helpOpen ? "Hide Help" : "Need Help?"}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading || success || validationState !== 'valid'}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : "Redeem Code"}
            </Button>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Don't have a code? <Button color="secondary" size="small">Request Access</Button>
        </Typography>
      </CardActions>
    </Card>
  );
};

export default CodeRedemptionForm; 