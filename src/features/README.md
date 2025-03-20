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

This organization makes it easier to navigate the codebase, maintain features in isolation, and potentially extract features into separate packages if needed. 