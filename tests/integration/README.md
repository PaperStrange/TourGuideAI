# TourGuideAI Integration Tests

This directory contains comprehensive integration tests that combine frontend and backend testing with a focus on performance and stability.

## Test Organization

The integration tests are organized as follows:

```
integration/
├── utils/                         # Test utilities and helpers
│   ├── test-helpers.js            # Common test helper functions
│   └── test-setup.js              # Test environment setup functions
├── mocks/                         # Mock data and API responses
│   └── api-responses.js           # Mock API response data
├── workflows/                     # End-to-end workflow tests
│   ├── basic-integration.spec.js  # Basic UI interaction tests
│   ├── travel-planning.spec.js    # Complete travel planning workflow tests
│   ├── simple-workflow.spec.js    # Simplified, stable workflow tests
│   └── user-journey.spec.js       # User journey integration tests
├── performance/                   # Performance-focused tests
│   └── route-generation.perf.spec.js  # Performance tests for route generation
└── stability/                     # Stability-focused tests
    └── api-integration.spec.js    # API stability tests
```

## Key Features

### Mock Mode

Tests run in a mock mode that doesn't require a live server. The mock mode:

- Creates a simulated DOM environment with all needed UI components
- Intercepts and mocks API calls with configurable responses
- Enables testing of various scenarios, including error handling
- Allows testing of authentication flows without a real backend

### Combined Frontend/Backend Testing

Instead of treating frontend and backend as separate concerns, these tests validate:

- Frontend UI interactions
- Backend API integration
- Data flow between frontend and backend
- Error handling and recovery

### Performance Testing

Performance tests measure and enforce metrics such as:

- Page load time
- Route generation time 
- User interaction responsiveness

Performance metrics are saved to JSON files for analysis across test runs.

### Stability Testing

Stability tests verify the application remains functional under:

- Slow network conditions
- API errors and timeouts
- Concurrent requests
- Offline mode

## Test Configuration

Test configuration is in `tests/config/playwright/integration.config.js`. Key settings include:

- Increased timeout for integration tests (60 seconds)
- Retry settings (3 retries in CI, 1 in development)
- HTML and JSON reporting configuration
- Screenshots and video recording on failure

## Running Tests

Use these npm commands to run the tests:

```bash
# Run all integration tests
npm run test:integration

# Run workflow tests only
npm run test:integration:workflows

# Run performance tests only
npm run test:integration:performance

# Run stability tests only
npm run test:integration:stability

# Run basic integration tests
npm run test:integration:basic

# View the test report
npm run test:integration:report
```

## Adding New Tests

When adding new tests:

1. Use the existing test organization (workflow, performance, stability)
2. Leverage the mock mode for reliable, fast tests
3. Include tests for both happy path and error scenarios
4. Measure performance for performance-critical operations

## Maintaining Tests

- Update tests when changing existing functionality
- Keep mock API responses in sync with real API changes
- Review performance metrics regularly to catch regressions 