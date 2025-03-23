# Cross-Browser Testing Suite

This directory contains the configuration and test files for cross-browser testing of the TourGuideAI application.

## Overview

The cross-browser testing suite uses Playwright and BrowserStack integration to test the application across multiple browsers and devices. It ensures that the application functions correctly and appears consistent across different environments.

## Directory Structure

- `browser-test-matrix.js` - Configuration of browsers, devices, and critical flows to test
- `browserstack.config.js` - BrowserStack integration configuration 
- `playwright.config.js` - Playwright test runner configuration
- `specs/` - Test specifications for different application flows
  - `route-creation.spec.js` - Tests for the route creation flow

## Running Tests

### Local Testing

To run tests locally with Playwright:

```bash
# Install dependencies
npm install

# Run on all configured browsers
npx playwright test --config tests/cross-browser/playwright.config.js

# Run on specific browser
npx playwright test --config tests/cross-browser/playwright.config.js --project=chromium
```

### BrowserStack Testing

To run tests on BrowserStack:

```bash
# Set environment variables
export BROWSERSTACK_USERNAME=your_username
export BROWSERSTACK_ACCESS_KEY=your_access_key

# Run tests
npx browserstack-runner --config tests/cross-browser/browserstack.config.js
```

## Test Matrix

The test matrix in `browser-test-matrix.js` defines:

1. Desktop browsers to test (Chrome, Firefox, Safari, Edge)
2. Mobile devices to test (iPhone, Android devices)
3. Critical application flows to test on each platform
4. Feature-specific browser requirements

## Adding New Tests

To add a new test:

1. Create a new spec file in the `specs/` directory
2. Follow the Playwright test pattern as shown in existing tests
3. Add the test to CI pipeline if appropriate

## Compatibility Table

A full compatibility report is available in `docs/phase5-implementation-status.md`. 