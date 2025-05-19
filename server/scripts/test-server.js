/**
 * TourGuideAI API Server Test Script
 * 
 * A simple test script to verify the server is working correctly.
 * Run with: node scripts/test-server.js
 */

require('dotenv').config();
const axios = require('axios');
const logger = require('../utils/logger');

// Validate environment variables
const validateEnv = () => {
  const requiredVars = ['PORT', 'OPENAI_API_KEY', 'GOOGLE_MAPS_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    logger.info('Please check your .env file or set these variables before running the server.');
    return false;
  }
  
  return true;
};

// Test health endpoint
const testHealth = async () => {
  try {
    const port = process.env.PORT || 3000;
    const response = await axios.get(`http://localhost:${port}/health`);
    
    if (response.status === 200 && response.data.status === 'ok') {
      logger.info('Health check endpoint is working!', {
        status: response.status,
        data: response.data
      });
      return true;
    } else {
      logger.error('Health check failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('Health check failed', {
      message: error.message,
      code: error.code
    });
    return false;
  }
};

// Simple test of OpenAI API endpoint
const testOpenAI = async () => {
  try {
    const port = process.env.PORT || 3000;
    const response = await axios.post(`http://localhost:${port}/api/openai/recognize-intent`, {
      text: 'I want to visit New York next weekend'
    });
    
    if (response.status === 200 && response.data.intent) {
      logger.info('OpenAI API endpoint is working!', {
        status: response.status,
        intent: response.data.intent
      });
      return true;
    } else {
      logger.error('OpenAI API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('OpenAI API test failed', {
      message: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code || error.code
    });
    return false;
  }
};

// Simple test of Google Maps API endpoint
const testGoogleMaps = async () => {
  try {
    const port = process.env.PORT || 3000;
    const response = await axios.get(`http://localhost:${port}/api/maps/geocode`, {
      params: { address: 'New York City' }
    });
    
    if (response.status === 200 && response.data.result) {
      logger.info('Google Maps API endpoint is working!', {
        status: response.status,
        location: response.data.result.location
      });
      return true;
    } else {
      logger.error('Google Maps API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logger.error('Google Maps API test failed', {
      message: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code || error.code
    });
    return false;
  }
};

// Run the tests
const runTests = async () => {
  logger.info('Beginning server tests...');
  
  if (!validateEnv()) {
    logger.warn('Environment validation failed. Tests may not work correctly.');
  }
  
  logger.info('Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const healthResult = await testHealth();
  
  if (healthResult) {
    logger.info('Testing OpenAI API endpoint...');
    await testOpenAI();
    
    logger.info('Testing Google Maps API endpoint...');
    await testGoogleMaps();
  } else {
    logger.error('Health check failed. Skipping API tests.');
  }
  
  logger.info('Tests completed.');
};

// Run the tests
runTests().catch(error => {
  logger.error('Unexpected error in test script', { error });
}); 