# Stability Tests

Stability tests ensure that the TourGuideAI application remains reliable and consistent across different environments and usage patterns. These tests validate critical functionality, performance, and integration points to prevent regressions.

## Test Categories

Our stability tests are divided into several categories:

### Frontend Stability Tests

Frontend stability tests validate the UI components, user interactions, and client-side functionality.

**Key validations:**
- Component rendering and lifecycle
- User interaction flows
- State management 
- Responsive design
- Accessibility compliance

**Test files:**
- `src/tests/stability/frontend-stability.test.js` - Core UI component tests
- `src/tests/stability/ux-audit-stability.test.js` - UX Audit System stability tests
- `src/tests/stability/task-prompt-stability.test.js` - Task Prompt System stability tests

### API Stability Tests

API stability tests ensure that backend services and APIs maintain consistent behavior.

**Key validations:**
- Endpoint availability
- Response format consistency
- Error handling
- Authentication and authorization
- Data integrity

**Note:** These tests are integrated into the CI/CD pipeline and are run as part of the E2E test suite in `.github/workflows/e2e-tests.yml`.

### UX Audit System Tests

UX Audit System tests validate the proper functioning of session recording, heatmap visualization, and UX metrics components.

**Key validations:**
- Session recording initialization and data capture
- Event tracking accuracy
- Heatmap data processing and visualization
- UX metrics calculation
- Storage and retrieval of UX data
- Integration with analytics dashboard

**Test files:**
- `src/tests/beta-program/ux-audit/SessionRecording.test.jsx` - Tests for session recording functionality
- `src/tests/beta-program/ux-audit/UXHeatmap.test.jsx` - Tests for heatmap visualization
- `src/tests/beta-program/ux-audit/UXMetricsEvaluation.test.jsx` - Tests for UX metrics calculations
- `src/tests/beta-program/ux-audit/UXAuditDashboard.test.jsx` - Tests for dashboard integration

### Task Prompt System Tests

Task Prompt System tests ensure that in-app guidance works correctly across different user scenarios.

**Key validations:**
- Task prompt display and timing
- Multi-step task guidance
- Task completion tracking
- User feedback collection
- Integration with UX audit recording

**Test files:**
- `src/tests/beta-program/task-prompt/TaskPromptManager.test.jsx` - Tests for task management
- `src/tests/beta-program/task-prompt/InAppTaskPrompt.test.jsx` - Tests for prompt rendering
- `src/tests/beta-program/task-prompt/TaskCompletionFlow.test.jsx` - Tests for completion tracking
- `src/tests/beta-program/task-prompt/TaskPromptUXAudit.test.jsx` - Tests for integration with UX audit

## Running Tests

### Using npm

```bash
# Run all stability tests
npm run test:stability

# Run specific category of tests
npm run test:stability:frontend
npm run test:stability:ux-audit
npm run test:stability:task-prompt

# Run a specific test file
npx jest src/tests/stability/ux-audit-stability.test.js
npx jest src/tests/stability/task-prompt-stability.test.js
npx jest src/tests/beta-program/ux-audit/UXHeatmap.test.jsx
```

### Using Playwright (for UI tests)

```bash
# Run UI-based stability tests
npx playwright test tests/stability/ui-tests

# Run with specific browser
npx playwright test tests/stability/ui-tests --browser=chromium
```

### Using Jest

```bash
# Run all Jest-based stability tests
npx jest src/tests/stability

# Run all ux-audit tests
npx jest src/tests/beta-program/ux-audit

# Run all task-prompt tests
npx jest src/tests/beta-program/task-prompt

# Run with coverage report
npx jest src/tests/stability --coverage
```

## Adding New Tests

### For UX Audit System

When adding new tests for the UX Audit System:

1. Create a new test file in the `tests/stability` directory with a clear name (e.g., `ux-audit-feature.test.js`)
2. Import the required testing utilities:

```javascript
import { test, expect } from '@playwright/test';
import { setupUXAuditTest, mockUXAuditData } from '../test-utils/ux-audit-helpers';
```

3. Structure your tests in logical groups:

```javascript
describe('UX Audit System - [Feature Name]', () => {
  beforeEach(async () => {
    // Setup test environment
    await setupUXAuditTest();
  });

  test('should correctly initialize session recording', async ({ page }) => {
    // Test implementation
    const recordingStarted = await page.evaluate(() => window.UXAudit.startRecording());
    expect(recordingStarted).toBe(true);
  });

  // Add more tests...
});
```

4. Add specific assertions for UX Audit functionality:

```javascript
test('should generate accurate heatmap data', async ({ page }) => {
  // Simulate user interactions
  await page.click('#map-element');
  await page.click('#search-button');
  
  // Verify heatmap data
  const heatmapData = await page.evaluate(() => window.UXAudit.getHeatmapData());
  expect(heatmapData).toHaveProperty('clicks');
  expect(heatmapData.clicks.length).toBeGreaterThan(0);
});
```

### For Task Prompt System

When adding new tests for the Task Prompt System:

1. Create a new test file in the `tests/stability` directory with a clear name (e.g., `task-prompt-feature.test.js`)
2. Import the required testing utilities:

```javascript
import { test, expect } from '@playwright/test';
import { setupTaskPromptTest, mockTaskData } from '../test-utils/task-prompt-helpers';
```

3. Structure your tests in logical groups:

```javascript
describe('Task Prompt System - [Feature Name]', () => {
  beforeEach(async () => {
    // Setup test environment with mock task data
    await setupTaskPromptTest(mockTaskData);
  });

  test('should display task prompt when condition is met', async ({ page }) => {
    // Trigger condition for task prompt
    await page.click('#new-user-element');
    
    // Verify task prompt appears
    const promptVisible = await page.isVisible('.task-prompt-container');
    expect(promptVisible).toBe(true);
    
    // Verify prompt content
    const promptText = await page.textContent('.task-prompt-message');
    expect(promptText).toContain('Complete your profile');
  });

  // Add more tests...
});
```

4. Add specific assertions for multi-step tasks:

```javascript
test('should progress through multi-step task sequence', async ({ page }) => {
  // Start task sequence
  await page.click('#start-tutorial');
  
  // Complete first step
  await page.click('#tutorial-step-1-complete');
  
  // Verify progress to step 2
  const step2Visible = await page.isVisible('[data-step-id="2"]');
  expect(step2Visible).toBe(true);
  
  // Complete all steps
  await page.click('#tutorial-step-2-complete');
  await page.click('#tutorial-step-3-complete');
  
  // Verify completion
  const completionMessage = await page.textContent('.task-completion-message');
  expect(completionMessage).toContain('Tutorial completed');
});
```

## Test Maintenance

- Review and update stability tests when new features are added
- Regularly run stability tests in different environments
- Monitor test performance and optimize slow tests
- Keep test data current and representative

## Test Results

Stability test results are reported in several formats:

- Markdown summary in `docs/project_lifecycle/all_tests/results/stability-test/test-results-summary.md`
- Execution results in `docs/project_lifecycle/all_tests/results/stability-test/stability-test-results.md`
- HTML report in `docs/project_lifecycle/all_tests/results/stability-test/index.html`
- Detailed reports in `docs/project_lifecycle/all_tests/results/stability-test/` directory
- Raw test data in `docs/project_lifecycle/all_tests/results/data/` directory

## Troubleshooting Common Issues

When troubleshooting stability test failures, consult the following resources:

1. **Test Results Summary**: Review `docs/project_lifecycle/all_tests/results/stability-test/test-results-summary.md` for an overview of test outcomes.
2. **Execution Logs**: Check `docs/project_lifecycle/all_tests/results/stability-test/stability-test-results.md` for detailed error messages.
3. **Visual Reports**: Open `docs/project_lifecycle/all_tests/results/stability-test/index.html` in your browser for a visual representation of test results.
4. **Raw Test Data**: Explore `docs/project_lifecycle/all_tests/results/data/` for the underlying data behind the test results.

If you need additional assistance, reach out to the testing team.

### Flaky Tests

If tests are inconsistent or flaky:
- Add appropriate waits for async operations
- Use retry mechanisms for network-dependent tests
- Ensure test isolation to prevent state leakage

### Performance Issues

If tests are running slowly:
- Consider running tests in parallel
- Mock expensive operations when appropriate
- Profile test execution to identify bottlenecks

### Environment-Specific Failures

If tests fail in specific environments:
- Use environment-specific configuration
- Add environment checks to skip incompatible tests
- Use docker containers for consistent test environments 