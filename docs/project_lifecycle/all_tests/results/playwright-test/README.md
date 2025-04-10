# Playwright Test Results

This directory contains the results of end-to-end tests run with Playwright for the TourGuideAI application.

## Overview

Playwright tests provide comprehensive end-to-end testing of the application, including:
- Cross-browser functionality verification
- UI component interaction testing
- User workflow validation
- Visual regression testing
- Network request mocking and verification

## File Structure

- `playwright-test-results-[timestamp].json`: JSON files containing detailed test results
- `test_summary.md`: Latest summary of test results with pass/fail status
- `screenshots/`: Directory containing screenshots captured during test failures
- `traces/`: Directory containing Playwright traces for debugging failed tests

## Running Tests

Playwright tests can be run using the command:

```bash
npm run test:e2e
```

For visual comparison tests:

```bash
npm run test:visual
```

## Interpreting Results

Test results include:
- Browser compatibility information
- Performance metrics for page loads and interactions
- Screenshots of test failures
- Console logs from test runs
- Network request and response data

## Maintaining Tests

When making UI changes:
1. Update the affected tests
2. Run with `--update-snapshots` to update visual comparison baselines
3. Verify that all tests pass across supported browsers 