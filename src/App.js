import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingProvider } from './contexts/LoadingContext';
import { PermissionsProvider } from './features/beta-program/contexts/PermissionsContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import Navbar from './components/common/Navbar';
import { NavGuard } from './features/beta-program/components/auth';
import authService from './features/beta-program/services/AuthService';
import permissionsService from './features/beta-program/services/PermissionsService';
import { ROLES } from './features/beta-program/services/PermissionsService';
import './styles/App.css';

// Lazy load route components
const HomePage = lazy(() => import('./pages/HomePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BetaPortalPage = lazy(() => import('./pages/BetaPortalPage'));
const AdminDashboard = lazy(() => import('./features/beta-program/components/admin/AdminDashboard'));
const InviteCodeManager = lazy(() => import('./features/beta-program/components/admin/InviteCodeManager'));
const LoginPage = lazy(() => import('./features/beta-program/components/auth/LoginPage'));
const VerifyEmailPage = lazy(() => import('./features/beta-program/pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./features/beta-program/pages/ResetPasswordPage'));

/**
 * Main application component
 * Implements code splitting for route-based components
 * and role-based access control for protected routes
 */
function App() {
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Initialize permissions on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.getToken()) {
          await permissionsService.initialize();
        }
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setBackendAvailable(false);
      }
    };

    // Check if backend is available
    const checkBackend = async () => {
      try {
        const response = await fetch('/health');
        if (!response.ok) {
          throw new Error('Backend health check failed');
        }
        setBackendAvailable(true);
      } catch (error) {
        console.warn('Backend not available:', error);
        setBackendAvailable(false);
      }
    };

    checkBackend();
    initAuth();
  }, []);

  // If backend is not available, show a simplified UI
  if (!backendAvailable) {
    return (
      <LoadingProvider>
        <PermissionsProvider>
          <div className="App">
            <Navbar />
            <main className="main-content">
              <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h1>Welcome to TourGuideAI</h1>
                  <p>The backend services are not currently available. Only static content is being displayed.</p>
                  <p>This could be because:</p>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li>The server component is not running</li>
                    <li>There are configuration issues</li>
                    <li>Network connectivity problems</li>
                  </ul>
                  <p>Try starting the backend with: <code>npm run server</code></p>
                </div>
              </Suspense>
            </main>
          </div>
        </PermissionsProvider>
      </LoadingProvider>
    );
  }

  // Normal app with all routes
  return (
    <LoadingProvider>
      <PermissionsProvider>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
              <Routes>
                {/* Public routes */}
                <Route exact path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
                {/* Beta-tester+ protected routes */}
                <Route path="/chat" element={
                  <NavGuard role={[ROLES.BETA_TESTER, ROLES.MODERATOR, ROLES.ADMIN]}>
                    <ChatPage />
                  </NavGuard>
                } />
                
                <Route path="/map" element={
                  <NavGuard role={[ROLES.BETA_TESTER, ROLES.MODERATOR, ROLES.ADMIN]}>
                    <MapPage />
                  </NavGuard>
                } />
                
                <Route path="/profile" element={
                  <NavGuard role={[ROLES.BETA_TESTER, ROLES.MODERATOR, ROLES.ADMIN]}>
                    <ProfilePage />
                  </NavGuard>
                } />
                
                <Route path="/beta" element={
                  <NavGuard role={[ROLES.BETA_TESTER, ROLES.MODERATOR, ROLES.ADMIN]}>
                    <BetaPortalPage />
                  </NavGuard>
                } />
                
                {/* Admin-only routes */}
                <Route path="/admin" element={
                  <NavGuard role={ROLES.ADMIN}>
                    <AdminDashboard />
                  </NavGuard>
                } />
                
                <Route path="/admin/invite-codes" element={
                  <NavGuard role={[ROLES.ADMIN, ROLES.MODERATOR]} permission="invites:read">
                    <InviteCodeManager />
                  </NavGuard>
                } />
                
                {/* Catch-all - redirect to home */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </PermissionsProvider>
    </LoadingProvider>
  );
}

export default App; 