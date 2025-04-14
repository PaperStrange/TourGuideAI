# Playwright Test Results

This directory contains the results of Playwright tests run on the TourGuideAI application.

## Overview

Playwright tests provide automated browser testing across different browsers and platforms. These tests help ensure consistent behavior of the application in various environments.

## Test Implementation

The Playwright tests are implemented using the Playwright testing framework and can be found in:
- `tests/cross-browser/specs/*.js` - Cross-browser compatibility tests
- `tests/stability/ui-tests/*.js` - UI stability tests

## Running Tests

Playwright tests can be run using the following command:

```bash
npm run test:cross-browser
```

For specific browser testing:

```bash
npm run test:cross-browser -- --browser=firefox
```

Available options:
- `--browser`: Specify browser (default: chromium, options: chromium, firefox, webkit)
- `--headed`: Run tests in headed mode (default: headless)
- `--debug`: Run tests in debug mode

## Test Results

HTML reports are generated in the `docs/project_lifecycle/all_tests/results/playwright-test/` directory with screenshots and detailed information about test execution.

## Interpreting Results

Test result files contain:
- Overall pass/fail status for each test
- Screenshots of test failures 
- Browser console logs
- Detailed timing information
- Error messages and stack traces for failures

## Maintaining Tests

When updating the application, ensure that Playwright tests are kept in sync:
1. Update tests when UI elements or behavior changes
2. Add new tests for new features
3. Run tests regularly to catch regressions

## Integration with CI/CD

Playwright tests are run automatically as part of the CI/CD pipeline:
- On pull requests to main branches
- Before deployment to staging environment
- As scheduled runs to detect regression

## Reference Documentation

- [Playwright Test Plan](../../plans/project.tests.frontend-plan.md)
- [Test Execution Results](../project.test-execution-results.md)
- [Test Suite Documentation](../../../../tests/README.md) 