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

## Features

- **Demographic Profiles**: Create segments based on user demographics such as age, location, experience level, and device usage.
- **Task Assignment**: Assign testing tasks to specific user segments with step-by-step instructions.
- **Completion Tracking**: Monitor task completion rates and metrics such as average completion time.
- **Session Recording**: Record user sessions with proper consent management for screen, camera, and microphone.
- **Segment Analytics**: View demographic distribution and other analytics for user segments.

## Integration

These components integrate with other beta program services including:

- `UserSegmentService`: Manages user segmentation with demographic profiles
- `AnalyticsService`: Provides analytics data for user testing metrics
- Consent management and privacy controls

## Usage

To integrate the user testing program into your application:

```jsx
import { UserTestingDashboard } from 'src/features/beta-program/components/user-testing';

function BetaProgramApp() {
  return (
    <div>
      <h1>Beta Program</h1>
      <UserTestingDashboard />
    </div>
  );
}
```

For more granular control, you can use the individual components:

```jsx
import { 
  UserSegmentManager, 
  TaskManager, 
  SessionRecordingConsent 
} from 'src/features/beta-program/components/user-testing';

// Then use components individually
``` 