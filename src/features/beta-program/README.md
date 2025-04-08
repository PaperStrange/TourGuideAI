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

### Feedback Collection

General feedback collection helps capture user opinions:

- Categorized feedback (bug reports, suggestions, general)
- Automated analysis with sentiment detection
- Feedback tracking and response management

## Technical Details

### Directory Structure

- `/components` - Reusable UI components
- `/services` - API interfaces and business logic
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

### Services

- **SurveyService**: Manages survey data and submissions
- **FeatureRequestService**: Handles feature request operations
- **IssueAssignmentService**: Automates issue triage and assignment

## Usage

```jsx
// Import components from the beta program
import { FeatureRequestList } from '@/features/beta-program/components/feature-request';
import { Survey } from '@/features/beta-program/components/survey';
import { OnboardingFlow } from '@/features/beta-program/components/onboarding';

// Import services
import surveyService from '@/features/beta-program/services/SurveyService';
import featureRequestService from '@/features/beta-program/services/FeatureRequestService';

// Use in a component
function BetaFeature() {
  return (
    <div>
      <OnboardingFlow />
      <FeatureRequestList />
      <Survey survey={survey} />
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

- [Beta Program User Guide](../../docs/user-guides/beta-program.md)
- [Issue Prioritization System Design](../../docs/technical/issue-prioritization.md)
- [Feature Request System Design](../../docs/technical/feature-requests.md)
- [Survey System Architecture](../../docs/technical/survey-system.md) 