# TourGuideAI Scripts

This directory contains utility scripts for various operations in the TourGuideAI project.

## Deployment Scripts
- **deploy.sh** - Builds the frontend and starts the server in production mode
  - Usage: `./deploy.sh`

## All Platform Test Scripts

- **run-all-tests.ps1** - PowerShell script that runs all frontend and backend tests
- **run-all-tests.sh** - Bash script that runs all frontend and backend tests

## Testing Scripts

- **run-load-tests.sh** - Runs load testing for performance evaluation
- **run-travel-planning-tests.sh** - Runs scenario-based tests for travel planning features
- **run-security-audit.js** - Performs security audit on the codebase
- **run-stability-tests.js** - Tests application stability under various conditions
- **run-user-journeys.js** - Runs end-to-end user journey tests
- **generate-test-report.js** - Generates consolidated test reports

## Windows-specific Scripts

- **run-analytics-tests.ps1** - PowerShell script for testing analytics features
  - *Note: The older `run_analytics_tests.ps1` is kept for backward compatibility*
- **run-syncservice-test.ps1** - PowerShell script for testing sync services
  - *Note: The older `run_syncservice_test.ps1` is kept for backward compatibility*
- **run-frontend-tests.ps1** - Located in `/tests/` directory, runs all frontend tests
- **run-server-tests.ps1** - Runs all server tests from `/server/tests/` directory

## Deployment Scripts

- **deploy.sh** - Builds the frontend and starts the server in production mode
  - Usage: `./deploy.sh`

## Utility Scripts

- **generate-keys.js** - Generates cryptographic keys for the application
- **fix-jest-config.js** - Fixes Jest configuration issues

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

For PowerShell scripts (Windows):

```powershell
.\scripts\run-all-tests.ps1
```

## References

The scripts reference test files in the following locations:

- Server tests: `/server/tests/*.test.js`
- Frontend tests: `/src/tests/*/*.test.js`
- User journey tests: `/tests/user-journey/*.spec.ts`
- Integration tests: `/tests/integration/`

## Notes

- Some test scripts store results in the `docs/project_lifecycle/all_tests/results/` directory
- For cross-platform use, both `.ps1` and `.sh` versions of critical scripts are provided
- Script naming convention uses hyphens (`run-analytics-tests.ps1`), though some older scripts with underscores are maintained for backward compatibility 