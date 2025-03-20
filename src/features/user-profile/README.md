# User Profile Feature

This feature handles user profile management, including preferences, saved routes, and settings.

## Components

- **UserProfile**: Main profile interface showing user information
- **SavedRoutes**: Interface for viewing and managing saved routes
- **PreferencesManager**: Component for managing user preferences
- **ProfileSettings**: Component for managing user account settings

## Services

- **ProfileService**: Manages user profile data
- **PreferencesService**: Handles user preferences and settings
- **SavedRouteService**: Manages saved travel routes

## Functionality

- User profile data management
- Saved routes management (viewing, editing, deleting)
- Travel preferences customization
- Account settings management
- User authentication integration

## Dependencies

This feature depends on:
- Storage services (via `core/services/storage`)
- Authentication contexts (via `contexts/AuthContext`)
- Common UI components (via `core/components`) 