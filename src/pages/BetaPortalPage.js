import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Lazy load the BetaPortal component for code splitting
const BetaPortal = lazy(() => import('../features/beta-program/components/BetaPortal'));

/**
 * Beta Portal Page
 * Provides access to the beta testing portal interface
 */
const BetaPortalPage = () => {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    }>
      <BetaPortal />
    </Suspense>
  );
};

export default BetaPortalPage; 