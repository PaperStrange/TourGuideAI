import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const routeGenerationCalls = new Counter('route_generation_calls');
const routeGenerationErrors = new Counter('route_generation_errors');
const routeGenerationSuccessRate = new Rate('route_generation_success_rate');
const routeGenerationDuration = new Trend('route_generation_duration');
const intentAnalysisDuration = new Trend('intent_analysis_duration');

// Test configuration
export const options = {
  scenarios: {
    low_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    medium_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    high_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    route_generation_success_rate: ['rate>0.95'], // 95% success rate
    'route_generation_duration': ['p(95)<10000'], // 95% of requests should be under 10s
    'http_req_duration': ['p(95)<15000'], // 95% of requests should be under 15s
  },
};

// Sample destinations to test with
const destinations = [
  'Paris, France',
  'Tokyo, Japan',
  'New York, USA',
  'Rome, Italy',
  'Sydney, Australia',
  'London, UK',
  'Bangkok, Thailand',
  'Cairo, Egypt',
  'Rio de Janeiro, Brazil',
  'Cape Town, South Africa'
];

// Sample durations
const durations = [2, 3, 5, 7, 10, 14];

// Sample activities/interests
const activities = [
  'museums',
  'beaches',
  'hiking',
  'food',
  'nightlife',
  'shopping',
  'historical sites',
  'theme parks',
  'natural wonders',
  'wildlife'
];

// Sample travel styles
const travelStyles = [
  'luxury',
  'budget',
  'family-friendly',
  'adventure',
  'relaxing',
  'cultural',
  'solo travel',
  'couples retreat',
  'eco-tourism',
  'off the beaten path'
];

// Helper function to generate a random travel query
function generateRandomQuery() {
  const destination = destinations[Math.floor(Math.random() * destinations.length)];
  const duration = durations[Math.floor(Math.random() * durations.length)];
  const activity = activities[Math.floor(Math.random() * activities.length)];
  const travelStyle = travelStyles[Math.floor(Math.random() * travelStyles.length)];
  
  return `I want to visit ${destination} for ${duration} days. I'm interested in ${activity} and prefer a ${travelStyle} experience.`;
}

// Helper function to generate auth token
function getAuthToken() {
  // In a real scenario, this would be a proper authentication flow
  const loginRes = http.post(`${__ENV.API_BASE_URL}/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'loadtesting123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (loginRes.status !== 200) {
    console.error(`Authentication failed: ${loginRes.status} ${loginRes.body}`);
    return null;
  }
  
  return JSON.parse(loginRes.body).token;
}

// Global setup to get authentication token once
export function setup() {
  return {
    token: getAuthToken()
  };
}

// Default function that runs for each virtual user
export default function(data) {
  const baseUrl = __ENV.API_BASE_URL || 'http://localhost:3000/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`
  };
  
  // Generate a random query for this user
  const query = generateRandomQuery();
  
  // Step 1: Analyze query intent
  const startIntentAnalysis = new Date();
  const intentRes = http.post(`${baseUrl}/routes/analyze-intent`, JSON.stringify({
    query: query
  }), { headers });
  
  intentAnalysisDuration.add(new Date() - startIntentAnalysis);
  
  const intentSuccess = check(intentRes, {
    'intent analysis status is 200': (r) => r.status === 200,
    'intent analysis returns destination': (r) => {
      const body = JSON.parse(r.body);
      return body.arrival != null;
    }
  });
  
  if (!intentSuccess) {
    console.error(`Intent analysis failed: ${intentRes.status} ${intentRes.body}`);
    return;
  }
  
  // Extract the processed intent
  const intent = JSON.parse(intentRes.body);
  
  // Step 2: Generate route based on intent
  const startRouteGeneration = new Date();
  routeGenerationCalls.add(1);
  
  const routeRes = http.post(`${baseUrl}/routes/generate`, JSON.stringify({
    query: query,
    intent: intent
  }), { 
    headers,
    timeout: '60s' // Routes can take time to generate
  });
  
  const routeGenerationTime = new Date() - startRouteGeneration;
  routeGenerationDuration.add(routeGenerationTime);
  
  const success = check(routeRes, {
    'route generation status is 200': (r) => r.status === 200,
    'route has a name': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.route_name != null;
      } catch (e) {
        return false;
      }
    },
    'route has daily itinerary': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.daily_itinerary);
      } catch (e) {
        return false;
      }
    },
    'route generation completed within 30s': () => routeGenerationTime < 30000
  });
  
  routeGenerationSuccessRate.add(success);
  
  if (!success) {
    routeGenerationErrors.add(1);
    console.error(`Route generation failed for query: "${query}"`);
    console.error(`Status: ${routeRes.status}, Response: ${routeRes.body}`);
  }
  
  // Optional: Test saving the route if generation was successful
  if (success) {
    const routeData = JSON.parse(routeRes.body);
    
    const saveRes = http.post(`${baseUrl}/routes/save`, JSON.stringify({
      route: routeData
    }), { headers });
    
    check(saveRes, {
      'route save status is 200': (r) => r.status === 200,
      'route save returns route id': (r) => {
        const body = JSON.parse(r.body);
        return body.id != null;
      }
    });
  }
  
  // Sleep between iterations to simulate real user behavior
  sleep(Math.random() * 3 + 2); // Sleep between 2-5 seconds
}

// Function that runs when the test finishes
export function teardown(data) {
  // Optional cleanup code
  if (data.token) {
    console.log('Cleanup: Logging out test user');
  }
} 