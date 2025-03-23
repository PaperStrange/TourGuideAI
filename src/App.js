import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { LoadingProvider } from './contexts/LoadingContext';
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

/**
 * Main application component
 * Implements code splitting for route-based components
 * and role-based access control for protected routes
 */
function App() {
  // Initialize permissions on app load
  useEffect(() => {
    const initAuth = async () => {
      if (authService.getToken()) {
        await permissionsService.initialize();
      }
    };
    initAuth();
  }, []);

  return (
    <LoadingProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
              <Routes>
                {/* Public routes */}
                <Route exact path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                
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
      </Router>
    </LoadingProvider>
  );
}

export default App; 