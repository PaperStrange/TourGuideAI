# Stability Test Results

This directory contains the results of stability tests runs for the TourGuideAI application.

## Directory Contents

- `.last-run.json` - Information about the last test run
- `stability-test-results-{timestamp}.json` - Detailed results from each test run

## How Test Results Are Generated

Test results are generated using the `scripts/run-stability-tests.js` script, which:

1. Runs all stability tests (frontend and backend)
2. Records pass/fail results for each test
3. Saves results to timestamped JSON files
4. Updates the `.last-run.json` file with the latest run timestamp

## Viewing Test Results

Results are saved in JSON format and can be viewed with any text editor or IDE. Key information includes:

- Timestamp of the test run
- Total files tested
- Passed tests (with counts)
- Failed tests (with counts)
- Overall summary statistics

## Integration with CI/CD

These test results are part of the project's continuous integration pipeline and are used to:

- Verify application stability before deployment
- Track stability metrics over time
- Document test coverage for the application 