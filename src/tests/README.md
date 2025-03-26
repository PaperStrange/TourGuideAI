# TourGuideAI Test Suite

This directory contains the comprehensive test suite for the TourGuideAI application. The tests are organized by type and feature to ensure thorough coverage of the application's functionality.

## Directory Structure

```
tests/
├── api/           # API integration tests
├── components/    # Component unit tests
├── integration/   # Integration tests between components
├── pages/         # Page-level tests
└── stability/     # Stability and reliability tests
```

## Test Requirements

### Dependencies
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Jest (v27.0.0 or higher)
- React Testing Library (v12.0.0 or higher)
- @testing-library/jest-dom (v5.0.0 or higher)
- @testing-library/user-event (v13.0.0 or higher)
- react-test-renderer (v17.0.0 or higher)
- Playwright (for E2E tests)
- k6 (for load testing)

### Environment Setup
1. Install dependencies:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event react-test-renderer
   ```

2. Create a `.env.test` file in the project root:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your_test_key_here
   ```

## Test Categories

### 1. API Tests (`/api`)
Tests for API integration and endpoints.

#### Test Cases
- Authentication endpoints
- Tour planning endpoints
- User profile endpoints
- Survey system endpoints
- Analytics endpoints

#### Usage
```bash
npm test api
```

### 2. Component Tests (`/components`)
Unit tests for React components.

#### Test Cases
- Theme Provider implementation
- Router structure validation
- Timeline component functionality
- API status handling
- Navigation components
- Form components
- Error boundaries

#### Usage
```bash
npm test components
```

### 3. Integration Tests (`/integration`)
Tests for component interactions and feature workflows.

#### Test Cases
- User authentication flow
- Tour planning workflow
- Survey creation and response flow
- Analytics dashboard interactions
- Profile management workflow

#### Usage
```bash
npm test integration
```

### 4. Page Tests (`/pages`)
Tests for page-level components and routing.

#### Test Cases
- Map page functionality
- Chat interface
- User profile page
- Beta portal pages
- Survey pages
- Analytics dashboard

#### Usage
```bash
npm test pages
```

### 5. Stability Tests (`/stability`)
Tests for system reliability and error handling.

#### Test Cases
- Frontend stability validation
- Router structure verification
- Theme provider implementation
- Error boundary testing
- Global variable handling
- Backend resilience

#### Usage
```bash
npm test stability
```

## Running Tests

### Running All Tests
```bash
npm test
```

### Running Specific Test Categories
```bash
npm test api
npm test components
npm test integration
npm test pages
npm test stability
```

### Running Tests in Watch Mode
```bash
npm test -- --watch
```

### Running Tests with Coverage Report
```bash
npm test -- --coverage
```

## Test Coverage Requirements

- Minimum coverage: 80%
- Critical paths: 100% coverage
- Error handling: 100% coverage
- Component rendering: 100% coverage

## Writing New Tests

### Component Test Template
```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import YourComponent from '../../components/YourComponent';

describe('YourComponent', () => {
  test('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByTestId('your-component')).toBeInTheDocument();
  });
});
```

### API Test Template
```javascript
import { renderHook } from '@testing-library/react-hooks';
import { useYourHook } from '../../hooks/useYourHook';

describe('useYourHook', () => {
  test('handles successful API call', async () => {
    const { result } = renderHook(() => useYourHook());
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## Test Best Practices

1. **Naming Conventions**
   - Test files: `ComponentName.test.js`
   - Test suites: `describe('ComponentName', () => {})`
   - Test cases: `test('should do something specific', () => {})`

2. **Component Testing**
   - Test component rendering
   - Test user interactions
   - Test error states
   - Test loading states
   - Test prop changes

3. **API Testing**
   - Mock API calls
   - Test success scenarios
   - Test error scenarios
   - Test loading states
   - Test retry mechanisms

4. **Integration Testing**
   - Test complete user flows
   - Test component interactions
   - Test state management
   - Test routing
   - Test data persistence

## Debugging Tests

### Common Issues

1. **Test Environment Setup**
   - Ensure all dependencies are installed
   - Check environment variables
   - Verify Jest configuration

2. **Component Testing**
   - Check for missing providers
   - Verify mock implementations
   - Check for async operations

3. **API Testing**
   - Verify mock implementations
   - Check network requests
   - Verify error handling

### Debugging Commands

```bash
# Run tests in debug mode
npm test -- --debug

# Run specific test file
npm test -- path/to/test/file.test.js

# Run tests with verbose output
npm test -- --verbose
```

## Continuous Integration

Tests are automatically run in the CI pipeline:
- On pull requests
- Before merging to main
- On scheduled runs

### CI Configuration
See `.github/workflows/test.yml` for CI configuration details.

## Test Maintenance

1. **Regular Updates**
   - Update tests when components change
   - Add tests for new features
   - Remove obsolete tests

2. **Performance**
   - Keep test execution time under 5 minutes
   - Use appropriate mocking strategies
   - Optimize test setup and teardown

3. **Documentation**
   - Keep test documentation up to date
   - Document test dependencies
   - Update test requirements

## Contributing

When adding new tests:
1. Follow the test templates
2. Ensure proper coverage
3. Add appropriate documentation
4. Update this README if necessary
5. Run all tests before submitting

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles)
- [Project Test Plan](../../docs/project.stability-test-plan.md)
- [Test Results](../../docs/project.test-execution-results.md) 