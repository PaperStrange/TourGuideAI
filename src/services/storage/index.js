/**
 * Storage Services
 * 
 * @deprecated This file is deprecated. Import from 'src/core/services/storage' instead.
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Re-export everything from the core implementation
export * from '../../core/services/storage';

// Log warning when this file is imported
console.warn('Warning: Importing from src/services/storage is deprecated. Please update your imports to use src/core/services/storage instead.'); 