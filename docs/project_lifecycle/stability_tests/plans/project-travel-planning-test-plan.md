# Travel Planning Feature Testing Plan

This document provides comprehensive information about the testing approach, coverage, and execution for the Travel Planning feature.

## Test Coverage Overview

The Travel Planning feature has been tested at multiple levels:

1. **Unit Tests**: Testing individual components and services in isolation
2. **Integration Tests**: Testing interactions between components and services
3. **End-to-End Tests**: Testing the complete user journey across the application
4. **Load Tests**: Testing the performance and reliability under heavy load

## Unit Tests

Unit tests verify that each component and service functions correctly in isolation.

### Component Tests

| Component | Test File | Test Coverage |
|-----------|-----------|---------------|
| RouteGenerator | `src/tests/components/travel-planning/RouteGenerator.test.js` | Basic rendering, query analysis, route generation, error handling, loading states |
| RoutePreview | `src/tests/components/travel-planning/RoutePreview.test.js` | Rendering route details, expanding sections, favorites toggling, actions (save, edit) |
| ItineraryBuilder | `src/tests/components/travel-planning/ItineraryBuilder.test.js` | Loading states, editing route details, adding/removing activities, day management, error handling |

### Service Tests

| Service | Test File | Test Coverage |
|---------|-----------|---------------|
| RouteGenerationService | `server/tests/routeGeneration.test.js` | Query analysis, route generation, error handling, constraint-based generation, route optimization |
| RouteManagementService | `server/tests/routeManagement.test.js` | Route CRUD operations, favorites management, route sharing, analytics |

## Integration Tests

Integration tests verify that components and services work together correctly.

### Frontend Integration

| Test File | Test Coverage |
|-----------|---------------|
| `src/tests/integration/travel-planning-workflow.test.js` | Complete travel planning workflow from query to saved route, error handling, authentication integration |

### Backend Integration

| Test File | Test Coverage |
|-----------|---------------|
| `src/tests/integration/routeGeneration.test.js` | End-to-end integration between intent analysis, route generation, external APIs |

## End-to-End Tests

End-to-end tests verify the feature works correctly in a real browser environment and across different devices.

| Test File | Test Coverage |
|-----------|---------------|
| `tests/cross-browser/travel-planning.spec.js` | Full user journey across browsers, responsive design tests, error handling, authentication flow |

## Load Tests

Load tests verify the feature performs adequately under heavy usage.

| Test File | Test Coverage |
|-----------|---------------|
| `tests/load/route-generation-load.js` | Performance under different load levels, success rates, response times |

## Test Setup Instructions

### Prerequisites

- Node.js 14+
- npm 6+
- MongoDB running locally (or connection to remote)
- API keys for OpenAI and Google Maps (for backend tests)

### Environment Variables

The following environment variables must be set:

```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Running Tests with the Script

We've created a script to run all travel planning tests:

```bash
# Make the script executable (Unix/Linux/macOS)
chmod +x scripts/run-travel-planning-tests.sh

# Run all travel planning tests
./scripts/run-travel-planning-tests.sh
```

For Windows users:
```bash
# Run using bash or Git Bash
bash scripts/run-travel-planning-tests.sh
```

### Running Tests Individually

#### Frontend Tests

```bash
# Run all frontend component tests
npm test src/tests/components/travel-planning

# Run specific component test
npm test src/tests/components/travel-planning/RouteGenerator.test.js

# Run integration tests
npm test src/tests/integration/travel-planning-workflow.test.js
```

#### Backend Tests

```bash
# Run all backend tests
npm test server/tests

# Run specific service test
npm test server/tests/routeGeneration.test.js
```

#### End-to-End Tests

```bash
# Setup browsers for testing
npx playwright install

# Run in headed mode for debugging
npx playwright test tests/cross-browser/travel-planning.spec.js --headed

# Run in all browsers
npx playwright test tests/cross-browser/travel-planning.spec.js
```

#### Load Tests

```bash
# Install k6
# Linux: apt-get install k6
# Mac: brew install k6
# Windows: choco install k6

# Run load test
k6 run -e API_BASE_URL=http://localhost:3000/api tests/load/route-generation-load.js
```

## Test Data

The tests use a variety of mock data to simulate different scenarios:

- **Mock Routes**: Paris, Tokyo, New York City with varying durations and activities
- **Mock User Intents**: Different traveler requirements and constraints
- **Mock API Responses**: Simulated responses from external APIs (OpenAI, Google Maps)

## Test Scenarios

### Frontend Component Tests

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

### Backend Service Tests

1. **RouteGenerationService**
   - Extracts user intent from natural language queries
   - Generates complete routes based on user queries
   - Enhances routes with real location data
   - Creates random routes with sensible defaults
   - Handles invalid locations gracefully
   - Manages API errors properly
   - Respects user constraints when generating routes
   - Optimizes existing itineraries for logical sequencing

2. **RouteManagementService**
   - Retrieves routes by ID
   - Gets all routes for a specific user
   - Filters favorite routes correctly
   - Creates new routes with proper validation
   - Updates existing routes while preserving data integrity
   - Validates user ownership before allowing updates
   - Deletes routes and all associated data
   - Manages favorites status (adding/removing)
   - Searches routes by keywords
   - Duplicates routes while preventing ID conflicts
   - Generates sharing tokens for route sharing
   - Provides analytics on route usage

### Integration Tests

- Complete travel planning workflow from query to saved route
- Error handling during route generation
- Authentication requirements for saving routes

### End-to-End Tests

- Route generation from user query
- Saving and editing routes
- Managing favorites
- Error handling during API failures
- Form validation
- Responsive design across device sizes

### Load Tests

- Performance under low load (1-5 concurrent users)
- Performance under medium load (5-10 concurrent users)
- Performance under high load (10-20 concurrent users)
- Success rate metrics
- Response time measurements
- Error handling under stress

## Troubleshooting

### Common Test Failures

1. **Authentication Issues**
   - Check that the test user credentials are valid
   - Verify the authentication token is being correctly passed in headers

2. **API Key Issues**
   - Ensure all required API keys are set in environment variables
   - Verify API keys have the necessary permissions

3. **Timeout Errors**
   - Route generation can take time; increase timeout thresholds if needed
   - Check for network latency issues

4. **Mock Inconsistencies**
   - Ensure mock data matches expected schemas
   - Update mocks if service contracts have changed

### Resolving Test Failures

1. Check the test logs for specific error messages
2. Verify environment setup matches prerequisites
3. Run individual failing tests with verbose logging
4. Check for recent code changes that might affect the tests
5. Verify external dependencies (APIs, databases) are available

## Continuous Integration

The travel planning tests are integrated into the CI/CD pipeline:

1. **Pull Request Validation**: Unit and integration tests run on every PR
2. **Nightly Builds**: End-to-end and load tests run nightly
3. **Release Validation**: All tests run before production deployment

## Test Metrics and Reporting

Test results are collected and analyzed for:

- **Coverage**: Aim for >90% code coverage on unit tests
- **Performance**: All API endpoints should respond within defined SLAs
- **Stability**: >99% test pass rate required for deployment
- **Browser Compatibility**: Tests must pass in Chrome, Firefox, Safari, and Edge

## Future Test Improvements

1. **Visual Regression Testing**: Add snapshots for UI components
2. **Accessibility Testing**: Verify WCAG compliance
3. **Security Testing**: Add penetration tests for API endpoints
4. **Mobile Device Testing**: Expand device coverage for Playwright tests
5. **Internationalization Testing**: Verify features work with multiple languages 