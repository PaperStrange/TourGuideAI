import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  Alert,
  Divider,
  CircularProgress,
  Grid,
  Autocomplete,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import featureRequestService from '../../services/FeatureRequestService';

/**
 * Feature Request Form Component
 * Form for submitting new feature requests
 */
const FeatureRequestForm = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Available tags for autocomplete
  const availableTags = [
    'ui', 'performance', 'api', 'mobile', 'desktop', 'accessibility',
    'integration', 'feature', 'enhancement', 'bug', 'documentation',
    'security', 'storage', 'export', 'import', 'sync', 'offline',
    'collaboration', 'analytics', 'reporting', 'search', 'filtering',
    'sorting', 'internationalization', 'language', 'theme', 'dark-mode',
    'keyboard-shortcuts', 'notifications', 'user-experience'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await featureRequestService.getCategories();
      // Filter out the "All Categories" option that might be used in the list component
      setCategories(data.filter(category => category.id !== ''));
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error state as we can still submit without categories
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle tag changes
  const handleTagsChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      tags: newValue
    }));
  };

  // Go back to the feature request list
  const handleCancel = () => {
    navigate('/beta/feature-requests');
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      await featureRequestService.submitFeatureRequest(formData);
      
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        title: '',
        description: '',
        category: '',
        tags: []
      });
      
      // Redirect to list after a delay
      setTimeout(() => {
        navigate('/beta/feature-requests');
      }, 3000);
    } catch (err) {
      console.error('Error submitting feature request:', err);
      setSubmitError(err.message || 'Failed to submit feature request. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mr: 2 }}
        >
          Back to Requests
        </Button>
        
        <Typography variant="h5" component="h1">
          Submit a Feature Request
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {submitSuccess ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your feature request has been submitted successfully! You will be redirected to the feature requests list.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="body1" mb={3}>
              Have an idea for improving our product? Submit your feature request below. Our team will review it and consider it for future development.
            </Typography>
            
            <Divider sx={{ mb: 4 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  placeholder="Enter a clear, concise title for your feature request"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  placeholder="Describe your feature request in detail. What problem does it solve? How should it work?"
                  multiline
                  rows={5}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="Category"
                  >
                    {loading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading categories...
                      </MenuItem>
                    ) : (
                      categories.map(category => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  <FormHelperText>
                    Select a category that best fits your feature request
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={availableTags}
                  value={formData.tags}
                  onChange={handleTagsChange}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Type and press enter to add"
                      helperText="Add relevant tags to help categorize your request"
                    />
                  )}
                />
              </Grid>
            </Grid>
            
            {submitError && (
              <Alert severity="error" sx={{ mt: 3, mb: 2 }}>
                {submitError}
              </Alert>
            )}
            
            <Box display="flex" justifyContent="flex-end" mt={4}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{ mr: 2 }}
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FeatureRequestForm; 