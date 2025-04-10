/**
 * Component Mocks
 * 
 * Standardized mock implementations for commonly used React components.
 */

const React = require('react');

// Mock components
const mockComponents = {
  // Map Component Mock
  MapComponent: props => (
    <div data-testid="map-component" className="mock-map">
      Map Component (Mock)
      {props.markers && (
        <div data-testid="map-markers">
          Markers: {props.markers.length}
        </div>
      )}
    </div>
  ),
  
  // Loading Indicator Mock
  LoadingIndicator: props => (
    <div 
      data-testid="loading-indicator" 
      className={`mock-loader ${props.fullScreen ? 'full-screen' : ''}`}
    >
      {props.message || 'Loading...'}
    </div>
  ),
  
  // Error Boundary Mock
  ErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>,
  
  // Modal Mock
  Modal: ({ isOpen, onClose, title, children }) => (
    isOpen ? (
      <div data-testid="modal" className="mock-modal">
        <div className="mock-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} data-testid="modal-close-btn">✕</button>
        </div>
        <div className="mock-modal-content">
          {children}
        </div>
      </div>
    ) : null
  ),
  
  // Navigation Mock
  Navigation: () => (
    <nav data-testid="navigation" className="mock-navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/map">Map</a></li>
        <li><a href="/profile">Profile</a></li>
      </ul>
    </nav>
  ),
  
  // Route Card Mock
  RouteCard: ({ route, onEdit, onView, onFavorite }) => (
    <div data-testid="route-card" className="mock-route-card">
      <h3>{route.route_name}</h3>
      <p>{route.destination}</p>
      <p>{route.duration} days</p>
      <div className="mock-route-card-actions">
        {onView && <button onClick={() => onView(route)} data-testid="view-route-btn">View</button>}
        {onEdit && <button onClick={() => onEdit(route)} data-testid="edit-route-btn">Edit</button>}
        {onFavorite && <button onClick={() => onFavorite(route)} data-testid="favorite-route-btn">
          {route.is_favorite ? '★' : '☆'}
        </button>}
      </div>
    </div>
  )
};

// Mock contexts
const mockContexts = {
  // Auth Context Mock
  AuthContext: React.createContext({
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com'
    },
    isAuthenticated: true,
    login: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(true),
    register: jest.fn().mockResolvedValue(true)
  }),
  
  // Notification Context Mock
  NotificationContext: React.createContext({
    showNotification: jest.fn(),
    notifications: [],
    clearNotifications: jest.fn()
  }),
  
  // Loading Context Mock
  LoadingContext: React.createContext({
    isLoading: false,
    setLoading: jest.fn(),
    loadingMessage: ''
  }),
  
  // Theme Context Mock
  ThemeContext: React.createContext({
    theme: 'light',
    toggleTheme: jest.fn()
  })
};

// Mock providers wrapper for easy test setup
const withMockProviders = (children) => {
  const { AuthContext, NotificationContext, LoadingContext, ThemeContext } = mockContexts;
  
  return (
    <AuthContext.Provider value={AuthContext._currentValue}>
      <NotificationContext.Provider value={NotificationContext._currentValue}>
        <LoadingContext.Provider value={LoadingContext._currentValue}>
          <ThemeContext.Provider value={ThemeContext._currentValue}>
            {children}
          </ThemeContext.Provider>
        </LoadingContext.Provider>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

module.exports = {
  mockComponents,
  mockContexts,
  withMockProviders
}; 