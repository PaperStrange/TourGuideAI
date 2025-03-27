# Stability Test Results

This directory contains stability test results and reports for the TourGuideAI application. The stability tests verify that critical components of the application function correctly and maintain compatibility between system components.

## Directory Structure

- `/data` - Contains raw JSON test result data
  - `/.last-run.json` - Reference to the most recent test run timestamp
  - `/stability-test-results-{timestamp}.json` - Overall test results from each run
  - `/core-app/` - Test results for core application components
  - `/beta-program/` - Test results for beta program features

- `/reports` - Contains HTML reports generated from test data
  - `/latest.html` - Redirect to the most recent HTML report
  - `/stability-test-report-{timestamp}.html` - Interactive report for each test run

- `/index.html` - Central dashboard for accessing both reports and raw data

## Running Stability Tests

To run the stability tests and generate reports:

1. Run the tests (this will execute all tests and save results to the `/data` directory):
   ```bash
   npm run test:stability
   ```

2. Generate an HTML report from the test results:
   ```bash
   npm run test:report
   ```

3. View the report by opening `/results/index.html` in your browser

## Test Categories

The stability tests are divided into the following categories:

### Core App
- **Page components tests** (`src/tests/pages/`):
  - ProfilePage - User profile rendering and functionality
  - ChatPage - Chat interface and API interactions
  - MapPage - Map visualization and geolocation features

- **Frontend stability tests** (`src/tests/stability/`):
  - Router Structure - Proper React Router configuration
  - Theme Provider - Material UI theming
  - Backend Resilience - Graceful degradation on API failure

### Beta Program
- **Analytics tests** (`src/tests/components/analytics/`):
  - AnalyticsDashboard - Admin analytics visualization
  - User metrics and insights display

- **Survey tests** (`src/tests/components/survey/`):
  - SurveyList - Survey listing and management
  - SurveyBuilder - Survey creation and editing

## Adding New Tests

When adding new stability tests:

1. Add the test file to the appropriate location in `src/tests/`:
   - Core app tests in `src/tests/pages/` or `src/tests/stability/`
   - Beta program tests in `src/tests/components/analytics/` or `src/tests/components/survey/`

2. Update the test file list in `scripts/run-stability-tests.js` by adding your test file to the appropriate category.

3. Run the tests to verify they work correctly:
   ```bash
   npm run test:stability
   npm run test:report
   ```

## Troubleshooting

If tests are failing:

1. Check the HTML report for detailed error information
2. Review the raw JSON data in the `/data` directory
3. Look for errors in the test console output
4. Check the test file itself for any setup issues
5. For component tests, make sure all required props and mocks are provided 