# TourGuideAI Test Index

This document provides an overview of all testing categories and approaches used in the TourGuideAI application.

## Test Categories

### Unit Tests
- **Location**: `/src/tests/unit`
- **Purpose**: Test individual functions and components in isolation
- **Technologies**: Jest, React Testing Library
- **Run Command**: `npm run test:unit`

### Integration Tests
- **Location**: `/src/tests/integration`
- **Purpose**: Test the interaction between different modules and services
- **Technologies**: Jest, Supertest
- **Run Command**: `npm run test:integration`

### End-to-End Tests
- **Location**: `/tests/e2e`
- **Purpose**: Test complete user flows from start to finish
- **Technologies**: Cypress
- **Run Command**: `npm run test:e2e`

### User Journey Tests
- **Location**: `/tests/user-journey`
- **Purpose**: Simulate realistic user scenarios based on different user personas
- **Technologies**: Playwright
- **Run Command**: `npm run test:user-journeys`
- **Documentation**: See [User Journey Scenarios](project.test-user-story.md)
- **Available Journeys**:
  - Sarah (Casual Tourist) - Barcelona weekend exploration
  - Michael (History Enthusiast) - Rome historical deep dive
  - Elena (Family Traveler) - London family-friendly exploration
  - James (Business Traveler) - Tokyo business trip
  - Tanya (Adventure Seeker) - Costa Rica active exploration

### Security Tests
- **Location**: `/tests/security`
- **Purpose**: Identify security vulnerabilities
- **Technologies**: OWASP ZAP, custom security scripts
- **Run Command**: `npm run test:security`

### Performance Tests
- **Location**: `/tests/performance`
- **Purpose**: Measure application performance under load
- **Technologies**: k6, Lighthouse
- **Run Command**: `npm run test:performance`

### Load Tests
- **Location**: `/tests/load`
- **Purpose**: Test application behavior under heavy load
- **Technologies**: Artillery
- **Run Command**: `npm run test:load`

### Cross-Browser Tests
- **Location**: `/tests/cross-browser`
- **Purpose**: Ensure consistent behavior across different browsers
- **Technologies**: BrowserStack, Playwright
- **Run Command**: `npm run test:cross-browser`

### Accessibility Tests
- **Location**: `/tests/accessibility`
- **Purpose**: Verify application accessibility
- **Technologies**: axe-core, Lighthouse
- **Run Command**: `npm run test:accessibility`

### Stability Tests
- **Location**: `/tests/stability`
- **Purpose**: Verify application stability over extended periods
- **Technologies**: Custom stability scripts
- **Run Command**: `npm run test:stability`

## Test Execution

### Local Development
- Run specific test categories as needed during development
- Pre-commit hooks run relevant tests automatically

### Continuous Integration
- All tests are executed on pull requests
- Security and performance tests run on scheduled intervals
- End-to-end and user journey tests run on staging environment before production deployment

## Test Results

- Test reports are stored in `docs/project_lifecycle/all_tests/results`
- Raw test data is available in `docs/project_lifecycle/all_tests/results/data`
- Stability test reports are available in `docs/project_lifecycle/all_tests/results/stability-test`
- End-to-end test reports are available in `docs/project_lifecycle/all_tests/results/playwright-test`
- User journey test reports are available in `docs/project_lifecycle/all_tests/results/user-journey`
- Security test reports are available in `docs/project_lifecycle/all_tests/results/security-reports`
- Load test reports are available in `docs/project_lifecycle/all_tests/results/load-test`
- CI pipeline displays test results and coverage metrics
- Test failures in CI block deployment to production

## Testing Strategy Documentation

- [Test Plan](../plans/project.tests.frontend-plan.md)
- [User Story Tests](project.test-user-story.md)
- [API Test Specification](project.tests.mock-strategies.md)
- [Test Patterns](project.tests.test-patterns.md) 