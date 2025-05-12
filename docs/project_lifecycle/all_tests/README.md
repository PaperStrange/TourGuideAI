# Test Management

This directory contains all test-related documentation, plans, and results for the TourGuideAI project.

## Directory Structure

The test management follows the project's standard structure:

- `/docs/project_lifecycle/all_tests/plans/` - Contains all test plans and strategies
- `/docs/project_lifecycle/all_tests/results/` - Contains all test results and reports
- `/docs/project_lifecycle/all_tests/references/` - Contains reference documentation for testing

## Test Results

All test results **MUST** be stored in the `/docs/project_lifecycle/all_tests/results/` directory. This is a **MUST-OBEY PRINCIPLE** as specified in the project.lessons.md file.

The results directory contains the following subdirectories:

- `integration-tests/` - Results from integration tests (HTML reports and JSON data)
- `browserstack/` - Results from BrowserStack tests
- `allure-results/` - Allure report data
- `artifacts/` - Test artifacts such as screenshots and traces
- `playwright-test/` - Results from Playwright tests

## Test Configuration

Test runners are configured to output results to the correct directory in their respective configuration files:

- Playwright: `tests/config/playwright/*.config.js`
- BrowserStack: `tests/config/browserstack/*.config.js`

## Important Note

Do not create or use alternative directories for test results such as:
- `@results/`
- `test-results/`

All results must be stored in the standard location to maintain consistency and follow project standards. 