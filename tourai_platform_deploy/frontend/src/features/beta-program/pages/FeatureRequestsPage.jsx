import React from 'react';
import { Box, Typography, Button, Container, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { FeatureRequestList } from '../components/feature-request';

/**
 * Feature Requests Page
 * Displays the list of all feature requests with filtering and sorting options
 */
const FeatureRequestsPage = () => {
  const navigate = useNavigate();

  const handleNewRequest = () => {
    navigate('/beta/feature-requests/new');
  };

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/beta" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Feature Requests</Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Feature Requests
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Browse, vote, and submit new feature ideas for TourGuideAI
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleNewRequest}
          >
            New Request
          </Button>
        </Box>
        
        <FeatureRequestList />
      </Box>
    </Container>
  );
};

export default FeatureRequestsPage; 