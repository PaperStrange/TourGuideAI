/**
 * API configuration
 * Centralizes API-related constants and settings
 */

// Base URL for the API
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
    VERIFY: '/auth/verify'
  },
  BETA: {
    REDEEM_CODE: '/beta/redeem-code',
    USER_PROFILE: '/beta/user-profile',
    PREFERENCES: '/beta/preferences',
    ONBOARDING: '/beta/onboarding'
  },
  ANALYTICS: {
    USER_ACTIVITY: '/analytics/user-activity',
    DEVICE_DISTRIBUTION: '/analytics/device-distribution',
    FEATURE_USAGE: '/analytics/feature-usage',
    SESSION_RECORDINGS: '/analytics/session-recordings',
    HEATMAP_DATA: '/analytics/heatmap-data'
  }
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

// API version
export const API_VERSION = 'v1'; 