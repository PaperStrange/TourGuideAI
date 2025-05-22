/**
 * API Helper Utilities
 * 
 * Common utility functions for API interactions.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Create a configured axios instance for OpenAI API
 * @param {string} apiKey - OpenAI API key (provided by middleware)
 * @returns {Object} Axios instance
 */
const createOpenAIClient = (apiKey) => {
  if (!apiKey) {
    logger.error('Missing OpenAI API key when creating client');
    throw new Error('API key not provided to createOpenAIClient');
  }
  
  return axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000 // 60 seconds
  });
};

/**
 * Create a configured axios instance for Google Maps API
 * @param {string} apiKey - Google Maps API key (provided by middleware)
 * @returns {Object} Axios instance
 */
const createGoogleMapsClient = (apiKey) => {
  if (!apiKey) {
    logger.error('Missing Google Maps API key when creating client');
    throw new Error('API key not provided to createGoogleMapsClient');
  }
  
  return axios.create({
    baseURL: 'https://maps.googleapis.com/maps/api',
    params: {
      key: apiKey
    },
    timeout: 30000 // 30 seconds
  });
};

/**
 * Handle API errors consistently
 * @param {Error} error - The caught error
 * @param {string} source - API source identifier (e.g., 'openai', 'googlemaps')
 * @returns {Object} Formatted error object
 */
const handleApiError = (error, source) => {
  // Generate a unique error ID for tracking
  const errorId = uuidv4();
  
  // Extract the response error if it exists
  const responseError = error.response?.data?.error;
  
  // Create a structured error object
  const formattedError = {
    id: errorId,
    source,
    status: error.response?.status || 500,
    type: responseError?.type || 'api_error',
    message: responseError?.message || error.message || 'An unexpected error occurred',
    code: responseError?.code || error.code,
    timestamp: new Date().toISOString()
  };
  
  // Log error details for server-side debugging
  logger.error(`[${source.toUpperCase()} API ERROR] ${formattedError.message}`, {
    error_id: errorId,
    status: formattedError.status,
    type: formattedError.type,
    stack: error.stack
  });
  
  return formattedError;
};

/**
 * Validate and sanitize request parameters
 * @param {Object} params - Request parameters to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Sanitized parameters
 */
const validateParams = (params, schema) => {
  const sanitized = {};
  
  // Apply schema validation
  Object.keys(schema).forEach(key => {
    const paramValue = params[key];
    const schemaValue = schema[key];
    
    // Skip if parameter is required but not provided
    if (schemaValue.required && (paramValue === undefined || paramValue === null)) {
      throw new Error(`Missing required parameter: ${key}`);
    }
    
    // Skip if parameter is not provided and not required
    if (paramValue === undefined || paramValue === null) {
      if (schemaValue.default !== undefined) {
        sanitized[key] = schemaValue.default;
      }
      return;
    }
    
    // Type validation
    if (schemaValue.type) {
      const paramType = Array.isArray(paramValue) ? 'array' : typeof paramValue;
      if (paramType !== schemaValue.type) {
        throw new Error(`Parameter ${key} should be of type ${schemaValue.type}`);
      }
    }
    
    // Apply transformations if needed
    if (schemaValue.transform && typeof schemaValue.transform === 'function') {
      sanitized[key] = schemaValue.transform(paramValue);
    } else {
      sanitized[key] = paramValue;
    }
  });
  
  return sanitized;
};

module.exports = {
  createOpenAIClient,
  createGoogleMapsClient,
  handleApiError,
  validateParams
}; 