# Features Directory

This directory contains feature-specific code organized by domain functionality.

## Structure

- **map-visualization**: Contains components and services for the map visualization feature
- **travel-planning**: Contains components and services for the travel planning feature
- **user-profile**: Contains components and services for the user profile feature
- **beta-program**: Contains components and services for the beta program management
  - Includes comprehensive onboarding flow
  - Survey system with conditional logic
  - Feature request system with voting
  - UX audit system with session recording and heatmap visualization

Each feature directory is organized to be largely self-contained, with its own:

- `components`: UI components specific to the feature
- `hooks`: React hooks specific to the feature
- `services`: Business logic and data access specific to the feature
- `styles`: CSS and styling specific to the feature
- `tests`: Unit and integration tests for the feature
- `README.md`: Feature-specific documentation

## Documentation

For comprehensive testing of these features, refer to:
- Test scenarios: `docs/project_lifecycle/stability_tests/plans/project.test-scenarios.md`
- User journey testing: `docs/project_lifecycle/stability_tests/plans/project.test-user-story.md`
- Test execution results: `docs/project_lifecycle/stability_tests/results/project.test-execution-results.md`
- UX audit system: `docs/technical/ux-audit-system.md`

## Performance Optimizations

All features leverage the following performance enhancements:

- **Code Splitting**: Components are loaded dynamically using React.lazy and Suspense
- **Image Optimization**: Images use lazy loading and responsive sizing via the core imageUtils
- **Caching Strategy**: API responses use TTL-based caching with compression
- **Offline Support**: Critical functionality works offline through service worker caching
- **Canvas Rendering**: UX audit components use optimized canvas rendering for performance

## Maintainability

This organization makes it easier to navigate the codebase, maintain features in isolation, and potentially extract features into separate packages if needed. 

For detailed refactoring history of these features, see `docs/project_lifecycle/code_and_project_structure_refactors/records/project.refactors.md`. 