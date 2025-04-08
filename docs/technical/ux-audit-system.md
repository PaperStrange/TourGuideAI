# UX Audit System

## Overview

The UX Audit System provides comprehensive tools for monitoring, recording, and analyzing user interactions with the TourGuideAI application. This system enables product teams, UX designers, and developers to gain deep insights into user behavior, identify usability issues, and make data-driven decisions for interface improvements.

The system consists of three main components:
1. Session Recording
2. Heatmap Visualization
3. UX Metrics Evaluation

## Architecture

The UX Audit System follows a modular architecture with clear separation of concerns:

- **Components**: React components for visualization and user interaction
- **Services**: Backend services for data processing and storage
- **Hooks**: Custom React hooks for shared logic
- **Utils**: Utility functions for data formatting and calculations

```
src/features/beta-program/
├── components/
│   ├── analytics/
│   │   ├── AnalyticsDashboard.jsx    # Main dashboard with UX audit tools
│   │   ├── HeatmapVisualization.jsx  # Heatmap visualization component
│   │   ├── SessionRecording.jsx      # Session recording player
│   │   ├── SessionPlayback.jsx       # Advanced session playback component
│   │   ├── SessionRecordingPlayer.jsx # Lightweight session recording player
│   │   ├── UXMetricsEvaluation.jsx   # UX metrics evaluation component
│   │   └── UXAuditDashboard.jsx      # Dedicated UX audit dashboard
│   └── ux-audit/
│       ├── index.js                  # Export file for UX audit components
│       ├── SessionRecording.jsx      # Session recording component
│       ├── UXHeatmap.jsx             # UX heatmap component
│       └── UXMetricsEvaluation.jsx   # UX metrics evaluation component
└── services/
    ├── analytics/
    │   ├── AnalyticsService.js       # Service for analytics data
    │   └── HotjarService.js          # Service for Hotjar integration
    └── SessionRecordingService.js    # Service for session recording management
```

## Components

### SessionRecording

The SessionRecording component allows playback of recorded user sessions with detailed event timeline and interactive controls.

**Key Features**:
- Playback controls (play, pause, seek, speed adjustment)
- Event timeline visualization
- Filtering options for event types
- Bookmarking capability for important moments
- Issue reporting integration
- Full-screen mode
- Event highlighting and annotation

```jsx
import { SessionRecording } from '@/features/beta-program/components/ux-audit';

<SessionRecording 
  sessionId="session-123"
  onBack={() => handleReturn()}
  onEventMarked={(event) => handleEventMarked(event)}
  onAnalysisComplete={(analysis) => handleAnalysisComplete(analysis)}
/>
```

### HeatmapVisualization

The HeatmapVisualization component displays aggregated user interactions as heat overlays on page screenshots, visualizing where users click, move, and focus their attention.

**Key Features**:
- Multiple interaction types (clicks, moves, views)
- Page selection for multi-page applications
- Adjustable intensity and radius controls
- Color normalization for meaningful visualization
- Export capabilities for reports
- Data point details for in-depth analysis
- Customizable visualization settings

```jsx
import { HeatmapVisualization } from '@/features/beta-program/components/analytics';

<HeatmapVisualization 
  onBack={() => handleReturn()}
/>
```

### UXMetricsEvaluation

The UXMetricsEvaluation component provides quantitative assessment of user experience based on defined metrics and benchmarks.

**Key Features**:
- Weighted scoring system for overall UX assessment
- Comparative benchmarking against previous versions
- Metrics visualization with charts and graphs
- Customizable metrics definition
- Trend analysis over time
- Export capabilities for reports

```jsx
import { UXMetricsEvaluation } from '@/features/beta-program/components/analytics';

<UXMetricsEvaluation 
  dateRange={{ start: startDate, end: endDate }}
  onInsightClick={(insight) => handleInsightClick(insight)}
/>
```

### UXAuditDashboard

The UXAuditDashboard provides a central location to access all UX audit tools and view aggregated metrics.

**Key Features**:
- Summary of key UX metrics
- Quick access to all UX audit tools
- Filtering options for data analysis
- User segment selection for targeted analysis
- Exportable reports for stakeholders

```jsx
import { UXAuditDashboard } from '@/features/beta-program/components/analytics';

<UXAuditDashboard />
```

## Services

### SessionRecordingService

The SessionRecordingService handles the data retrieval, processing, and playback logic for session recordings.

**Key Methods**:
- `getSessionRecordings(filters)`: Retrieves available session recordings with optional filtering
- `getSessionRecording(sessionId)`: Fetches a specific session with all events and metadata
- `addBookmark(sessionId, bookmark)`: Adds a bookmark to a session
- `reportIssue(sessionId, issue)`: Reports an issue discovered in a session
- `exportSessionData(sessionId)`: Exports session data for download
- `startRecording(options)`: Starts recording a user session
- `recordEvent(sessionId, event)`: Adds an event to the current recording session
- `stopRecording(sessionId)`: Stops the current recording session

### AnalyticsService

The AnalyticsService provides data retrieval and processing for the analytics dashboard and UX audit components.

**Key Methods**:
- `getHeatmapData(pageId, interactionType, startDate, endDate, userSegment)`: Retrieves interaction data for heatmap visualization
- `getSessionMetrics(dateRange, userSegment)`: Fetches metrics about recorded sessions
- `getUXMetrics(timeframe)`: Fetches UX metrics data for the specified timeframe
- `exportData(dataType, options)`: Exports data in various formats (CSV, JSON, PNG)

### HotjarService

The HotjarService provides integration with Hotjar for session recording and heatmap visualization.

**Key Methods**:
- `init()`: Initialize Hotjar tracking script
- `triggerRecording(action)`: Manually trigger recording for specific user actions
- `identifyUser(userId, attributes)`: Identify users in recordings
- `addTag(tagName)`: Add custom event tags for segmentation
- `getRecordingsUrl(startDate, endDate)`: Get URL to view recordings
- `getHeatmapsUrl(pageUrl)`: Get URL to view heatmaps
- `optOut()`: Opt out of tracking for privacy purposes

## Integration with Other Systems

The UX Audit System integrates with other components of the TourGuideAI platform:

### Analytics Dashboard

The UX audit tools are integrated into the main analytics dashboard, allowing users to switch between general analytics and UX analysis:

```jsx
// In AnalyticsDashboard.jsx
import { SessionRecording, HeatmapVisualization } from '../ux-audit';

// Display UX audit tools based on state
{showSessionRecordings && (
  <SessionRecording 
    sessionId={selectedSessionId} 
    onBack={() => setShowSessionRecordings(false)} 
  />
)}

{showHeatmaps && (
  <HeatmapVisualization 
    onBack={() => setShowHeatmaps(false)} 
  />
)}
```

### User Testing Program

The UX audit system works in tandem with the user testing program to provide insights into user behavior during structured testing tasks:

```jsx
// In TaskPromptManager.jsx
import { startSessionRecording } from '../../services/SessionRecordingService';

// Start recording when a user begins a task
const handleTaskStart = async (taskId) => {
  const sessionId = await startSessionRecording({
    taskId,
    metadata: { taskName: task.title }
  });
  setCurrentSessionId(sessionId);
};
```

### Feature Request System

UX insights from the audit system can inform feature prioritization and development:

```jsx
// In FeatureRequestDetails.jsx
import { getUXMetricsForFeature } from '../../services/analytics/AnalyticsService';

// Show UX metrics related to a feature request
const [uxMetrics, setUXMetrics] = useState(null);

useEffect(() => {
  const loadUXMetrics = async () => {
    const metrics = await getUXMetricsForFeature(featureRequest.relatedFeature);
    setUXMetrics(metrics);
  };
  
  if (featureRequest.relatedFeature) {
    loadUXMetrics();
  }
}, [featureRequest]);
```

## Privacy and Consent

The UX Audit System implements strong privacy protections:

1. **Explicit Consent**: All recording requires explicit user consent, collected through the `SessionRecordingConsent` component
2. **Data Masking**: Sensitive information is automatically masked in recordings
3. **Data Retention**: Session data is only retained for the specified retention period
4. **User Control**: Users can opt out of recording at any time

## Security Considerations

- All session data is encrypted at rest and in transit
- Access to UX audit tools is restricted based on user roles
- Personal information is removed from recordings before storage
- Session data is stored separately from user identity information

## Future Enhancements

- AI-powered analysis for automatic identification of UX issues
- Integration with A/B testing framework for experimental validation
- Real-time collaboration tools for team analysis
- Extended metrics for accessibility evaluation
- Multi-platform recording support for mobile and tablet devices

## Conclusion

The UX Audit System provides powerful tools for understanding user behavior and improving the user experience of the TourGuideAI application. By leveraging session recordings, heatmap visualizations, and metrics evaluation, product teams can make data-driven decisions that enhance usability and satisfaction. 