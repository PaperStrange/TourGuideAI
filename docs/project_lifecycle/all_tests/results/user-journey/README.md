# User Journey Test Results

This directory contains the results of user journey tests run on the TourGuideAI application.

## Overview

User journey tests simulate realistic user scenarios based on different personas interacting with the TourGuideAI application. These tests help ensure that the application meets the needs of various user types:

- Sarah (Casual Tourist) - Weekend city exploration in Barcelona
- Michael (History Enthusiast) - Historical deep dive in Rome
- Elena (Family Traveler) - Family-friendly London exploration
- James (Business Traveler) - Business trip to Tokyo with limited free time
- Tanya (Adventure Seeker) - Active exploration of Costa Rica

## Test Implementation

The user journey tests are implemented using Playwright and can be found in:
- `tests/user-journey/sarah-casual-tourist.spec.ts`
- `tests/user-journey/michael-history-enthusiast.spec.ts`
- `tests/user-journey/elena-family-traveler.spec.ts`
- `tests/user-journey/james-business-traveler.spec.ts`
- `tests/user-journey/tanya-adventure-seeker.spec.ts`

These tests are based on the user stories defined in `docs/project_lifecycle/all_tests/references/project.test-user-story.md`.

## Running Tests

User journey tests can be run using the following command:

```bash
npm run test:user-journeys
```

Additional options:
- `npm run test:user-journeys:headed` - Run tests in headed mode
- `npm run test:user-journeys:video` - Run tests in headed mode with video recording

For more granular control:

```bash
npm run test:user-journeys -- --journey sarah
```

Available options:
- `--headed` or `-h`: Run in headed mode (default: headless)
- `--video` or `-v`: Record videos of test runs
- `--browser` or `-b`: Specify browser (default: chromium, options: chromium, firefox, webkit)
- `--journey` or `-j`: Run a specific user journey (e.g., "sarah")

## Test Results

HTML reports are generated in the `docs/project_lifecycle/all_tests/results/user-journey` directory with the following structure:
- `sarah-casual-tourist/index.html` - Results for Sarah's journey
- `michael-history-enthusiast/index.html` - Results for Michael's journey
- `elena-family-traveler/index.html` - Results for Elena's journey
- `james-business-traveler/index.html` - Results for James's journey
- `tanya-adventure-seeker/index.html` - Results for Tanya's journey

## Interpreting Results

Test result files contain:
- Overall pass/fail status for each test
- Screenshots and videos (when enabled)
- Detailed timing information
- Error messages and stack traces for failures
- DOM snapshots at point of failure

## Maintaining Tests

When updating the application, ensure that user journey tests are kept in sync:
1. Update tests when UI elements or user flows change
2. Add new tests for new user flows
3. Ensure all user personas remain covered

## Integration with CI/CD

User journey tests are run automatically as part of the CI/CD pipeline:
- On pull requests to main branches
- Before deployment to staging environment
- As scheduled runs to detect regression

## Reference Documentation

- [User Story Documentation](../../references/project.test-user-story.md)
- [Test Execution Results](../project.test-execution-results.md)
- [Test Suite Documentation](../../../../tests/README.md) 