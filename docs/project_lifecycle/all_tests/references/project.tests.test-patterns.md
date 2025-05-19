# Test Patterns Reference

This document outlines standard patterns and conventions for test development in the TourGuideAI project. Following these patterns ensures consistency and maintainability across the test suite.

## Frontend Test Patterns

### Component Test Structure

All component tests should follow this standard structure:

```javascript
// 1. Imports
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComponentToTest from 'path/to/component';
import { ServiceToMock } from 'path/to/service';

// 2. Mocks
jest.mock('path/to/service', () => ({
  ServiceToMock: {
    methodToMock: jest.fn()
  }
}));

// Optional: Mock 3rd party libraries when needed
jest.mock('recharts', () => { 
  // Standard mock pattern for charts
  // See project.tests.mock-strategies.md for specific implementations
});

describe('ComponentName', () => {
  // 3. Setup mock data
  const mockData = [
    // Sample data structure matching what the component expects
  ];

  // 4. Before/after hooks
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    ServiceToMock.methodToMock.mockResolvedValue(mockData);
  });

  afterEach(() => {
    // Any cleanup code
  });

  // 5. Tests organized by component behavior
  describe('Rendering', () => {
    test('renders loading state initially', async () => {
      render(<ComponentToTest />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
    
    test('renders data after loading', async () => {
      render(<ComponentToTest />);
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      // Check for expected elements
    });
  });
  
  describe('Interactions', () => {
    test('handles user interaction correctly', async () => {
      render(<ComponentToTest />);
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Trigger interaction
      fireEvent.click(screen.getByRole('button'));
      
      // Verify results
      expect(ServiceToMock.methodToMock).toHaveBeenCalledWith(expect.any(String));
    });
  });
  
  describe('Error handling', () => {
    test('displays error message when API call fails', async () => {
      // Mock API failure
      ServiceToMock.methodToMock.mockRejectedValue(new Error('Failed to fetch data'));
      
      render(<ComponentToTest />);
      
      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to/i)).toBeInTheDocument();
      });
    });
  });
});
```

### Mock Service Pattern

For mocking services, use this standard approach:

```javascript
// 1. Simple function mock
jest.mock('../../../path/to/service', () => ({
  functionName: jest.fn()
}));

// 2. Class or complex object mock
jest.mock('../../../path/to/service', () => ({
  ServiceName: {
    methodName: jest.fn(),
    anotherMethod: jest.fn()
  }
}));

// 3. Default export mock
jest.mock('../../../path/to/service', () => {
  return jest.fn().mockImplementation(() => ({
    methodName: jest.fn(),
    anotherMethod: jest.fn()
  }));
});
```

## Backend Test Patterns

### API Endpoint Test Structure

```javascript
const request = require('supertest');
const app = require('../../app');
const db = require('../../db');
const AuthService = require('../../services/AuthService');

describe('API Endpoint: /api/endpoint', () => {
  // Setup test data and mocks
  beforeAll(async () => {
    // Connect to test database or setup mocks
    await db.connect();
    // Seed test data if needed
    await db.seed([/* test data */]);
  });
  
  afterAll(async () => {
    // Clean up
    await db.clear();
    await db.disconnect();
  });
  
  beforeEach(() => {
    // Reset mock call history
    jest.clearAllMocks();
  });
  
  describe('GET /api/endpoint', () => {
    test('returns 200 and correct data when authenticated', async () => {
      // Mock authentication
      jest.spyOn(AuthService, 'verifyToken').mockResolvedValue({
        userId: 'test-user-id',
        roles: ['user']
      });
      
      const response = await request(app)
        .get('/api/endpoint')
        .set('Authorization', 'Bearer test-token');
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String)
        })
      ]));
    });
    
    test('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/endpoint');
        
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/endpoint', () => {
    // Similar pattern for POST requests
  });
});
```

### Service Test Structure

```javascript
const ServiceToTest = require('../../services/ServiceToTest');
const DependencyService = require('../../services/DependencyService');

// Mock dependencies
jest.mock('../../services/DependencyService', () => ({
  methodName: jest.fn()
}));

describe('ServiceToTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('methodName', () => {
    test('returns expected result when given valid input', async () => {
      // Setup
      DependencyService.methodName.mockResolvedValue('mocked-result');
      
      // Execute
      const result = await ServiceToTest.methodName('test-input');
      
      // Verify
      expect(DependencyService.methodName).toHaveBeenCalledWith('test-input');
      expect(result).toBe('mocked-result');
    });
    
    test('handles errors correctly', async () => {
      // Setup
      DependencyService.methodName.mockRejectedValue(new Error('test error'));
      
      // Execute and verify
      await expect(ServiceToTest.methodName('test-input'))
        .rejects
        .toThrow('test error');
    });
  });
});
```

## Common Testing Patterns

### Data Factories

For generating test data, use factory functions:

```javascript
// user.factory.js
const createUser = (overrides = {}) => ({
  id: 'default-user-id',
  name: 'Default User',
  email: 'user@example.com',
  role: 'user',
  ...overrides
});

// In tests
const testUser = createUser({ id: 'custom-id' });
```

### Test Environment Variables

Set up test-specific environment variables in a standardized way:

```javascript
// In setupTests.js or similar
process.env.TEST_MODE = 'true';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test-db';
process.env.API_KEY = 'test-api-key';
```

## Test Documentation

All test files should include:

1. A brief description of what is being tested
2. Any special setup requirements
3. Mock patterns used
4. Test coverage goals

## References

See also:
- [Mock Strategies](./project.tests.mock-strategies.md) for detailed mocking approaches
- [Test User Stories](./test-user-stories.md) for behavior-driven test scenarios
- [React Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/) 