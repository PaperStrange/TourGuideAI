# TourGuideAI Architecture

This document describes the architecture and project structure of the TourGuideAI application.

## Project Structure

The project follows a feature-based architecture, with shared code extracted into core modules:

```
src/
├── core/                     # Shared code across features
│   ├── api/                  # API clients for external services
│   ├── components/           # Shared UI components
│   ├── services/             # Shared application services
│   │   └── storage/          # Storage services (cache, local storage, sync)
│   └── utils/                # Utility functions and helpers
│
├── features/                 # Feature modules
│   ├── travel-planning/      # Travel itinerary planning feature
│   │   ├── components/       # Feature-specific components
│   │   └── services/         # Feature-specific services
│   │
│   ├── map-visualization/    # Map visualization feature
│   │   ├── components/       # Feature-specific components
│   │   └── services/         # Feature-specific services
│   │
│   └── user-profile/         # User profile management feature
│       ├── components/       # Feature-specific components
│       └── services/         # Feature-specific services
│
├── contexts/                 # React contexts for state management
│
├── pages/                    # Page components (compositions of features)
│
└── styles/                   # Global styles and themes
```

## Server Structure

The server component uses a layered architecture:

```
server/
├── routes/                   # API route handlers
├── middleware/               # Express middleware
├── utils/                    # Utility functions
├── logs/                     # Server logs
└── config/                   # Environment configuration
```

## Architecture Principles

The project is built on the following architectural principles:

1. **Feature-First Organization**: Code is organized around business features rather than technical layers.
2. **Core Shared Services**: Common functionality is extracted into core modules.
3. **Component Composition**: Features are composed of smaller, reusable components.
4. **Separation of Concerns**: UI components are separated from business logic.
5. **Clean API Boundaries**: Features communicate through well-defined APIs.

## Data Flow

The application follows a unidirectional data flow pattern:

1. **User Interaction**: User interacts with a component
2. **Service Layer**: Component calls feature-specific or core services
3. **API/Storage**: Services interact with APIs or storage mechanisms
4. **State Update**: Updated data flows back to components via React state or context
5. **Rendering**: Components re-render with updated data

## Security Architecture

Security is implemented through multiple layers:

1. **Environment Variables**: All sensitive information is stored in environment variables
2. **Server-side API Proxying**: API keys are never exposed to the client
3. **Rate Limiting**: Prevents API abuse
4. **Key Rotation**: Regular rotation of API keys
5. **Secure Storage**: Encryption of sensitive user data 