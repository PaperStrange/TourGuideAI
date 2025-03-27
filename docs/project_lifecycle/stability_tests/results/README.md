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
- Page components (ProfilePage, ChatPage, MapPage)
- Router functionality
- Error handling
- Theme provider

### Beta Program
- Analytics Dashboard
- Survey components
- Beta feature management

## Adding New Tests

When adding new stability tests:

1. Add the test file to the appropriate location in `src/tests/`
2. Update the test file list in `scripts/run-stability-tests.js`
3. Run the tests to verify they work correctly

## Troubleshooting

If tests are failing:

1. Check the HTML report for detailed error information
2. Review the raw JSON data in the `/data` directory
3. Look for errors in the test console output 