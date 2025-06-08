/**
 * Standardized component mocks for testing
 */

import React from 'react';

// Mock Components
export const mockComponents = {
  Timeline: ({ route, timeline }) => (
    <div data-testid="timeline-component">
      <h2>Your Itinerary for {route?.destination || 'Unknown'}</h2>
      <div data-testid="timeline-content">
        {timeline?.days?.map((day, index) => (
          <div key={index} data-testid={`day-${day.travel_day}`}>
            Day {day.travel_day}
          </div>
        )) || <div>No timeline data</div>}
      </div>
    </div>
  ),
  
  ItineraryBuilder: ({ onRouteGenerated }) => (
    <div data-testid="itinerary-builder">
      <button onClick={() => onRouteGenerated?.({})}>
        Generate Route
      </button>
    </div>
  ),
  
  RoutePreview: ({ route }) => (
    <div data-testid="route-preview">
      Route: {route?.destination || 'No destination'}
    </div>
  ),
  
  UserProfileSetup: ({ onComplete }) => (
    <div data-testid="user-profile-setup">
      <button onClick={() => onComplete?.({})}>
        Complete Setup
      </button>
    </div>
  )
};

// Mock Contexts
export const mockContexts = {
  AuthContext: React.createContext({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  }),
  
  NotificationContext: React.createContext({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn()
  })
};

// Higher-order component for providing mock contexts
export const withMockProviders = (Component, contextOverrides = {}) => {
  return function MockedComponent(props) {
    const authValue = { ...mockContexts.AuthContext._currentValue, ...contextOverrides.auth };
    const notificationValue = { ...mockContexts.NotificationContext._currentValue, ...contextOverrides.notification };
    
    return (
      <mockContexts.AuthContext.Provider value={authValue}>
        <mockContexts.NotificationContext.Provider value={notificationValue}>
          <Component {...props} />
        </mockContexts.NotificationContext.Provider>
      </mockContexts.AuthContext.Provider>
    );
  };
};

// Mock hooks
export const mockHooks = {
  useAuth: () => mockContexts.AuthContext._currentValue,
  useNotification: () => mockContexts.NotificationContext._currentValue,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' }),
  useParams: () => ({ id: '1' })
}; 