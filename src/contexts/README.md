# Contexts Directory

This directory contains React Context providers and hooks for application-wide state management.

## Purpose

React Context is used for managing global state that needs to be accessible across multiple components without prop drilling. Each context in this directory encapsulates a specific domain of state.

## Available Contexts

### AuthContext.js
**Purpose**: User authentication and authorization state management  
**Exports**: 
- `AuthProvider` component
- `useAuth` hook
- Authentication actions (login, logout, register, etc.)
- User profile and role management

**Usage**:
```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // Use authentication state and actions
}
```

### NotificationContext.js
**Purpose**: Application-wide notification and alert system  
**Exports**:
- `NotificationProvider` component  
- `useNotification` hook
- Notification actions (success, error, warning, info)
- Notification queue management

**Usage**:
```jsx
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { showNotification, hideNotification } = useNotification();
  
  const handleSuccess = () => {
    showNotification('Operation completed successfully!', 'success');
  };
}
```

### LoadingContext.js
**Purpose**: Global loading state management for async operations  
**Exports**:
- `LoadingProvider` component
- `useLoading` hook  
- Loading state management for different operations

**Usage**:
```jsx
import { useLoading } from '../contexts/LoadingContext';

function MyComponent() {
  const { isLoading, setLoading } = useLoading();
  
  const handleAsyncOperation = async () => {
    setLoading(true);
    try {
      await someAsyncOperation();
    } finally {
      setLoading(false);
    }
  };
}
```

## Implementation Standards

### Context Structure
Each context follows a consistent pattern:

1. **State Definition**: Define the shape of context state
2. **Action Types**: Define available actions/operations  
3. **Reducer**: Handle state updates (if using useReducer)
4. **Provider Component**: Wrap children with context provider
5. **Custom Hook**: Provide easy access to context with error handling

### Error Handling
All contexts include proper error boundaries and validation:
- Context availability checking in hooks
- Proper error messages when context is used outside provider
- Graceful fallbacks for missing context data

### Performance Optimization
Contexts are optimized for performance:
- State is split by domain to avoid unnecessary re-renders
- Memoized context values where appropriate
- Selective subscription patterns for specific state slices

## Testing

Each context includes comprehensive test coverage:
- Provider functionality testing
- Hook behavior testing  
- State update scenarios
- Error condition testing

Test files are located in `src/tests/` with corresponding naming:
- `AuthContext.test.js`
- `NotificationContext.test.js`
- `LoadingContext.test.js`

## Integration with Components

### App-level Integration
Contexts are typically provided at the app level in `src/App.js`:

```jsx
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LoadingProvider>
          <Router>
            {/* App components */}
          </Router>
        </LoadingProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
```

### Component Usage
Components consume contexts via custom hooks:
- Always use the provided custom hooks (e.g., `useAuth`)
- Avoid direct `useContext` calls for better error handling
- Handle loading and error states appropriately

## Future Contexts

Planned contexts for future implementation:
- **ThemeContext**: Application theme and styling management
- **PreferencesContext**: User preferences and settings
- **AnalyticsContext**: User behavior tracking and analytics
- **OfflineContext**: Offline state and sync management

---

**Last Updated**: Phase 8 Completion  
**Maintained By**: Frontend Team  
**Review Schedule**: Updated when new contexts are added or existing ones are modified 