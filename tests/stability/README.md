# Frontend Stability Tests

This directory contains automated tests that verify the stability and reliability of the TourGuideAI frontend. The tests are designed to catch common React issues before they reach production.

## Test Categories

### 1. Router Structure Tests

The router tests ensure that the React Router configuration is correct and doesn't have issues like nested Router components, which cause runtime errors.

Key validations:
- No nested Router components
- Routes correctly defined under a single Router
- Navigation between routes works correctly
- Browser history management functions properly

### 2. Theme Provider Tests

These tests verify that the Material UI ThemeProvider is correctly implemented and applied throughout the application.

Key validations:
- ThemeProvider wraps the application at the root level
- Theme configuration includes necessary palette settings
- Material UI components render with correct theming
- Theme consistency across different components

### 3. Global Variable Handling Tests

Tests that check for proper handling of external libraries and global variables.

Key validations:
- Proper ESLint global declarations for external libraries (e.g., Google Maps)
- No uncaught reference errors for global variables
- Correct loading sequence for external scripts

### 4. Backend Resilience Tests

These tests verify the application's ability to handle backend unavailability or failures.

Key validations:
- Graceful degradation when backend services are down
- Meaningful error messages displayed to users
- UI remains functional with appropriate fallbacks
- Recovery when backend becomes available again

## Running the Tests

### Using Playwright for E2E Testing

```bash
# Run all stability tests
npx playwright test tests/stability/

# Run a specific test file
npx playwright test tests/stability/frontend-stability.test.js

# Run with UI mode for debugging
npx playwright test tests/stability/frontend-stability.test.js --ui
```

### Using Jest for Component Testing

```bash
# Run unit tests for router structure
npm test -- src/tests/components/RouterStructure.test.js

# Run unit tests for theme provider
npm test -- src/tests/components/ThemeProvider.test.js
```

## Adding New Tests

When adding new stability tests, follow these guidelines:

1. Focus on critical UI components and infrastructure
2. Test both success and failure scenarios
3. Use meaningful assertions that validate user-facing behavior
4. Include console error checking for silent runtime issues
5. Document the purpose of each test case clearly

## Integration with CI/CD

These tests are automatically run in the CI/CD pipeline as part of the build-and-test job. The pipeline specifically checks for:

- Router nesting issues
- Theme Provider presence
- Proper ESLint global declarations

See the `.github/workflows/ci-cd.yml` file for implementation details. 