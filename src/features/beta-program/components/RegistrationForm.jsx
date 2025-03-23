import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  FormHelperText,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import authService from '../services/AuthService';

/**
 * Registration form for beta program users
 * Includes validation for email, password strength, and beta access code
 * 
 * @param {Object} props Component props
 * @param {Function} props.onSuccess Callback function when registration is successful
 */
const RegistrationForm = ({ onSuccess }) => {
  // Form state
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    betaCode: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password requirements
  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', test: (password) => password.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter', test: (password) => /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'At least one lowercase letter', test: (password) => /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number', test: (password) => /\d/.test(password) },
    { id: 'special', label: 'At least one special character', test: (password) => /[^A-Za-z0-9]/.test(password) }
  ];

  // Check password strength
  const checkPasswordRequirements = (password) => {
    return passwordRequirements.map(req => ({
      ...req,
      fulfilled: req.test(password)
    }));
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });

    // Clear specific error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }

    // Clear form-level errors when any field is edited
    if (formError) {
      setFormError(null);
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formValues.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation
    if (!formValues.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formValues.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation
    if (!formValues.password) {
      newErrors.password = 'Password is required';
    } else {
      const requirements = checkPasswordRequirements(formValues.password);
      const failedRequirements = requirements.filter(req => !req.fulfilled);
      if (failedRequirements.length > 0) {
        newErrors.password = 'Password does not meet requirements';
      }
    }
    
    // Confirm password validation
    if (!formValues.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formValues.password !== formValues.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Beta code validation
    if (!formValues.betaCode) {
      newErrors.betaCode = 'Beta access code is required';
    } else if (formValues.betaCode.length !== 6) {
      newErrors.betaCode = 'Beta code must be 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    
    try {
      // Validate beta code first
      const isValidCode = await authService.validateBetaCode(formValues.betaCode);
      
      if (!isValidCode) {
        setErrors({
          ...errors,
          betaCode: 'Invalid or expired beta code'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Use AuthService register method (updated version)
      const result = await authService.register(
        formValues.email, 
        formValues.betaCode, 
        formValues.name, 
        formValues.password
      );
      
      if (!result) {
        setFormError('Registration failed: Invalid server response');
        setIsSubmitting(false);
        return;
      }
      
      setFormSuccess('Registration successful! Redirecting to your dashboard...');
      
      // Notify parent component of successful registration
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
      }, 1500);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        // Handle specific API errors
        const apiError = error.response.data.error;
        
        if (apiError.type === 'duplicate_email') {
          setErrors({
            ...errors,
            email: 'This email is already registered'
          });
        } else if (apiError.type === 'invalid_invite_code') {
          setErrors({
            ...errors,
            betaCode: 'Invalid or expired beta code'
          });
        } else {
          setFormError(apiError.message || 'Registration failed');
        }
      } else {
        setFormError('Registration failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password requirements display
  const renderPasswordRequirements = () => {
    if (!formValues.password) {
      return null;
    }
    
    const requirements = checkPasswordRequirements(formValues.password);
    
    return (
      <Box sx={{ mt: 1, mb: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Password requirements:
        </Typography>
        <Grid container spacing={1}>
          {requirements.map((req) => (
            <Grid item xs={12} sm={6} key={req.id}>
              <FormHelperText
                sx={{
                  color: req.fulfilled ? 'success.main' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {req.fulfilled ? '✓' : '○'} {req.label}
              </FormHelperText>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}
      
      {formSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {formSuccess}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            name="name"
            label="Full Name"
            fullWidth
            value={formValues.name}
            onChange={handleInputChange}
            error={!!errors.name}
            helperText={errors.name}
            disabled={isSubmitting}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            name="email"
            label="Email Address"
            fullWidth
            type="email"
            value={formValues.email}
            onChange={handleInputChange}
            error={!!errors.email}
            helperText={errors.email}
            disabled={isSubmitting}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            name="password"
            label="Password"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            value={formValues.password}
            onChange={handleInputChange}
            error={!!errors.password}
            helperText={errors.password}
            disabled={isSubmitting}
            required
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
          {renderPasswordRequirements()}
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            name="confirmPassword"
            label="Confirm Password"
            fullWidth
            type={showConfirmPassword ? 'text' : 'password'}
            value={formValues.confirmPassword}
            onChange={handleInputChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={isSubmitting}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleToggleConfirmPasswordVisibility}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            name="betaCode"
            label="Beta Access Code"
            fullWidth
            value={formValues.betaCode}
            onChange={handleInputChange}
            error={!!errors.betaCode}
            helperText={errors.betaCode || "Enter the 6-character code you received via email"}
            disabled={isSubmitting}
            required
            inputProps={{ maxLength: 6 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegistrationForm; 