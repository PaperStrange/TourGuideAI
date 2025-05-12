/**
 * Core API module exports
 * 
 * This file exports all API functions from the core API modules
 */

// Import ES modules first
import * as openai from './openaiApi';
import * as googleMaps from './googleMapsApi';

// Then use CommonJS require for axios to avoid Jest compatibility issues
// eslint-disable-next-line import/first
const axios = require('axios');

// Import and re-export OpenAI API functions with specific namespaces
export const openaiApi = openai;

// Import and re-export Google Maps API functions with specific namespaces
export const googleMapsApi = googleMaps;

// Export a default HTTP client for backward compatibility
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000
});

export default apiClient; 