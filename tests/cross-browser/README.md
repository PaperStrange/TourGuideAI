# Cross-Browser Tests

This directory contains cross-browser compatibility tests for TourGuideAI, ensuring the application works correctly across different browsers and platforms.

## Purpose

Cross-browser tests verify that the application's UI and functionality work consistently across multiple browsers, devices, and viewport sizes.

## Directory Contents

- `specs/`: Directory containing cross-browser test specifications
  - `cross-browser.test.js`: General cross-browser compatibility tests
- `travel-planning.spec.js`: Travel planning feature tests across browsers
- `browser-test-matrix.js`: Browser configuration matrix defining the test combinations
- `playwright.config.js`: Playwright configuration specific to cross-browser tests
- `browserstack.config.js`: BrowserStack configuration for running tests on cloud browsers

## Running Cross-Browser Tests

Run the cross-browser tests using the npm script:

```bash
npm run test:cross-browser
```

Or directly with Playwright:

```bash
npx playwright test tests/cross-browser/specs --config=tests/config/playwright.config.js
```

For BrowserStack testing:

```bash
npx browserstack-runner -c tests/config/browserstack.config.js
```

## What These Tests Verify

- Rendering consistency across browsers
- Interactive elements functionality
- Responsive design at different viewport sizes
- Touch interactions on mobile devices
- Browser-specific API compatibility
- Font rendering consistency
- CSS compatibility
- Service worker support

## Browser Coverage

Tests are run against the following browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Chrome (Android)
- Mobile Safari (iOS)

## Test Reports

Cross-browser test reports are generated in the `tests/cross-browser/reports/` directory. 