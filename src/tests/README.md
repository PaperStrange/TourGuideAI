# TourGuideAI Test Suite

This directory contains the comprehensive test suite for the TourGuideAI application. The tests are organized by type and feature to ensure thorough coverage of the application's functionality.

## Directory Structure

```
tests/
├── api/           # API integration tests
├── components/    # Component unit tests
├── integration/   # Integration tests between components
├── pages/         # Page-level tests
└── stability/     # Stability and reliability tests
```

## Test Requirements

### Dependencies
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Jest (v27.0.0 or higher)
- React Testing Library (v12.0.0 or higher)
- @testing-library/jest-dom (v5.0.0 or higher)
- @testing-library/user-event (v13.0.0 or higher)
- react-test-renderer (v17.0.0 or higher)
- Playwright (for E2E tests)
- k6 (for load testing)

### Environment Setup
1. Install dependencies:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event react-test-renderer
   ```

2. Create a `.env.test` file in the project root:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your_test_key_here
   ```

## Test Types

The TourGuideAI test suite includes the following types of tests:

- **Unit Tests**: Tests for individual functions and components in isolation
- **Integration Tests**: Tests that verify interactions between components
- **API Tests**: Tests for backend API endpoints
- **End-to-End Tests**: Full stack tests that simulate real user behavior
- **UX Audit Tests**: Tests for the UX Audit System components and services
- **Task Prompt Tests**: Tests for the Task Prompt System functionality
- **Performance Tests**: Tests to verify system performance under various loads
- **Accessibility Tests**: Tests to ensure compliance with accessibility guidelines

## Test Categories

The TourGuideAI test suite is organized by feature:

- **Authentication Tests**: Tests for user login, registration, and session management
- **Tour Planning Tests**: Tests for tour creation, editing, and recommendation features
- **User Profile Tests**: Tests for user profile management
- **Map Integration Tests**: Tests for map rendering and location services
- **UX Audit System Tests**: Tests for session recording, heatmap visualization, and UX metrics evaluation
- **Task Prompt System Tests**: Tests for task prompt creation, delivery, and user interaction tracking
- **Error Handling Tests**: Tests for error boundaries and recovery mechanisms
- **Localization Tests**: Tests for multiple language support

### 1. API Tests (`/api`)
Tests for API integration and endpoints.

#### Test Cases
- Authentication endpoints
- Tour planning endpoints
- User profile endpoints
- Survey system endpoints
- Analytics endpoints
- UX Audit System API endpoints
- Task Prompt System API endpoints

#### Usage
```bash
npm test api
```

### 2. Component Tests (`/components`)
Unit tests for React components.

#### Test Cases
- Theme Provider implementation
- Router structure validation
- Timeline component functionality
- API status handling
- Navigation components
- Form components
- Error boundaries
- Session Recording components
- Heatmap Visualization components
- UX Metrics Evaluation components
- Task Prompt components

#### Usage
```bash
npm test components
```

### 3. Integration Tests (`/integration`)
Tests for component interactions and feature workflows.

#### Test Cases
- User authentication flow
- Tour planning workflow
- Survey creation and response flow
- Analytics dashboard interactions
- Profile management workflow
- UX Audit System integration with Analytics
- Task Prompt System integration with UX Audit

#### Usage
```bash
npm test integration
```

### 4. Page Tests (`/pages`)
Tests for page-level components and routing.

#### Test Cases
- Map page functionality
- Chat interface
- User profile page
- Beta portal pages
- Survey pages
- Analytics dashboard
- UX Audit dashboard
- Task management pages

#### Usage
```bash
npm test pages
```

### 5. Stability Tests (`/stability`)
Tests for system reliability and error handling.

#### Test Cases
- Frontend stability validation
- Router structure verification
- Theme provider implementation
- Error boundary testing
- Global variable handling
- Backend resilience
- UX Audit System component stability
- Task Prompt System state management

#### Usage
```bash
npm test stability
```

### 6. UX Audit System Tests (`/beta-program/ux-audit`)
Tests for the UX Audit System components and functionality.

#### Test Cases
- Session Recording playback
- Heatmap visualization
- UX metrics evaluation
- Data export functionality
- Integration with analytics dashboard
- Authentication and permissions

#### Detailed Test Implementation
The UX Audit System tests follow these principles:

1. **Component Isolation**: Each component is tested in isolation with mocked dependencies.
2. **Realistic Data**: Tests utilize realistic mock data from `tests/mocks/uxAuditMocks.js`.
3. **User Interaction**: Tests simulate real user interactions using `@testing-library/user-event`.
4. **Integration Points**: Tests verify proper integration with other systems.
5. **Performance Monitoring**: Tests include performance assertions for critical operations.

Key test files:
- `SessionRecording.test.jsx`: Tests for recording playback, controls, and timeline interactions
- `UXHeatmap.test.jsx`: Tests for heatmap visualization with varying data densities
- `UXMetricsEvaluation.test.jsx`: Tests for metrics calculations and chart rendering
- `UXAuditDashboard.test.jsx`: Tests for dashboard integration of all UX audit components

#### Usage
```bash
npm test ux-audit
```

### 7. Task Prompt System Tests (`/beta-program/task-prompt`)
Tests for the Task Prompt System components and functionality.

#### Test Cases
- Task listing and filtering
- Task prompt display
- Task step navigation
- Task state management
- Task completion flow
- Integration with session recording
- Multi-task handling

#### Detailed Test Implementation
The Task Prompt System tests emphasize:

1. **Task Lifecycle**: Tests cover the entire lifecycle from task initiation to completion.
2. **State Management**: Tests validate proper state transitions throughout task flows.
3. **User Guidance**: Tests verify that appropriate guidance is provided at each step.
4. **UX Audit Integration**: Tests confirm that task actions are properly recorded.
5. **Multi-Task Coordination**: Tests ensure that multiple concurrent tasks are handled correctly.

Key test files:
- `TaskPromptManager.test.jsx`: Tests for task management, queuing, and prioritization
- `InAppTaskPrompt.test.jsx`: Tests for task prompt UI rendering and user interactions
- `TaskCompletionFlow.test.jsx`: Tests for step progression and completion handling
- `TaskPromptUXAudit.test.jsx`: Tests for integration with the UX audit system

#### Usage
```bash
npm test task-prompt
```

### 8. Load Tests (`/load`)
Performance tests to ensure the application handles high traffic.

#### Test Cases
- Home page load performance
- Route generation performance
- Map visualization performance
- Session recording loading performance
- Heatmap rendering performance
- Task prompt response time

#### Usage
```bash
npm run test:load
```

### 9. Smoke Tests
Quick tests to verify core functionality after deployment.

#### Test Cases
- Critical page loading
- Core functionality verification
- Beta program access
- UX Audit System accessibility
- Task Prompt System accessibility

#### Usage
```bash
npm run test:smoke
```

## Running Tests

To run the test suite:

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:api
npm run test:e2e
npm run test:ux-audit
npm run test:task-prompt
npm run test:performance
npm run test:accessibility

# Run tests for specific features
npm run test:auth
npm run test:tours
npm run test:profiles
npm run test:maps
npm run test:ux-audit-system
npm run test:task-prompt-system
npm run test:errors
npm run test:localization
```

## Test Coverage Requirements

- Minimum coverage: 80%
- Critical paths: 100% coverage
- Error handling: 100% coverage
- Component rendering: 100% coverage
- UX Audit components: 90% coverage
- Task Prompt components: 90% coverage

## Writing New Tests

### Component Test Template
```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentToTest from 'path/to/component';

describe('ComponentToTest', () => {
  test('renders correctly', () => {
    render(<ComponentToTest />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  test('handles user interaction', async () => {
    render(<ComponentToTest />);
    userEvent.click(screen.getByRole('button', { name: 'Click Me' }));
    await waitFor(() => {
      expect(screen.getByText('Response Text')).toBeInTheDocument();
    });
  });
});
```

### UX Audit System Test Guidelines

When writing tests for UX Audit System components:

1. **Mock Data**: Use the data generators in `tests/mocks/uxAuditMocks.js`:
   ```javascript
   import { getMockSessionRecording, getMockHeatmapData } from '../../mocks/uxAuditMocks';
   
   const sessionData = getMockSessionRecording('complex-navigation');
   const heatmapData = getMockHeatmapData('high-density');
   ```

2. **Service Mocks**: Mock the data services:
   ```javascript
   jest.spyOn(SessionRecordingService, 'fetchRecording').mockResolvedValue(sessionData);
   ```

3. **Interaction Testing**: Test user interactions comprehensively:
   ```javascript
   // Test playback controls
   userEvent.click(screen.getByTestId('play-button'));
   expect(screen.getByTestId('playback-status')).toHaveTextContent('Playing');
   
   // Test timeline seeking
   userEvent.click(screen.getByTestId('timeline-progress-bar'), { clientX: 150 });
   expect(screen.getByTestId('current-time')).toHaveTextContent('00:15');
   ```

4. **Performance Testing**: Include performance assertions:
   ```javascript
   // Measure render time for large datasets
   const startTime = performance.now();
   render(<UXHeatmap data={largeHeatmapData} />);
   const renderTime = performance.now() - startTime;
   expect(renderTime).toBeLessThan(200); // Renders in under 200ms
   ```

5. **Integration Testing**: Test integration with other components:
   ```javascript
   render(
     <>
       <SessionRecording recordingId="rec-123" />
       <UXMetricsEvaluation recordingId="rec-123" />
     </>
   );
   
   // Verify synchronized state
   userEvent.click(screen.getByTestId('jump-to-event'));
   expect(screen.getByTestId('current-time')).toHaveTextContent('00:23');
   expect(screen.getByTestId('metrics-current-segment')).toHaveTextContent('Checkout Flow');
   ```

### Task Prompt System Test Guidelines

When writing tests for Task Prompt System components:

1. **Task Data Setup**: Use the mock task data:
   ```javascript
   import { getMockTaskData } from '../../mocks/taskPromptMocks';
   
   const singleStepTask = getMockTaskData('simple-task');
   const multiStepTask = getMockTaskData('guided-tutorial');
   ```

2. **Task Progression**: Test the full task progression:
   ```javascript
   // Start task
   render(<TaskPromptManager taskId="task-123" />);
   expect(screen.getByText(task.title)).toBeInTheDocument();
   
   // Progress through steps
   userEvent.click(screen.getByTestId('next-step-button'));
   expect(screen.getByText(task.steps[1].title)).toBeInTheDocument();
   
   // Complete task
   userEvent.click(screen.getByTestId('complete-task-button'));
   expect(screen.getByTestId('feedback-form')).toBeInTheDocument();
   ```

3. **UX Audit Integration**: Verify proper recording of task events:
   ```javascript
   // Setup
   const recordingService = SessionRecordingService.getInstance();
   jest.spyOn(recordingService, 'recordEvent').mockImplementation();
   
   // Render components
   render(
     <>
       <SessionRecording recordingMode="active" />
       <TaskPromptManager taskId="task-123" />
     </>
   );
   
   // Verify event recording
   userEvent.click(screen.getByTestId('task-action-button'));
   expect(recordingService.recordEvent).toHaveBeenCalledWith(
     expect.objectContaining({
       type: 'task_interaction',
       taskId: 'task-123'
     })
   );
   ```

4. **Concurrent Tasks**: Test handling of multiple tasks:
   ```javascript
   render(
     <>
       <TaskPromptManager taskId="task-1" />
       <TaskPromptManager taskId="task-2" />
     </>
   );
   
   // Verify both tasks are displayed properly
   expect(screen.getByTestId('task-prompt-task-1')).toBeInTheDocument();
   expect(screen.getByTestId('task-prompt-task-2')).toBeInTheDocument();
   
   // Verify task switching
   userEvent.click(screen.getByTestId('minimize-task-1'));
   expect(screen.getByTestId('task-prompt-task-1')).toHaveClass('minimized');
   expect(screen.getByTestId('task-prompt-task-2')).not.toHaveClass('minimized');
   ```

## Test Results and Coverage

Test results and coverage reports are stored in the following locations:
- Test results: `test-results/`
- Coverage reports: `coverage/`
- HTML reports: `coverage/lcov-report/index.html`

CI/CD integration automatically runs these tests and reports failures in GitHub Actions.

## Troubleshooting Common Test Issues

1. **Tests timing out**: Use `jest.setTimeout(10000)` for longer operations
2. **Async test failures**: Ensure proper use of `async/await` and `waitFor`
3. **Event handling issues**: Use `userEvent` instead of `fireEvent` when possible
4. **Testing hooks**: Use `renderHook` from `@testing-library/react-hooks`
5. **Mocking service failures**: Test both success and error handling scenarios 