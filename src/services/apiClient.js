/**
 * API Client Service
 * 
 * @deprecated This file is deprecated. Import from 'src/core/services/apiClient.js' instead.
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Re-export everything from the core implementation
export * from '../core/services/apiClient';

// Log warning when this file is imported
console.warn('Warning: Importing from src/services/apiClient.js is deprecated. Please update your imports to use src/core/services/apiClient.js instead.');