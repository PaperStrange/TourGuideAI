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
│       └── imageUtils.js     # Image optimization utilities
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
│   ├── user-profile/         # User profile management feature
│   │   ├── components/       # Feature-specific components
│   │   └── services/         # Feature-specific services
│   │
│   └── beta-program/         # Beta program management feature
│       ├── components/       # Beta program components
│       │   ├── analytics/    # Analytics dashboard components
│       │   ├── auth/         # Authentication components
│       │   ├── feedback/     # Feedback collection components
│       │   ├── onboarding/   # User onboarding components
│       │   │   ├── CodeRedemptionForm.jsx # Beta code redemption
│       │   │   ├── UserProfileSetup.jsx   # User profile configuration
│       │   │   ├── PreferencesSetup.jsx   # User preferences configuration
│       │   │   ├── WelcomeScreen.jsx      # Final onboarding welcome
│       │   │   └── OnboardingFlow.jsx     # Orchestrates the onboarding process
│       │   ├── survey/       # Survey components
│       │   │   ├── SurveyBuilder.jsx      # Interface for creating surveys
│       │   │   ├── SurveyList.jsx         # Survey management interface
│       │   │   └── SurveyResponse.jsx     # Survey response visualization
│       │   └── user/         # User management components
│       ├── pages/            # Beta program pages
│       └── services/         # Beta program services
│           ├── AuthService.js       # Authentication service
│           ├── InviteCodeService.js # Invite code management
│           ├── NotificationService.js # Email notifications
│           ├── PermissionsService.js  # RBAC permissions
│           ├── SurveyService.js     # Survey creation and management
│           ├── AnalyticsService.js  # Usage analytics and reporting
│           └── FeedbackService.js   # Feedback collection
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
│   ├── auth.js               # Authentication routes
│   ├── inviteCodes.js        # Invite code management routes
│   └── email.js              # Email notification routes
├── middleware/               # Express middleware
│   ├── authMiddleware.js     # Authentication middleware
│   └── rbacMiddleware.js     # Role-based access control
├── utils/                    # Utility functions
├── logs/                     # Server logs
├── services/                 # Server services
│   └── emailService.js       # SendGrid email service
└── config/                   # Environment configuration
```

## Public Files

Static and service worker files:

```
public/
├── service-worker.js         # Service worker for caching and offline support
├── offline.html              # Offline fallback page
├── manifest.json             # PWA manifest
├── favicon.ico               # Application icon
└── static/                   # Static assets
```

## Deployment Structure

Deployment and CI/CD configuration:

```
.github/
└── workflows/                # GitHub Actions workflows
    ├── ci-cd.yml             # CI/CD pipeline configuration
    └── security-scan.yml     # Security scanning workflow
```

## Test Structure

```
tests/
├── unit/                     # Unit tests
├── integration/              # Integration tests
├── cross-browser/            # Cross-browser compatibility tests
│   ├── browser-test-matrix.js  # Test matrix configuration
│   ├── specs/                # Test specifications
│   └── playwright.config.js  # Playwright configuration
├── load/                     # Load and performance tests
│   ├── k6.config.js          # k6 load testing configuration
│   └── scenarios/            # Load testing scenarios
└── smoke.test.js             # Smoke tests for deployment verification
```

## Architecture Principles

The project is built on the following architectural principles:

1. **Feature-First Organization**: Code is organized around business features rather than technical layers.
2. **Core Shared Services**: Common functionality is extracted into core modules.
3. **Component Composition**: Features are composed of smaller, reusable components.
4. **Separation of Concerns**: UI components are separated from business logic.
5. **Clean API Boundaries**: Features communicate through well-defined APIs.
6. **Progressive Enhancement**: Application works without JavaScript, then enhances with JS capabilities.
7. **Offline-First**: Application designed to work offline with service worker caching.

## Data Flow

The application follows a unidirectional data flow pattern:

1. **User Interaction**: User interacts with a component
2. **Service Layer**: Component calls feature-specific or core services
3. **API/Storage**: Services interact with APIs or storage mechanisms
4. **State Update**: Updated data flows back to components via React state or context
5. **Rendering**: Components re-render with updated data

## Performance Architecture

The application implements the following performance optimizations:

1. **Code Splitting**: Route-based code splitting with React.lazy and Suspense
2. **Critical CSS**: Prioritized loading of critical CSS
3. **Service Worker Caching**: Different caching strategies for different resource types
4. **Image Optimization**: Lazy loading, responsive images, and WebP format support
5. **API Response Caching**: TTL-based caching with compression
6. **Bundle Size Optimization**: Tree shaking and dependency optimization
7. **Rendering Performance**: Component memoization and virtualization for long lists
8. **Web Workers**: Background processing for CPU-intensive tasks

## Frontend Stability Architecture

The application implements the following stability measures to ensure consistent behavior across environments:

1. **Router Structure**: Single Router instance with proper nesting of Routes components
2. **Theme Provider**: Centralized Material UI ThemeProvider at the application root
3. **Error Boundaries**: Strategic placement of React error boundaries to prevent cascading failures
4. **Namespaced API Exports**: Preventing naming conflicts in API modules
5. **Global Variable Declarations**: Proper ESLint global directives for external libraries
6. **Backend Resilience**: Graceful degradation when backend services are unavailable
7. **Fallback UI**: User-friendly messaging during service disruptions
8. **Automated Stability Tests**: Comprehensive test suite verifying architectural stability
9. **CI Stability Checks**: Automated checks for Router structure, Theme Provider, and API organization

## Testing Architecture

The application employs a comprehensive testing approach:

1. **Unit Testing**: Testing individual components and services
2. **Integration Testing**: Testing interactions between components
3. **Cross-Browser Testing**: Ensuring compatibility across browsers and devices via Playwright and BrowserStack
4. **Load Testing**: Simulating various user loads with k6
5. **Security Testing**: Static analysis and OWASP ZAP scanning
6. **Smoke Testing**: Verification of critical paths post-deployment

## CI/CD Architecture

The continuous integration and deployment pipeline consists of:

1. **Automated Testing**: Running unit, integration, and cross-browser tests
2. **Security Scanning**: Detecting vulnerabilities in code and dependencies
3. **Build Optimization**: Production build with performance optimizations
4. **Multi-Environment Deployment**: Development, staging, and production environments
5. **Post-Deployment Verification**: Smoke tests ensuring application functionality
6. **Performance Monitoring**: Real-time monitoring for performance regressions

## Security Architecture

Security is implemented through multiple layers:

1. **Environment Variables**: All sensitive information is stored in environment variables
2. **Server-side API Proxying**: API keys are never exposed to the client
3. **Rate Limiting**: Prevents API abuse
4. **Key Rotation**: Regular rotation of API keys
5. **Secure Storage**: Encryption of sensitive user data
6. **Static Code Analysis**: Security-focused ESLint rules
7. **Dependency Scanning**: Regular auditing of dependencies for vulnerabilities
8. **OWASP Compliance**: Following OWASP security best practices
9. **Authentication**: JWT-based authentication system with token validation
10. **Role-Based Access Control**: Granular permissions system for user roles
11. **Email Verification**: Account verification through secure email tokens

## Authentication & Authorization Architecture

The application implements a comprehensive security model:

1. **JWT Authentication**: Stateless token-based authentication
2. **Role System**: Tiered user roles (Guest, Beta Tester, Moderator, Admin)
3. **Permission Framework**: Granular permissions for specific actions
4. **Middleware Protection**: Route-level access control through middleware
5. **Frontend Permission Guards**: Component-level rendering based on permissions
6. **Email Verification**: Two-step verification process for new accounts
7. **Password Reset**: Secure token-based password recovery
8. **Invite Code System**: Controlled beta program access through unique codes 