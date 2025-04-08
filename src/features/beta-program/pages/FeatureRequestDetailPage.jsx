import React from 'react';
import { Container } from '@mui/material';
import { FeatureRequestDetails } from '../components/feature-request';

/**
 * Feature Request Detail Page
 * Container for the feature request details component
 */
const FeatureRequestDetailPage = () => {
  return (
    <Container maxWidth="lg">
      <FeatureRequestDetails />
    </Container>
  );
};

export default FeatureRequestDetailPage; 