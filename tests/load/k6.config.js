/**
 * k6 Load Testing Configuration
 * 
 * This configuration defines load testing scenarios for the TourGuideAI application.
 */

export const options = {
  // Define base configuration for scenarios
  scenarios: {
    // Normal usage simulation
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'normalUsageFlow',
    },
    
    // Peak usage simulation
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'normalUsageFlow',
    },
    
    // Stress test for API endpoints
    api_stress: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 30,
      maxVUs: 100,
      exec: 'apiOnlyFlow',
    },
    
    // Soak test for long-term reliability
    soak_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30m',
      exec: 'normalUsageFlow',
    },
  },
  
  // Set thresholds for test success/failure
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% of requests must complete below 1s, 99% below 2s
    http_req_failed: ['rate<0.01'],                  // Less than 1% of requests should fail
    'http_req_duration{type:static}': ['p(95)<100'], // Static assets should be fast
    'http_req_duration{type:api}': ['p(95)<1000'],   // API calls have their own threshold
  },
  
  // Base URL configuration - overridden by environment variables for different environments
  env: {
    BASE_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:5000/api',
  },
};

// Define the normal user flow
export function normalUsageFlow() {
  // Import the individual test flows that make up a normal user journey
  const { homePage } = require('./scenarios/home.js');
  const { authFlow } = require('./scenarios/auth.js');
  const { routeCreation } = require('./scenarios/route_creation.js');
  const { routeViewing } = require('./scenarios/route_viewing.js');
  
  // Execute the combined flow
  homePage();
  authFlow();
  routeCreation();
  routeViewing();
}

// Define the API-only flow for API stress testing
export function apiOnlyFlow() {
  // Import the API test scenarios
  const { routeGenerationAPI } = require('./scenarios/api_only/route_generation.js');
  const { routeFetchingAPI } = require('./scenarios/api_only/route_fetching.js');
  const { userProfileAPI } = require('./scenarios/api_only/user_profile.js');
  
  // Execute the API flows
  routeGenerationAPI();
  routeFetchingAPI();
  userProfileAPI();
}

// Export helper functions for scenario scripts
export function getBaseUrl() {
  return __ENV.BASE_URL || 'http://localhost:3000';
}

export function getApiUrl() {
  return __ENV.API_URL || 'http://localhost:5000/api';
}

export function getDefaultHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-K6-Test': 'true',
  };
} 