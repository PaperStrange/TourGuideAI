# Features Directory

This directory contains feature-specific code organized by domain functionality.

## Structure

- **travel-planning**: Contains components and services for the travel planning feature
- **map-visualization**: Contains components and services for the map visualization feature
- **user-profile**: Contains components and services for the user profile feature

Each feature directory is organized to be largely self-contained, with its own:

- `components`: UI components specific to the feature
- `services`: Business logic and data access specific to the feature
- `hooks`: React hooks specific to the feature
- `styles`: CSS and styling specific to the feature
- `tests`: Unit and integration tests for the feature

## Performance Optimizations

All features leverage the following performance enhancements:

- **Code Splitting**: Components are loaded dynamically using React.lazy and Suspense
- **Image Optimization**: Images use lazy loading and responsive sizing via the core imageUtils
- **Caching Strategy**: API responses use TTL-based caching with compression
- **Offline Support**: Critical functionality works offline through service worker caching

## Maintainability

This organization makes it easier to navigate the codebase, maintain features in isolation, and potentially extract features into separate packages if needed. 