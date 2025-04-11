# Frontend Test Plan

## Overview

This document outlines the comprehensive testing strategy for TourGuideAI frontend components. It covers component testing, integration testing, and end-to-end testing approaches.

## Test Categories

| Category | Description | Tools | Coverage Target |
|----------|-------------|-------|----------------|
| Component Tests | Unit tests for individual React components | Jest, React Testing Library | 85% |
| Integration Tests | Tests for component interactions | Jest, React Testing Library | 75% |
| E2E Tests | Full user journey tests | Cypress | Key user flows |
| Visual Regression | UI appearance tests | Storybook, Chromatic | Core components |
| Accessibility Tests | A11y compliance checks | jest-axe, Cypress-axe | WCAG AA compliance |
| Performance Tests | Load time and rendering metrics | Lighthouse CI | Score > 80 |

## Test Environment Setup

### Development Environment

- Node.js version: 16.x
- React version: 18.x
- Testing libraries:
  - Jest: 27.x
  - React Testing Library: 12.x
  - MSW (Mock Service Worker): 0.40.x
  - Cypress: 10.x

### Configure Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/reportWebVitals.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/cypress/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  }
};
```

### Setup Test Utilities

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
import { setLogger } from 'react-query';
import { server } from './mocks/server';

// Mock React 18 createRoot
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    unmount: jest.fn()
  }))
}));

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Silence react-query errors
setLogger({
  log: console.log,
  warn: console.warn,
  error: () => {}
});
```

## Component Test Strategy

### Test Coverage Priorities

1. **High Priority Components**
   - Authentication components (Login, Register, etc.)
   - Map visualization components
   - Route planning components
   - User profile components
   - Beta program feedback components

2. **Medium Priority Components**
   - Settings components
   - Notification components
   - Analytics dashboards
   - User preference components

3. **Low Priority Components**
   - Marketing components
   - Static content components
   - Admin-only utilities

### Component Test Standards

Every component test should include:

1. **Rendering Tests**
   - Verify component renders without crashing
   - Verify expected elements are in the DOM
   - Verify accessibility (labels, roles, etc.)

2. **Interaction Tests**
   - Verify user interactions (clicks, inputs, etc.)
   - Verify form submissions work correctly
   - Verify conditional rendering based on props/state

3. **API Integration Tests**
   - Verify loading states during API calls
   - Verify successful data display after API calls
   - Verify error handling for failed API calls

4. **Responsiveness Tests (where applicable)**
   - Verify component behaves correctly at different viewport sizes
   - Verify mobile-specific interactions work

### Example Component Test

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginForm from '../components/auth/LoginForm';
import AuthService from '../services/AuthService';

// Mock the auth service
jest.mock('../services/AuthService', () => ({
  login: jest.fn()
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with email and password fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  test('validates form fields and shows error messages', async () => {
    render(<LoginForm />);
    
    // Submit without filling fields
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Expect validation errors
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
  
  test('calls AuthService.login with correct credentials on form submission', async () => {
    render(<LoginForm />);
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Verify auth service was called correctly
    await waitFor(() => {
      expect(AuthService.login).toHaveBeenCalledWith(
        'test@example.com', 
        'password123'
      );
    });
  });
  
  test('displays error message when login fails', async () => {
    // Mock failed login
    AuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    render(<LoginForm />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'wrong-password' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Verify error message is displayed
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

## Travel Planning Component Tests

This section outlines specific testing strategies for the travel planning feature components.

### Test Files Organization

| Component | Test File | Test Coverage |
|-----------|-----------|---------------|
| RouteGenerator | `src/tests/components/travel-planning/RouteGenerator.test.js` | Basic rendering, query analysis, route generation, error handling, loading states |
| RoutePreview | `src/tests/components/travel-planning/RoutePreview.test.js` | Rendering route details, expanding sections, favorites toggling, actions (save, edit) |
| ItineraryBuilder | `src/tests/components/travel-planning/ItineraryBuilder.test.js` | Loading states, editing route details, adding/removing activities, day management, error handling |

### Component-Specific Test Scenarios

1. **RouteGenerator Component**
   - Renders correctly with all UI elements
   - Handles empty queries with appropriate validation
   - Analyzes user queries and displays intent analysis
   - Generates routes from user queries and handles loading states
   - Handles API errors gracefully with informative messages
   - Generates random routes with "Surprise Me" functionality

2. **RoutePreview Component**
   - Renders route information correctly (title, destination, duration)
   - Shows appropriate message when no route is available
   - Expands/collapses different sections (highlights, itinerary, costs)
   - Toggles favorites status correctly
   - Calls appropriate handlers for save and edit actions

3. **ItineraryBuilder Component**
   - Shows loading state while fetching route data
   - Displays route data correctly once loaded
   - Allows editing of route title and overview
   - Enables adding, editing, and removing activities
   - Supports adding new days to the itinerary
   - Handles reordering of activities
   - Allows editing of cost information
   - Displays appropriate error messages on API failures

### Sample Mock Data for Tests

Create mock data factories for consistent test data:

```javascript
// src/__mocks__/routeDataFactory.js
export const createMockRoute = (overrides = {}) => ({
  id: 'route-123',
  name: 'Paris Adventure',
  destination: 'Paris, France',
  duration: 3,
  activities: [
    { id: 'act1', name: 'Eiffel Tower', day: 1, duration: 3, cost: 25 },
    { id: 'act2', name: 'Louvre Museum', day: 2, duration: 4, cost: 15 },
    { id: 'act3', name: 'Seine River Cruise', day: 3, duration: 2, cost: 30 }
  ],
  totalCost: 70,
  createdAt: '2023-01-15T12:00:00Z',
  ...overrides
});

export const createEmptyRoute = () => ({
  id: null,
  name: '',
  destination: '',
  duration: 0,
  activities: [],
  totalCost: 0,
  createdAt: null
});
```

### Travel Planning Integration Tests

Integration tests for the travel planning workflow should verify:

- Complete travel planning workflow from query to saved route
- Error handling during route generation
- Authentication requirements for saving routes
- Interaction between components (RouteGenerator → RoutePreview → ItineraryBuilder)

Example integration test file: `src/tests/integration/travel-planning-workflow.test.js`

## Beta Program Components Tests

This section covers testing for beta program-specific components.

### Onboarding Workflow Testing

**Test Files Organization**

| Component | Test File | Test Coverage |
|-----------|-----------|---------------|
| CodeRedemption | `src/tests/components/beta/CodeRedemption.test.js` | Code validation, error states, form submission |
| ProfileSetup | `src/tests/components/beta/ProfileSetup.test.js` | Field validation, image upload, form submission |
| PreferencesConfig | `src/tests/components/beta/PreferencesConfig.test.js` | Toggle states, preference saving, validation |
| WelcomeScreen | `src/tests/components/beta/WelcomeScreen.test.js` | Information display, action buttons |

**Component-Specific Test Scenarios**

1. **Code Redemption Verification**
   - Valid code acceptance and processing
   - Invalid code error handling
   - Expired code detection
   - Rate limiting for multiple attempts

2. **User Profile Setup Validation**
   - Required field validation
   - Image upload functionality
   - Preview rendering
   - Input validation for all fields
   - Form submission and data persistence

3. **Preferences Configuration Testing**
   - Toggle state persistence
   - Notification preference saving
   - Data sharing level selection
   - Interest topic selection and validation
   - Form submission and data persistence

4. **Welcome Screen Testing**
   - Correct profile information display
   - Feature highlight visibility
   - Next steps action button functionality
   - Conditional content based on user selections

### Survey System Testing

**Test Files Organization**

| Component | Test File | Test Coverage |
|-----------|-----------|---------------|
| SurveyBuilder | `src/tests/components/beta/SurveyBuilder.test.js` | Form validation, question creation, conditional logic |
| SurveyList | `src/tests/components/beta/SurveyList.test.js` | Listing, filtering, status toggling |
| SurveyResponse | `src/tests/components/beta/SurveyResponse.test.js` | Submission, validation, conditional questions |
| SurveyAnalytics | `src/tests/components/beta/SurveyAnalytics.test.js` | Data visualization, export functionality |

## End-to-End Testing

End-to-end tests verify the feature works correctly in a real browser environment and across different devices.

### Cypress Setup

```javascript
// cypress.config.js
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,
});
```

### Key User Flows to Test

1. **Authentication Flow**
   - User registration
   - User login
   - Password reset
   - Account settings

2. **Travel Planning Flow**
   - Route generation from user query
   - Saving and editing routes
   - Managing favorites
   - Sharing routes

3. **Beta Program Flow**
   - Code redemption
   - Profile setup
   - Survey completion
   - Feedback submission

### Example Cypress Test

```javascript
// cypress/e2e/travel-planning.cy.js
describe('Travel Planning Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('testuser@example.com', 'password123');
  });

  it('should generate a route from user query', () => {
    cy.visit('/plan');
    
    // Type a travel query
    cy.get('[data-testid="query-input"]')
      .type('3 days in Paris for a couple interested in art and food');
    
    // Submit the query
    cy.get('[data-testid="generate-button"]').click();
    
    // Verify loading state appears
    cy.get('[data-testid="loading-indicator"]').should('be.visible');
    
    // Verify route details appear
    cy.get('[data-testid="route-preview"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="route-title"]').should('contain', 'Paris');
    
    // Expand itinerary section
    cy.get('[data-testid="itinerary-section-header"]').click();
    
    // Verify activities are displayed
    cy.get('[data-testid="activity-item"]').should('have.length.at.least', 3);
    
    // Save the route
    cy.get('[data-testid="save-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="success-message"]').should('contain', 'saved');
  });

  it('should edit and update a saved route', () => {
    // Navigate to saved routes
    cy.visit('/my-routes');
    
    // Click on first route
    cy.get('[data-testid="route-card"]').first().click();
    
    // Click edit button
    cy.get('[data-testid="edit-button"]').click();
    
    // Modify route title
    cy.get('[data-testid="route-title-input"]')
      .clear()
      .type('Updated Paris Adventure');
    
    // Add a new activity
    cy.get('[data-testid="add-activity-button"]').click();
    cy.get('[data-testid="activity-name-input"]').type('Montmartre Walking Tour');
    cy.get('[data-testid="activity-day-select"]').select('2');
    cy.get('[data-testid="activity-duration-input"]').type('3');
    cy.get('[data-testid="save-activity-button"]').click();
    
    // Save the updated route
    cy.get('[data-testid="save-route-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Verify the updated title is displayed
    cy.get('[data-testid="route-title"]').should('contain', 'Updated Paris Adventure');
    
    // Verify the new activity is displayed
    cy.get('[data-testid="activity-item"]').should('contain', 'Montmartre Walking Tour');
  });
});
```

## Visual Regression Testing

Visual regression tests ensure that UI components appear correctly and changes don't inadvertently affect appearance.

### Setup with Storybook and Chromatic

1. **Configure Storybook:**
   - Install and configure Storybook for the project
   - Create stories for all critical UI components
   - Ensure components are tested across different states and variations

2. **Configure Chromatic:**
   - Connect Storybook with Chromatic for visual testing
   - Set up baselines for each component
   - Configure acceptance thresholds for visual changes

### Key Components for Visual Testing

- Navigation components
- Route cards and previews
- Activity forms and displays
- Maps and location displays
- User profile components
- Survey components
- Feedback forms

## Accessibility Testing

Accessibility tests ensure the application is usable by people with disabilities.

### Jest-axe Setup

```javascript
// src/setupTests.js (add to existing file)
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

### Example Accessibility Test

```javascript
import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import RouteGenerator from '../components/travel-planning/RouteGenerator';

describe('RouteGenerator Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<RouteGenerator />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Performance Testing

Performance tests ensure the UI is responsive and renders efficiently.

### Lighthouse CI Setup

Configure Lighthouse CI to run performance tests in the CI/CD pipeline:

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000/', 'http://localhost:3000/plan'],
      numberOfRuns: 3,
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
};
```

### Key Performance Metrics to Test

| Metric | Target | Testing Tool |
|--------|--------|--------------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |
| Total Blocking Time | < 300ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Bundle Size | < 250KB | Webpack Bundle Analyzer |

## Testing Scripts

Add these scripts to package.json:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "cypress run",
  "test:e2e:open": "cypress open",
  "test:visual": "chromatic",
  "test:a11y": "jest -t 'accessibility'",
  "test:perf": "lhci autorun"
}
```

## Test Maintenance

1. **Regular Activities**
   - Update tests when component behavior changes
   - Add tests for new components and features
   - Refactor tests to follow updated patterns
   - Fix flaky tests promptly

2. **Documentation**
   - Keep test patterns documentation up to date
   - Document common testing issues and solutions
   - Maintain examples of well-written tests

## Reference Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Storybook Documentation](https://storybook.js.org/docs/react/get-started/introduction)
- [Test Patterns Reference](./project.tests.test-patterns.md)
- [Mock Strategies Reference](./project.tests.mock-strategies.md) 