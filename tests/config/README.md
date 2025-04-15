# Test Configuration Structure

This directory contains all the test configuration files organized by test framework. The structure is designed to provide a clear separation between different testing tools while allowing code reuse through inheritance.

## Directory Structure

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
│   └── ...                     # Various mock files
│
└── integration-setup.js        # Setup for integration tests
```

## Usage

### Jest Tests

The root `jest.config.js` file uses the environment variable `JEST_ENV` to determine which configuration to use:

```bash
# Run frontend tests
JEST_ENV=frontend npm test

# Run backend tests
JEST_ENV=backend npm test

# Run integration tests
JEST_ENV=integration npm test
```

### Playwright Tests

For Playwright tests, use the appropriate configuration file:

```bash
# Run cross-browser tests with Playwright
npx playwright test --config=tests/config/playwright/cross-browser.config.js
```

### BrowserStack Tests

For BrowserStack tests:

```bash
# Run cross-browser tests on BrowserStack
BROWSERSTACK_USERNAME=your_username BROWSERSTACK_ACCESS_KEY=your_key npm run test:browserstack
```

## Adding New Configurations

When adding new test configurations:

1. Create a new file in the appropriate directory
2. Extend the base configuration where possible
3. Only override what's necessary
4. Document the new configuration in this README 