/**
 * API Client Service
 * 
 * This module provides a client-side service for interacting with the backend API.
 * It handles communication with our server-side API endpoints for OpenAI and Google Maps.
 */

import axios from 'axios';
import { cacheService } from './storage/CacheService';
import { localStorageService } from './storage/LocalStorageService';

// Default configuration
const config = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  useServerProxy: process.env.REACT_APP_USE_SERVER_PROXY === 'true',
  debug: process.env.NODE_ENV === 'development',
  timeout: 30000, // 30 seconds
  retryCount: 3,
  retryDelay: 1000, // 1 second
  useFallbackCache: true,
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
};

// Log configuration status in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Client Configuration:', {
    baseURL: config.baseURL,
    useServerProxy: config.useServerProxy,
    debug: config.debug,
    hasOpenAIKey: !!config.openaiApiKey,
    hasGoogleMapsKey: !!config.googleMapsApiKey
  });
}

// Create an axios instance
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Check if interceptors are available (they might not be in test environments where axios is mocked)
if (apiClient.interceptors && apiClient.interceptors.request) {
  // Add a request interceptor for debugging and caching
  apiClient.interceptors.request.use(
    async (config) => {
      const requestId = `${config.method}-${config.url}-${JSON.stringify(config.params || {})}-${JSON.stringify(config.data || {})}`;
      
      // Check cache before making request
      if (config.method.toLowerCase() === 'get' && config.useFallbackCache !== false) {
        const cachedResponse = await cacheService.getCache(`api:${requestId}`);
        if (cachedResponse) {
          console.log(`Using cached response for ${config.url}`);
          
          // Create a response-like object that axios will interpret as a successful response
          return {
            ...config,
            adapter: () => Promise.resolve({
              data: cachedResponse.data,
              status: 200,
              statusText: 'OK',
              headers: cachedResponse.headers || {},
              config: config,
              cached: true,
              cachedAt: cachedResponse.timestamp
            })
          };
        }
      }
      
      if (config.debug) {
        console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`, config.params || config.data);
      }
      
      // Add API keys if needed for direct API calls
      if (!config.useServerProxy) {
        if (config.url.includes('openai') && config.openaiApiKey) {
          config.headers.Authorization = `Bearer ${config.openaiApiKey}`;
        }
        
        if (config.url.includes('maps') && config.googleMapsApiKey) {
          if (!config.params) config.params = {};
          config.params.key = config.googleMapsApiKey;
        }
      }
      
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );
}

// Check if interceptors are available for response (they might not be in test environments)
if (apiClient.interceptors && apiClient.interceptors.response) {
  // Add a response interceptor for error handling and caching
  apiClient.interceptors.response.use(
    async (response) => {
      if (config.debug) {
        console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url}`, response.status);
      }
      
      // Cache successful GET responses
      if (response.config.method.toLowerCase() === 'get' && !response.cached && response.config.useFallbackCache !== false) {
        const requestId = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params || {})}-${JSON.stringify(response.config.data || {})}`;
        
        await cacheService.saveCache(`api:${requestId}`, {
          data: response.data,
          headers: response.headers,
          timestamp: Date.now()
        });
      }
      
      return response;
    },
    async (error) => {
      // Handle errors
      const originalRequest = error.config;
      
      // Handle network errors or timeouts
      if (!error.response) {
        console.error(`Network Error for ${originalRequest.url}:`, error.message);
        
        // Try to get cached response as fallback
        if (originalRequest.useFallbackCache !== false) {
          const requestId = `${originalRequest.method}-${originalRequest.url}-${JSON.stringify(originalRequest.params || {})}-${JSON.stringify(originalRequest.data || {})}`;
          const cachedResponse = await cacheService.getCache(`api:${requestId}`);
          
          if (cachedResponse) {
            console.log(`Using cached response as fallback for ${originalRequest.url}`);
            return Promise.resolve({
              data: cachedResponse.data,
              status: 200,
              statusText: 'OK (Fallback from Cache)',
              headers: cachedResponse.headers || {},
              config: originalRequest,
              cached: true,
              cachedAt: cachedResponse.timestamp,
              fromFallback: true
            });
          }
        }
        
        // Check if we should retry the request
        if (originalRequest.retryCount === undefined) {
          originalRequest.retryCount = 0;
        }
        
        if (originalRequest.retryCount < (config.retryCount || 3)) {
          originalRequest.retryCount++;
          
          // Exponential backoff
          const delay = (config.retryDelay || 1000) * Math.pow(2, originalRequest.retryCount - 1);
          
          console.log(`Retrying request to ${originalRequest.url} (Attempt ${originalRequest.retryCount} of ${config.retryCount})...`);
          
          return new Promise(resolve => {
            setTimeout(() => resolve(apiClient(originalRequest)), delay);
          });
        }
      }
      
      // Format error for client
      const formattedError = {
        status: error.response?.status || 500,
        message: error.response?.data?.error?.message || error.message || 'Unknown error',
        code: error.response?.data?.error?.code || error.code || 'UNKNOWN_ERROR',
        url: originalRequest?.url,
        method: originalRequest?.method,
        timestamp: new Date().toISOString()
      };
      
      console.error(`❌ API Error (${formattedError.status}): ${formattedError.message}`, formattedError);
      
      // Store error in local storage for error reporting
      const errors = localStorageService.getData('api_errors') || [];
      errors.push(formattedError);
      localStorageService.saveData('api_errors', errors.slice(-10)); // Keep only last 10 errors
      
      return Promise.reject(formattedError);
    }
  );
}

// Helper functions
const apiHelpers = {
  /**
   * Perform a GET request
   * @param {string} url - URL to request
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} - Promise resolving to response data
   */
  get: async (url, params = {}, options = {}) => {
    try {
      const response = await apiClient.get(url, { params, ...options });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Perform a POST request
   * @param {string} url - URL to request
   * @param {object} data - Request body
   * @param {object} options - Request options
   * @returns {Promise} - Promise resolving to response data
   */
  post: async (url, data = {}, options = {}) => {
    try {
      const response = await apiClient.post(url, data, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Clear cached responses
   * @returns {Promise<boolean>} - Success indicator
   */
  clearCache: async () => {
    return await cacheService.clearCacheByPrefix('api:');
  },
  
  /**
   * Get any errors that occurred
   * @returns {Array} - Array of error objects
   */
  getErrors: () => {
    return localStorageService.getData('api_errors') || [];
  },
  
  /**
   * Clear stored errors
   * @returns {boolean} - Success indicator
   */
  clearErrors: () => {
    return localStorageService.saveData('api_errors', []);
  },
  
  /**
   * Set configuration options
   * @param {object} options - Configuration options
   */
  setConfig: (options) => {
    Object.assign(config, options);
    
    // Update axios instance baseURL if it changed
    if (options.baseURL) {
      apiClient.defaults.baseURL = options.baseURL;
    }
    
    // Update timeout if it changed
    if (options.timeout) {
      apiClient.defaults.timeout = options.timeout;
    }
    
    if (config.debug) {
      console.log('API Client Configuration Updated:', {
        baseURL: config.baseURL,
        useServerProxy: config.useServerProxy,
        debug: config.debug,
        hasOpenAIKey: !!config.openaiApiKey,
        hasGoogleMapsKey: !!config.googleMapsApiKey
      });
    }
  }
};

// Export the apiClient and apiHelpers
export { apiHelpers };
export default apiClient; 