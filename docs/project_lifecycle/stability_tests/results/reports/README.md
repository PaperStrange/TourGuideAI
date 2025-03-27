# Stability Test Reports

This directory contains HTML reports generated from stability test results for the TourGuideAI application.

## Directory Contents

- `latest.html` - Redirects to the most recent test report
- `stability-test-report-{timestamp}.html` - Detailed HTML reports for each test run

## Accessing Reports

There are several ways to access these reports:

1. **Direct access**: Open `latest.html` in your browser to view the most recent report
2. **Main dashboard**: Open `../index.html` to access both reports and raw data
3. **From the command line**:
   ```bash
   # Generate a fresh report from test data
   npm run test:report
   
   # Open the report (macOS/Linux)
   open docs/project_lifecycle/stability_tests/results/reports/latest.html
   
   # Open the report (Windows)
   start docs/project_lifecycle/stability_tests/results/reports/latest.html
   ```

## Report Features

The HTML reports include:

- **Summary statistics**: Total files tested, pass/fail counts, and percentage
- **Category breakdown**: Results organized by application component category
- **Visual indicators**: Color-coded status badges and progress bars
- **Detailed test logs**: Individual test outcomes with counts and error details
- **Links to raw data**: Access to the underlying JSON data

## Generating New Reports

To generate a new report:

1. Run stability tests:
   ```bash
   npm run test:stability
   ```

2. Generate the HTML report:
   ```bash
   npm run test:report
   ```

The report will be created with the current timestamp and `latest.html` will be updated to point to it.

## Report Archiving

Reports are preserved with their timestamp, allowing historical comparison of test results. This makes it possible to track stability metrics over time and identify when regressions were introduced. 