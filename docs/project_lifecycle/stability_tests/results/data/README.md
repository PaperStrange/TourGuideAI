# Stability Test Results Data

This directory contains the raw data results of stability tests runs for the TourGuideAI application.

## Directory Contents

- `.last-run.json` - Information about the last test run
- `stability-test-results-{timestamp}.json` - Detailed results from each test run
- `/core-app/` - Test results specific to core application components
- `/beta-program/` - Test results specific to beta program features

## How Test Results Are Generated

Test results are generated using the stability test scripts:

1. `npm run test:stability` runs the `scripts/run-stability-tests.js` script, which:
   - Runs tests for each application component category
   - Records pass/fail results for each test
   - Saves results to timestamped JSON files in this directory and category subdirectories
   - Updates the `.last-run.json` file with the latest run timestamp

2. `npm run test:report` runs the `scripts/generate-test-report.js` script, which:
   - Reads the JSON data from this directory
   - Generates HTML reports in the `../reports/` directory
   - Creates a main dashboard at `../index.html`

## Data Structure

The JSON test results follow this structure:

```json
{
  "timestamp": "2025-03-27T09:40:34.323Z",
  "totalFiles": 7,
  "passed": [
    {
      "file": "src/tests/pages/ProfilePage.test.js",
      "count": 9
    },
    // More passed tests...
  ],
  "failed": [
    {
      "file": "src/tests/components/survey/SurveyBuilder.test.js",
      "count": 1,
      "error": "DragDropContext is not defined"
    },
    // More failed tests...
  ],
  "summary": {
    "passedCount": 6,
    "failedCount": 1
  }
}
```

## Viewing Test Results

For a better visualization of these results:

1. Run `npm run test:report` to generate an HTML report
2. Open `docs/project_lifecycle/stability_tests/results/index.html` in your browser
3. Navigate to either the full report or specific category results

## Integration with CI/CD

These test results are part of the project's continuous integration pipeline and are used to:

- Verify application stability before deployment
- Track stability metrics over time
- Document test coverage for the application
- Identify regression issues between releases 