# TourGuideAI Test Suite

This directory contains all tests for the TourGuideAI application, organized by test type and purpose.

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