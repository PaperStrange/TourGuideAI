# Beta Program Feature

This feature handles the beta testing portal, feedback collection, and analytics functionality for the TourGuideAI beta program.

## Components

- **BetaPortal**: Main interface for beta testers with dashboard and controls
- **RegistrationForm**: Component for user registration and beta code redemption
- **FeedbackWidget**: Component for collecting and categorizing user feedback
- **SurveyBuilder**: Component for creating and managing customizable surveys
- **AnalyticsDashboard**: Component for visualizing beta usage metrics

## Services

- **AuthService**: Handles JWT-based authentication and access control
- **FeedbackService**: Manages feedback collection, categorization, and storage
- **NotificationService**: Manages email notifications using SendGrid API
- **AnalyticsService**: Tracks and processes beta usage analytics

## Functionality

- Beta tester registration and authentication
- Role-based access control
- Feedback collection and categorization
- Customizable survey creation and distribution
- Screenshot and error reporting
- Feature request management with voting
- Analytics dashboard for beta usage metrics
- Email notifications for beta testers

## Performance Optimizations

- **Lazy Loading**: Beta portal components are loaded on-demand using React.lazy
- **Optimized Forms**: Form validation using efficient validation patterns
- **Throttled API Calls**: Feedback submission is throttled to prevent API overload
- **Local Storage Caching**: User preferences and feedback drafts are cached locally
- **Optimized Analytics**: Analytics batching to reduce API calls

## Dependencies

This feature depends on:
- Material UI (@mui/material) for UI components
- JWT for authentication
- SendGrid API for email notifications
- Core storage services (via `core/services/storage`)
- Common UI components (via `core/components`) 