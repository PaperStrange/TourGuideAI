# User Testing Program Components

This directory contains components for the TourGuideAI beta program's user testing program, which allows administrators to create targeted user segments, define testing tasks, and collect feedback through session recordings.

## Key Components

### UserTestingDashboard
The main dashboard for the user testing program, which integrates all other components and provides an overview of testing activities.

### UserSegmentManager
Allows administrators to create and manage user segments based on demographic profiles, usage patterns, and interests. Segments can be used to target specific user groups for testing tasks.

### TaskManager
Enables the creation and management of testing tasks assigned to specific user segments. Tasks can include multiple steps and track completion rates.

### SessionRecordingConsent
Handles user consent for session recording, including screen recording, camera, microphone, and user interactions tracking. Ensures compliance with privacy regulations.

### UserPersona
Displays and manages user personas that represent target user segments for testing.

### InAppTaskPrompt
Provides in-app prompts for users to complete specific tasks, including tracking and feedback collection.

## Features

- **Demographic Profiles**: Create segments based on user demographics such as age, location, experience level, and device usage.
- **Task Assignment**: Assign testing tasks to specific user segments with step-by-step instructions.
- **Completion Tracking**: Monitor task completion rates and metrics such as average completion time.
- **Session Recording**: Record user sessions with proper consent management for screen, camera, and microphone.
- **Segment Analytics**: View demographic distribution and other analytics for user segments.
- **In-App Task Guidance**: Guide users through specific tasks with contextual prompts.

## Integration

These components integrate with other beta program services including:

- `UserSegmentService`: Manages user segmentation with demographic profiles
- `AnalyticsService`: Provides analytics data for user testing metrics
- `SessionRecordingService`: Handles recording and playback of user sessions
- `TaskPromptService`: Manages in-app task prompts and completion tracking
- Consent management and privacy controls

## UX Audit System Integration

The user testing program works closely with the UX audit system components found in `src/features/beta-program/components/analytics/`:

- `SessionRecording`: Playback recorded sessions with interactive timeline and event markers
- `HeatmapVisualization`: Visualize user interaction patterns like clicks, movements, and views
- `UXMetricsEvaluation`: Evaluate user experience based on quantitative metrics

Together, these systems provide a comprehensive approach to understanding user behavior and improving the application based on data-driven insights.

## Usage

To integrate the user testing program into your application:

```jsx
import { UserTestingDashboard } from 'src/features/beta-program/components/user-testing';
import { SessionRecording, HeatmapVisualization } from 'src/features/beta-program/components/analytics';

function BetaProgramApp() {
  return (
    <div>
      <h1>Beta Program</h1>
      <UserTestingDashboard />
      
      {/* UX Audit components for analyzing user behavior */}
      <SessionRecording sessionId="session-123" onBack={() => {}} />
      <HeatmapVisualization onBack={() => {}} />
    </div>
  );
}
```

For more granular control, you can use the individual components:

```jsx
import { 
  UserSegmentManager, 
  TaskManager, 
  SessionRecordingConsent,
  InAppTaskPrompt
} from 'src/features/beta-program/components/user-testing';

// Then use components individually
``` 