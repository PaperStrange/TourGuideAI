# Stability Test Results

This directory contains the results of stability tests run on the TourGuideAI application.

## Overview

Stability tests ensure that the application functions reliably across various scenarios and use cases. These tests focus on core functionalities such as:

- Route generation and management
- Timeline synchronization
- User preferences handling
- Data persistence across sessions

## File Structure

- `data/stability-test-results-[timestamp].json`: JSON files containing detailed test results with timestamps
- `data/core-app/stability-test-results-[timestamp].json`: Test results specific to core application components
- `data/beta-program/stability-test-results-[timestamp].json`: Test results specific to beta program features
- `test_summary.md`: Latest summary of test results with pass/fail status
- `reports/`: Directory containing HTML reports generated from test results

## Output Structure

Test results are stored in the following locations:

1. Raw JSON data: `docs/project_lifecycle/all_tests/results/stability-test/data/` directory
   - Combined results: `stability-test-results-[timestamp].json`
   - Core-app results: `core-app/stability-test-results-[timestamp].json`
   - Beta-program results: `beta-program/stability-test-results-[timestamp].json`

2. HTML Reports: `docs/project_lifecycle/all_tests/results/stability-test/` directory
   - Main dashboard: `index.html` in the root results directory
   - Detailed reports: Various HTML files showing test results

## Running Tests

Stability tests can be run using the script:

```bash
node scripts/run-stability-tests.js
```

## Interpreting Results

Test result files contain:

- Overall pass/fail status
- Detailed breakdown by test category
- Specific test failures with error messages
- Test timing information

## Maintaining Tests

When adding new features to the application, corresponding stability tests should be added to ensure comprehensive test coverage. 