# Mock Strategies Reference

This document provides detailed guidance on mocking different services and libraries used in the TourGuideAI project. Standardized mocking approaches ensure consistent test behavior and maintainability.

## React Component Mocking

### Recharts Library Mocking

For components that use Recharts for data visualization, use this standardized mock approach:

```javascript
// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: () => <div data-testid="line-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
    PieChart: () => <div data-testid="pie-chart" />,
    Line: () => <div data-testid="line" />,
    Bar: () => <div data-testid="bar" />,
    Pie: ({ children }) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    Sector: () => <div data-testid="sector" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Brush: () => <div data-testid="brush" />
  };
});
```

This approach preserves the original Recharts API while replacing the actual chart components with simple div elements that can be easily tested.

### React Router Mocking

For components that use React Router, use this standard approach:

```javascript
// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: 'test-id' }),
  useLocation: () => ({ 
    pathname: '/test-path',
    search: '?test=true',
    hash: '',
    state: null
  })
}));
```

### Canvas and WebGL Mocking

For components that use canvas or WebGL (like heatmaps):

```javascript
// In setupTests.js
class MockCanvasContext {
  fillRect = jest.fn();
  clearRect = jest.fn();
  getImageData = jest.fn(() => ({
    data: new Array(4).fill(0)
  }));
  putImageData = jest.fn();
  createLinearGradient = jest.fn(() => ({
    addColorStop: jest.fn()
  }));
  beginPath = jest.fn();
  arc = jest.fn();
  fill = jest.fn();
  // Add other methods as needed
}

// Mock canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => new MockCanvasContext());
```

## Service Mocking

### Analytics Service Mocking

For the AnalyticsService used by various components:

```javascript
// Standard mock for AnalyticsService
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getUserActivityData: jest.fn(),
  getFeatureUsageData: jest.fn(),
  getDeviceDistributionData: jest.fn(),
  trackEvent: jest.fn(),
  generateInsights: jest.fn()
}));

// In the beforeEach section of your tests:
analyticsService.getUserActivityData.mockResolvedValue([
  { 
    date: '2023-05-01', 
    activeUsers: 42, 
    totalSessions: 86, 
    newUsers: 8, 
    returningUsers: 34,
    avgSessionLength: 15.2,
    actionsPerSession: 25.4,
    bounceRate: 12.5
  }
  // Add more mock data as needed
]);
```

### API Service Mocking

For REST API services:

```javascript
jest.mock('../../../core/api/apiService', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// In the beforeEach section:
apiService.get.mockResolvedValue({ 
  data: { 
    // Mock response data
  } 
});
```

### Authentication Service Mocking

For the AuthService:

```javascript
jest.mock('../../../services/AuthService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  verifyToken: jest.fn(),
  refreshToken: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn()
}));

// In the beforeEach section:
AuthService.getCurrentUser.mockReturnValue({
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user']
});
AuthService.isAuthenticated.mockReturnValue(true);
```

## Environment Variables and Configuration Mocking

For testing services that rely on environment variables (like KeyManager):

```javascript
// In test setup
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key';
  process.env.KEY_SALT = 'test-salt';
  process.env.KEY_ROTATION_INTERVAL = '1'; // 1 day for testing
  
  // Reset the module to pick up the environment variables
  jest.resetModules();
  // Re-import the module to test
  keyManager = require('./keyManager');
});

// In test teardown
afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.KEY_SALT;
  delete process.env.KEY_ROTATION_INTERVAL;
});
```

## Database Mocking

For database operations:

```javascript
// Mock MongoDB
jest.mock('mongodb', () => {
  const mCollection = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    toArray: jest.fn()
  };
  
  const mDb = {
    collection: jest.fn().mockReturnValue(mCollection)
  };
  
  return {
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(this),
      db: jest.fn().mockReturnValue(mDb),
      close: jest.fn()
    }))
  };
});
```

## Node.js Module Mocking

### Crypto Module Mocking

For crypto operations (used in KeyManager):

```javascript
jest.mock('crypto', () => {
  return {
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('random-mock-bytes')
    }),
    createCipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(Buffer.from('encrypted-data')),
      final: jest.fn().mockReturnValue(Buffer.from('final-data')),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag'))
    }),
    createDecipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(Buffer.from('decrypted-data')),
      final: jest.fn().mockReturnValue(Buffer.from('final-data')),
      setAuthTag: jest.fn()
    }),
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hashed-value')
    })
  };
});
```

### File System (fs) Module Mocking

```javascript
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// In test setup
fs.promises.readFile.mockResolvedValue(JSON.stringify({ 
  // Mock file contents
}));
fs.existsSync.mockReturnValue(true);
```

## Error Handling in Mocks

It's important to test both success and failure scenarios:

```javascript
// Test success case
apiService.get.mockResolvedValue({ data: { /* mock data */ } });

// Test failure case
apiService.get.mockRejectedValue(new Error('API error'));

// Test both in separate test cases
test('handles API success', async () => {
  apiService.get.mockResolvedValueOnce({ data: { /* mock data */ } });
  // Test component with successful API response
});

test('handles API failure', async () => {
  apiService.get.mockRejectedValueOnce(new Error('API error'));
  // Test component with failed API response
});
```

## Conditional Response Mocking

For more complex testing scenarios, use conditional mocking:

```javascript
// Mock that returns different responses based on input
apiService.get.mockImplementation((url) => {
  if (url.includes('/users')) {
    return Promise.resolve({ data: { users: [/* user data */] } });
  } else if (url.includes('/products')) {
    return Promise.resolve({ data: { products: [/* product data */] } });
  } else {
    return Promise.reject(new Error('Not found'));
  }
});
```

## Shared Mocks

For commonly used mocks, create a shared mocks directory:

```javascript
// In src/__mocks__/recharts.js
const React = require('react');

module.exports = {
  // Standard Recharts mock implementation
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  // ... other components
};

// Then in your tests:
jest.mock('recharts');
```

## React DOM Client Mock for React 18

For React 18 compatibility in tests:

```javascript
// In src/__mocks__/react-dom/client.js
module.exports = {
  createRoot: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    unmount: jest.fn()
  }))
};

// Then in setupTests.js:
jest.mock('react-dom/client');
```

## Conclusion

These standardized mocking strategies ensure consistent behavior across tests and make test maintenance easier. Using these patterns will help improve test reliability and prevent common testing issues like flaky tests or false positives. 