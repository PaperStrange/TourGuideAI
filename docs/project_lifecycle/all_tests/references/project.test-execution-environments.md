# TourGuideAI Test Execution Environments

This document describes the different environments where tests are executed in the TourGuideAI project.

## Local Development Environment

### Configuration
- **Environment:** Developer's local machine
- **Configuration File:** `/src/tests/config/local.env.js`
- **Mock Data:** `/src/tests/mocks/`
- **Test Runner:** Jest (unit/integration), Playwright (E2E)

### Execution
Unit and integration tests can be run locally using:

```bash
npm run test:unit
npm run test:integration
```

E2E tests can be run locally using:

```bash
npm run test:e2e
```

User journey tests can be run locally using:

```bash
npm run test:journey
```

### Considerations
- Uses local mock data for external dependencies
- Local database instance for integration tests
- Local server instance for E2E tests
- Results are stored in `/playwright-report/` for visual tests

## Continuous Integration Environment

### Configuration
- **Environment:** GitHub Actions
- **Configuration File:** `/src/tests/config/ci.env.js`
- **Workflow Definition:** `/.github/workflows/test.yml`
- **Mock Data:** `/src/tests/mocks/`

### Execution
Tests are automatically executed on:
- Pull request creation
- Push to `develop` branch
- Push to `main` branch

The test workflow includes:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: playwright-report/
```

### Considerations
- Uses containerized environments for consistency
- Ephemeral database instances for integration tests
- Headless browser execution for E2E tests
- Reports are uploaded as artifacts

## Staging Environment

### Configuration
- **Environment:** Cloud-hosted staging environment
- **Configuration File:** `/src/tests/config/staging.env.js`
- **URL:** https://staging.tourguideai.example.com
- **Test Data:** Managed test data in staging database

### Execution
User journey and acceptance tests are run in the staging environment:

```bash
npm run test:journey -- --config=staging
npm run test:acceptance -- --config=staging
```

### Considerations
- Uses real services with test data
- Scheduled nightly test runs
- Used for pre-release verification
- Results are stored in `/playwright-report/staging/`

## Production Validation Environment

### Configuration
- **Environment:** Production-mirrored environment
- **Configuration File:** `/src/tests/config/production-validation.env.js`
- **URL:** https://validation.tourguideai.example.com
- **Test Data:** Production-like data

### Execution
Smoke tests and critical path tests are run before production deployment:

```bash
npm run test:smoke -- --config=production-validation
npm run test:critical-path -- --config=production-validation
```

### Considerations
- Limited scope tests only
- No destructive tests allowed
- Used immediately before production deployment
- Results are stored in `/playwright-report/validation/`

## Production Monitoring Environment

### Configuration
- **Environment:** Production environment
- **Configuration File:** `/src/tests/config/production-monitoring.env.js`
- **URL:** https://tourguideai.example.com
- **Test Data:** Synthetic test accounts

### Execution
Synthetic monitoring tests are run on a schedule:

```bash
npm run test:synthetic -- --config=production-monitoring
```

### Considerations
- Read-only tests only
- No test data creation
- Used for continuous service monitoring
- Results are integrated with monitoring dashboards
- Alerts are configured for test failures

## Environment-Specific Test Data

Each environment has specific test data configurations:

| Environment | Data Source | Reset Policy |
|-------------|------------|--------------|
| Local | In-memory/local DB | Reset on test run |
| CI | Ephemeral containers | Fresh for each run |
| Staging | Dedicated test DB | Weekly reset |
| Validation | Production-like DB | Monthly reset |
| Production | Synthetic accounts | No reset |

## Environment Variables

Environment-specific variables are managed through the configuration files. Example structure:

```javascript
// src/tests/config/local.env.js
module.exports = {
  API_URL: 'http://localhost:3000/api',
  MOCK_EXTERNAL_APIS: true,
  USE_IN_MEMORY_DB: true,
  LOG_LEVEL: 'debug',
  AUTH_BYPASS_TOKEN: 'test-token-local'
};
```

## Related Documentation

- [Test Data Management Strategy](/docs/project_lifecycle/all_tests/references/project.tests.mock-strategies.md)
- [Environment Configuration Guide](/docs/project_lifecycle/development/references/project.environments-config.md)
- [CI/CD Pipeline Documentation](/docs/project_lifecycle/version_control/references/project.ci-cd.md) 