# Contexts Directory

This directory contains React Context providers and hooks for application-wide state management.

## Purpose

React Context is used for managing global state that needs to be accessible across multiple components without prop drilling. Each context in this directory encapsulates a specific domain of state:

- **API State**: Managing API keys, request status, etc.
- **Auth State**: Managing user authentication state
- **Preferences**: Managing user preferences and settings
- **Theme**: Managing application theme and styling

## Usage

Each context typically exports:

1. A context provider component
2. A custom hook for consuming the context
3. Context-specific actions and utilities

Example:
```jsx
import { useAuthContext } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuthContext();
  
  // Use context values and functions
}
``` 