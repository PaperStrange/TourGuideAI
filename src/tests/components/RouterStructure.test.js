/**
 * React Router Structure Tests
 * 
 * Tests to verify the structure of React Router in the application
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '../../App';

// Mock the lazy-loaded components to avoid testing issues
jest.mock('../../pages/HomePage', () => () => <div data-testid="home-page">Home Page</div>);
jest.mock('../../pages/ChatPage', () => () => <div data-testid="chat-page">Chat Page</div>);
jest.mock('../../pages/MapPage', () => () => <div data-testid="map-page">Map Page</div>);
jest.mock('../../pages/ProfilePage', () => () => <div data-testid="profile-page">Profile Page</div>);
jest.mock('../../pages/BetaPortalPage', () => () => <div data-testid="beta-portal-page">Beta Portal Page</div>);
jest.mock('../../features/beta-program/components/admin/AdminDashboard', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('../../features/beta-program/components/admin/InviteCodeManager', () => () => <div data-testid="invite-code-manager">Invite Code Manager</div>);
jest.mock('../../features/beta-program/components/auth/LoginPage', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('../../features/beta-program/pages/VerifyEmailPage', () => () => <div data-testid="verify-email-page">Verify Email Page</div>);
jest.mock('../../features/beta-program/pages/ResetPasswordPage', () => () => <div data-testid="reset-password-page">Reset Password Page</div>);
jest.mock('../../components/common/Navbar', () => () => <div data-testid="navbar">Navbar</div>);
jest.mock('../../features/beta-program/services/AuthService', () => ({
  getToken: jest.fn().mockReturnValue(null),
  checkAuthStatus: jest.fn().mockResolvedValue(false)
}));
jest.mock('../../features/beta-program/services/PermissionsService', () => ({
  initialize: jest.fn(),
  ROLES: {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    BETA_TESTER: 'beta_tester'
  }
}));
jest.mock('../../contexts/LoadingContext', () => ({
  LoadingProvider: ({ children }) => <div data-testid="loading-provider">{children}</div>
}));

describe('Router Structure', () => {
  beforeEach(() => {
    // Mock fetch for the health check
    global.fetch = jest.fn(() => 
      Promise.reject(new Error('Health check failed'))
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should not have nested Router components', async () => {
    // Get the App component source code
    const appSource = App.toString();
    
    // Check that it doesn't include both BrowserRouter and Router
    expect(appSource.includes('BrowserRouter') && appSource.includes('Router')).toBe(false);
    
    // Ensure the App component renders without router-related errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Check if any router-related errors were logged
    const routerErrors = consoleSpy.mock.calls.some(
      call => call[0] && typeof call[0] === 'string' && 
      call[0].includes('You cannot render a <Router> inside another <Router>')
    );
    
    expect(routerErrors).toBe(false);
    consoleSpy.mockRestore();
  });

  test('should render Routes properly', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Check that App contains necessary components
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    
    // In the fallback UI (since health check is mocked to fail)
    expect(screen.getByText(/backend services are not currently available/i)).toBeInTheDocument();
  });
}); 