# Core Directory

This directory contains shared code that is used across multiple features.

## Structure

- **api**: API clients and service interfaces for external APIs (OpenAI, Google Maps, etc.)
- **components**: Reusable UI components that are used across multiple features
- **services**: Shared services for application-wide functionality (caching, storage, etc.)
- **utils**: Utility functions and helpers

The core directory follows the principle of "define once, use everywhere" and helps avoid code duplication across features. Any code that is shared by more than one feature should be placed here. 