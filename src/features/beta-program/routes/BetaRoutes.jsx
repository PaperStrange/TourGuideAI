import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import BetaDashboard from '../pages/BetaDashboard';
import BetaLayout from '../layouts/BetaLayout';
import { OnboardingFlow } from '../components/onboarding';
import FeedbackPage from '../pages/FeedbackPage';
import SurveysPage from '../pages/SurveysPage';
import SurveyDetail from '../pages/SurveyDetail';
import FeatureRequestsPage from '../pages/FeatureRequestsPage';
import FeatureRequestDetailPage from '../pages/FeatureRequestDetailPage';
import NewFeatureRequestPage from '../pages/NewFeatureRequestPage';

// Lazy-loaded components with code splitting
const IssueTracking = lazy(() => import('../components/IssueTracking'));
const UserProfile = lazy(() => import('../components/UserProfile'));
const BetaSettings = lazy(() => import('../components/BetaSettings'));

// Survey components
const SurveyList = lazy(() => import('../components/survey/SurveyList'));
const SurveyDetails = lazy(() => import('../components/survey/SurveyDetails'));
const SurveyAdminDashboard = lazy(() => import('../components/survey/SurveyAdminDashboard'));

// User Testing components
const UserTestingDashboard = lazy(() => import('../components/user-testing/UserTestingDashboard'));

// Authentication Guards
import { BetaAuthGuard } from '../guards/BetaAuthGuard';
import { AdminGuard } from '../guards/AdminGuard';

// Admin components
import { AdminDashboard, InviteCodeManager, IssuePrioritizationDashboard, SLATrackingDashboard } from '../components/admin';

// Portal components
import { BetaPortal } from '../components/portal';

// Authentication components
import { Login, Register, ForgotPassword } from '../components/auth';

// Loading component for suspense fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

/**
 * Protected route component for beta routes
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, userRole } = useAuth();
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/beta/login" replace />;
  }
  
  // Check if user has required role
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/beta/dashboard" replace />;
  }
  
  return children;
};

/**
 * Routes for the beta program features
 */
const BetaRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<BetaLayout />}>
        {/* Dashboard */}
        <Route index element={<BetaDashboard />} />
        
        {/* Onboarding */}
        <Route path="onboarding" element={<OnboardingFlow />} />
        
        {/* Surveys */}
        <Route path="surveys" element={<SurveysPage />} />
        <Route path="surveys/:surveyId" element={<SurveyDetail />} />
        
        {/* Feature Requests */}
        <Route path="feature-requests" element={<FeatureRequestsPage />} />
        <Route path="feature-requests/new" element={<NewFeatureRequestPage />} />
        <Route path="feature-requests/:requestId" element={<FeatureRequestDetailPage />} />
        
        {/* Feedback */}
        <Route path="feedback" element={<FeedbackPage />} />
        
        {/* User Testing */}
        <Route path="user-testing" element={
          <Suspense fallback={<LoadingFallback />}>
            <UserTestingDashboard />
          </Suspense>
        } />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/beta" replace />} />
      </Route>
    </Routes>
  );
};

export default BetaRoutes; 