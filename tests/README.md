# TourGuideAI Test Suite

This directory contains all tests for the TourGuideAI application.

## Test Organization

The tests are organized into the following directories:

```
tests/
├── config/                     # Test configuration files (see below)
├── cross-browser/              # Cross-browser compatibility tests
├── load/                       # Load and performance tests
├── security/                   # Security testing
├── smoke/                      # Smoke tests for quick verification
├── stability/                  # Stability and regression tests
└── user-journey/               # End-to-end user journey tests
```

## Test Configuration

All test configurations have been reorganized for better maintainability. The new structure is:

```
tests/config/
├── jest/                       # Jest configurations
│   ├── backend.config.js       # Configuration for backend tests
│   ├── frontend.config.js      # Configuration for frontend tests
│   └── integration.config.js   # Configuration for integration tests
│
├── playwright/                 # Playwright configurations
│   ├── base.config.js          # Base configuration that others extend
│   └── cross-browser.config.js # Cross-browser specific configuration
│
├── browserstack/               # BrowserStack configurations
│   ├── base.config.js          # Base BrowserStack configuration
│   └── cross-browser.config.js # Cross-browser BrowserStack configuration
│
├── mocks/                      # Mock files for testing
└── integration-setup.js        # Setup for integration tests
```

### Legacy Configuration Files

For backward compatibility, the original configuration files now import from the new structure. You might see references to:

- `tests/config/playwright.config.js` → use `tests/config/playwright/cross-browser.config.js` instead
- `tests/config/jest.frontend.config.js` → use `tests/config/jest/frontend.config.js` instead
- `tests/config/jest.backend.config.js` → use `tests/config/jest/backend.config.js` instead
- `tests/config/jest.integration.config.js` → use `tests/config/jest/integration.config.js` instead
- `tests/config/browserstack.config.js` → use `tests/config/browserstack/cross-browser.config.js` instead

### Updating References

To update references in scripts to use the new configuration paths, run:

```
node scripts/update-config-references.js
```

## Running Tests

See the `scripts` section in `package.json` for available test commands:

```bash
# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run integration tests
npm run test:integration

# Run cross-browser tests
npm run test:cross-browser

# Run load tests
npm run test:load

# Run security tests
npm run test:security

# Run user journey tests
npm run test:user-journeys
```

## Test Directory Structure

```
tests/
├── config/                 # Test configuration files
│   ├── browserstack.config.js  # BrowserStack configuration
│   ├── playwright.config.js    # Playwright configuration
│   └── README.md               # Configuration documentation
├── cross-browser/          # Cross-browser compatibility tests
│   ├── specs/                  # Test specifications
│   │   └── cross-browser.test.js  # General cross-browser tests
│   ├── browser-test-matrix.js  # Browser configuration matrix
│   ├── browserstack.config.js  # BrowserStack-specific configuration
│   ├── playwright.config.js    # Playwright-specific configuration
│   ├── README.md               # Cross-browser testing documentation
│   └── travel-planning.spec.js # Travel planning feature tests
├── load/                   # Load and performance tests
│   ├── scenarios/              # Load test scenarios
│   ├── k6.config.js            # k6 configuration
│   ├── load-test.js            # Main load tests
│   ├── README.md               # Load testing documentation
│   └── route-generation-load.js # Route generation load tests
├── security/               # Security tests and audits
│   ├── security-audit.js       # Security auditing script
│   └── README.md               # Security testing documentation
├── smoke/                  # Smoke tests for critical paths
│   ├── smoke.test.js           # Smoke test suite
│   └── README.md               # Smoke testing documentation
├── stability/              # Stability and reliability tests
│   ├── frontend-stability.test.js # Frontend stability tests
│   └── README.md               # Stability testing documentation
├── user-journey/           # User journey tests with Playwright
│   ├── sarah-casual-tourist.spec.ts        # Casual tourist persona tests
│   ├── michael-history-enthusiast.spec.ts  # History enthusiast persona tests
│   ├── elena-family-traveler.spec.ts       # Family traveler persona tests
│   ├── james-business-traveler.spec.ts     # Business traveler persona tests
│   └── tanya-adventure-seeker.spec.ts      # Adventure seeker persona tests
└── README.md               # This file
```

## Test Categories

### Smoke Tests

Quick tests that verify the most critical functionality of the application is working. These are run frequently and should be fast.

### Cross-Browser Tests

Tests that ensure the application works correctly across different browsers and platforms. These use Playwright and BrowserStack for automation.

### Load Tests

Performance and scalability tests to verify the application can handle expected load. These use k6 for load testing.

### Security Tests

Security auditing and penetration testing scripts that identify potential vulnerabilities in the application.

### Stability Tests

Long-running tests that verify the application's reliability and stability under continuous use.

### User Journey Tests

The `user-journey` directory contains Playwright tests that simulate various user personas interacting with the TourGuideAI application. These tests cover realistic user scenarios and help ensure that the application meets the needs of different user types.

## Contributing to Testing

When adding new tests:

1. Place tests in the appropriate directory based on test type
2. Follow the existing naming conventions
3. Update this documentation if you create new test categories
4. Ensure all tests have proper assertions and error handling
5. Include descriptive comments explaining the test purpose 