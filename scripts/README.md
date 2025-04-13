# TourGuideAI Scripts

This directory contains utility scripts for various operations in the TourGuideAI project.

## Deployment Scripts

- **deploy.sh** - Builds the frontend and starts the server in production mode
  - Usage: `./deploy.sh`

## Testing Scripts

- **run-load-tests.sh** - Runs load testing for performance evaluation
- **run-travel-planning-tests.sh** - Runs scenario-based tests for travel planning features
- **run-security-audit.js** - Performs security audit on the codebase
- **run-stability-tests.js** - Tests application stability under various conditions
- **generate-test-report.js** - Generates consolidated test reports

## Windows-specific Scripts

- **run_analytics_tests.ps1** - PowerShell script for testing analytics features
- **run_syncservice_test.ps1** - PowerShell script for testing sync services

## Utility Scripts

- **generate-keys.js** - Generates cryptographic keys for the application

## Usage

Most scripts can be run directly from the scripts directory. For example:

```bash
# Run from project root
./scripts/deploy.sh

# Or navigate to scripts directory first
cd scripts
./deploy.sh
```

For JavaScript scripts, use Node.js:

```bash
node scripts/generate-keys.js
``` 