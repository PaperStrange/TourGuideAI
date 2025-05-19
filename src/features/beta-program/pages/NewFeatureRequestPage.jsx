import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Breadcrumbs, 
  Link 
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FeatureRequestForm } from '../components/feature-request';

/**
 * New Feature Request Page
 * Page for submitting new feature requests
 */
const NewFeatureRequestPage = () => {
  return (
    <Container maxWidth="md">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/beta" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Link 
            component={RouterLink} 
            to="/beta/feature-requests" 
            underline="hover" 
            color="inherit"
          >
            Feature Requests
          </Link>
          <Typography color="text.primary">New Request</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" gutterBottom>
          Submit a Feature Request
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Have an idea for improving TourGuideAI? Let us know what features you'd like to see added.
        </Typography>
        
        <Paper sx={{ p: 3, mt: 4 }}>
          <FeatureRequestForm />
        </Paper>
      </Box>
    </Container>
  );
};

export default NewFeatureRequestPage; 