# Features Directory

This directory contains feature-specific code organized by domain functionality.

## Structure

- **map-visualization**: Contains components and services for the map visualization feature
- **travel-planning**: Contains components and services for the travel planning feature
- **user-profile**: Contains components and services for the user profile feature
- **beta-program**: Contains components and services for the beta program management

Each feature directory is organized to be largely self-contained, with its own:

- `components`: UI components specific to the feature
- `hooks`: React hooks specific to the feature
- `services`: Business logic and data access specific to the feature
- `styles`: CSS and styling specific to the feature
- `tests`: Unit and integration tests for the feature
- `README.md`: Feature-specific documentation

## Documentation

For comprehensive testing of these features, refer to:
- Test scenarios: `docs/project.test-scenarios.md`
- User journey testing: `docs/project.test-user-story.md`
- Test execution results: `docs/project.test-execution-results.md`

## Performance Optimizations

All features leverage the following performance enhancements:

- **Code Splitting**: Components are loaded dynamically using React.lazy and Suspense
- **Image Optimization**: Images use lazy loading and responsive sizing via the core imageUtils
- **Caching Strategy**: API responses use TTL-based caching with compression
- **Offline Support**: Critical functionality works offline through service worker caching

## Maintainability

This organization makes it easier to navigate the codebase, maintain features in isolation, and potentially extract features into separate packages if needed. 

For detailed refactoring history of these features, see `docs/project.refactors.md`. 