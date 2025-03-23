# Beta Program Feature

This directory contains all components, services, and utilities for the TourGuideAI Beta Program.

## Overview

The Beta Program allows early access to TourGuideAI's features for selected users. It includes:

1. **Registration and Authentication**: Users can register for the beta program using invite codes.
2. **Onboarding Flow**: New users go through a guided onboarding process.
3. **Feature Request System**: Users can submit and vote on feature requests.
4. **Survey System**: Administrators can create surveys to collect feedback from beta testers.
5. **Community Forum**: Users can discuss features, ask questions, and share ideas.
6. **Analytics Dashboard**: Administrators can view usage statistics and feedback trends.

## Component Structure

- **`components/`**: UI components for the beta program
  - **`BetaPortal.jsx`**: Main container component for the beta program
  - **`RegistrationForm.jsx`**: Component for new user registration
  - **`OnboardingFlow.jsx`**: Multi-step onboarding process
  - **`onboarding/`**: Individual onboarding step components
    - `CodeRedemptionForm.jsx`: Code validation form
    - `UserProfileSetup.jsx`: User profile setup form
    - `PreferencesSetup.jsx`: User preferences setup
    - `WelcomeScreen.jsx`: Final onboarding screen
  - **`feature-request/`**: Feature request system components
    - `FeatureRequestBoard.jsx`: Main component for feature requests
  - **`survey/`**: Survey system components
    - `SurveyBuilder.jsx`: Admin component for creating surveys
    - `SurveyList.jsx`: Component for displaying available surveys
  - **`community/`**: Community forum components
    - `BetaCommunityForum.jsx`: Discussion forum component
  - **`auth/`**: Authentication components and utilities
  - **`user/`**: User management components
  - **`feedback/`**: User feedback components

- **`services/`**: Business logic and API services
  - `AuthService.js`: Authentication and user management
  - `FeatureService.js`: Feature request management
  - `SurveyService.js`: Survey creation and submission
  - `PermissionsService.js`: Role-based access control

- **`hooks/`**: Custom React hooks for the beta program
- **`utils/`**: Utility functions

## Role-Based Access Control

The beta program implements role-based access control (RBAC) with these roles:

- **Beta Tester**: Base role for all beta program participants
- **Moderator**: Can manage content and users, but has limited administrative access
- **Admin**: Full access to all beta program features

## Getting Started

To add the beta program to a page, import and use the `BetaPortal` component:

```jsx
import { BetaPortal } from 'src/features/beta-program/components';

function SomePage() {
  return (
    <div>
      <h1>Beta Program</h1>
      <BetaPortal />
    </div>
  );
}
```

## Development Guidelines

- Keep components modular and focused on a single responsibility
- Use the provided RBAC components (`Role`, `Permission`, `AccessControl`) for conditional rendering
- Implement proper validation for user inputs
- Follow the established design patterns for new components

## Testing

Test cases for beta program components should be placed in `__tests__` directories alongside the respective components.

## Future Enhancements

- Integration with external analytics tools
- Localization support for international beta testers
- Expanded notification system for beta program events
- Mobile app beta testing support 