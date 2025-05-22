# TourGuideAI Beta Program

This directory contains all components, services, and pages related to the TourGuideAI Beta Program.

## Overview

The Beta Program enables early access to TourGuideAI features for selected users, with a focus on gathering feedback, testing features, and building a community of engaged users. The program includes comprehensive onboarding, issue prioritization, feature request capabilities, and feedback collection through customizable surveys.

## Features

### Onboarding Workflow

The onboarding workflow guides new beta users through the process of setting up their accounts:

- Beta code redemption
- User profile setup
- Preferences configuration
- Welcome screen with feature introduction

### Issue Prioritization System

The issue prioritization system helps the team manage and address user-reported issues:

- Automated issue categorization and assignment
- Severity assessment and impact analysis
- SLA tracking with visual indicators
- Priority scoring algorithm

### Feature Request System

The feature request system allows users to submit and vote on feature ideas:

- Feature submission with categorization and tagging
- Upvoting mechanism with tracking
- Status updates for feature progress
- Comment threads for discussion
- Admin review workflow

### Survey System

The customizable survey system collects structured feedback:

- Support for various question types (text, choice, rating, etc.)
- Conditional logic based on previous answers
- Result analytics and reporting
- Visual progress indicators

### UX Audit System

The UX audit system provides comprehensive insights into user behavior and interface interactions:

- Session recording with playback control and event timeline
- Heatmap visualization for clicks, movements, and page views
- UX metrics evaluation with weighted scoring
- Filtering by page, device type, and date range
- Export capabilities for analysis
- Integration with third-party tools like Hotjar

### Task Prompt System

The task prompt system guides users through specific beta testing tasks:

- In-app task prompts with step-by-step instructions
- Context-aware task suggestions
- Task completion tracking and reporting
- User feedback collection for individual tasks
- Integration with session recording for task analysis

### Feedback Collection

General feedback collection helps capture user opinions:

- Categorized feedback (bug reports, suggestions, general)
- Automated analysis with sentiment detection
- Feedback tracking and response management

## Technical Details

### Directory Structure

- `/components` - Reusable UI components
  - `/analytics` - Analytics dashboard and visualization components
  - `/auth` - Authentication-related components
  - `/feedback` - Feedback collection components
  - `/feature-request` - Feature request components
  - `/onboarding` - User onboarding components
  - `/survey` - Survey components
  - `/task-prompts` - In-app task prompt components
  - `/user-testing` - User testing program components
  - `/ux-audit` - UX audit components
- `/services` - API interfaces and business logic
  - `/analytics` - Analytics and UX audit services
  - `/feedback` - Feedback processing services
- `/pages` - Page components for routing
- `/layouts` - Layout components for consistent UI
- `/routes` - Route configurations
- `/hooks` - Custom React hooks for shared logic
- `/utils` - Utility functions and helpers

### Key Components

- **OnboardingFlow**: Multi-step onboarding process
- **FeatureRequestList**: Displays and filters feature requests
- **FeatureRequestDetails**: Shows details for a specific feature request
- **Survey**: Renders survey questions with conditional logic
- **SurveyQuestion**: Handles various question types
- **BetaDashboard**: Central hub for beta program activities
- **FeedbackForm**: Collects general feedback
- **InAppTaskPrompt**: Displays contextual task prompts to guide users
- **TaskPromptManager**: Manages the display of task prompts across the application
- **SessionRecording**: Records and plays back user sessions
- **SessionPlayback**: Advanced session playback with interactive timeline
- **SessionRecordingPlayer**: Lightweight session recording playback component
- **HeatmapVisualization**: Displays interaction heatmaps for user activity
- **UXMetricsEvaluation**: Evaluates UX metrics with benchmarking
- **UXAuditDashboard**: Central dashboard for all UX audit tools

### Services

- **SurveyService**: Manages survey data and submissions
- **FeatureRequestService**: Handles feature request operations
- **IssueAssignmentService**: Automates issue triage and assignment
- **SessionRecordingService**: Manages session recording and playback
- **TaskPromptService**: Handles in-app task prompts and completion tracking
- **AnalyticsService**: Processes UX data and metrics
- **HotjarService**: Provides integration with Hotjar for session recording and heatmaps

## Usage

```jsx
// Import components from the beta program
import { FeatureRequestList } from '@/features/beta-program/components/feature-request';
import { Survey } from '@/features/beta-program/components/survey';
import { OnboardingFlow } from '@/features/beta-program/components/onboarding';
import { InAppTaskPrompt } from '@/features/beta-program/components/task-prompts';
import { SessionRecording, HeatmapVisualization } from '@/features/beta-program/components/analytics';

// Import services
import surveyService from '@/features/beta-program/services/SurveyService';
import featureRequestService from '@/features/beta-program/services/FeatureRequestService';
import sessionRecordingService from '@/features/beta-program/services/SessionRecordingService';
import taskPromptService from '@/features/beta-program/services/TaskPromptService';

// Use in a component
function BetaFeature() {
  return (
    <div>
      <OnboardingFlow />
      <FeatureRequestList />
      <Survey survey={survey} />
      
      {/* Task prompting */}
      <InAppTaskPrompt taskId="task-123" onComplete={() => {}} />
      
      {/* UX audit tools */}
      <SessionRecording sessionId="session-123" onBack={() => {}} />
      <HeatmapVisualization onBack={() => {}} />
    </div>
  );
}
```

## Contributing

When adding new components or services to the Beta Program:

1. Follow the existing directory structure and naming conventions
2. Create comprehensive tests for new functionality
3. Update this README with details of major new features
4. Ensure all components are properly exported from their respective index files

## Related Documentation

- [UX Audit System Documentation](../../../docs/project_lifecycle/knowledge/project.lessons.md#ux-audit-system)
- [Project Documentation Inventory](../../../docs/project.document-inventory.md)
- [Project Lessons](../../../docs/project_lifecycle/knowledge/project.lessons.md)
- [Stability Tests](../../../docs/project_lifecycle/all_tests/plans/project.tests.frontend-plan.md) 