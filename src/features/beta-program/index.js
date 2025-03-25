/**
 * Beta Program Feature
 * Exports all components, services, hooks, and utilities for the beta program
 */

// Re-export all components from components/index.js
export * from './components';

// Export services
export { default as authService } from './services/AuthService';
export { PERMISSIONS, ROLES } from './services/PermissionsService';

// Export hooks
export * from './hooks';

// For direct access to the BetaPortal
export { default } from './components/BetaPortal'; 