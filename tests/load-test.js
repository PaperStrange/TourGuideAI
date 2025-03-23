import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const routeGenerationTrend = new Trend('route_generation_time');
const mapLoadingTrend = new Trend('map_loading_time');
const apiErrorRate = new Rate('api_errors');
const routesGenerated = new Counter('routes_generated');

// Test configuration
export const options = {
  // Define stages for different test scenarios
  scenarios: {
    // Sustained load test
    sustained_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 50 }, // Ramp up to 50 users over 1 minute
        { duration: '5m', target: 50 }, // Stay at 50 users for 5 minutes
        { duration: '1m', target: 0 },  // Ramp down to 0 users over 1 minute
      ],
      gracefulRampDown: '30s',
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 0 },   // Preparation phase
        { duration: '30s', target: 200 }, // Sudden spike to 200 users
        { duration: '1m', target: 200 },  // Maintain spike for 1 minute
        { duration: '30s', target: 0 },   // Quick ramp down
      ],
      gracefulRampDown: '30s',
      startTime: '8m', // Start after the sustained load test
    },
    
    // Break point test
    break_point: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5m', target: 300 },  // Gradually increase to 300 users
      ],
      gracefulRampDown: '30s',
      startTime: '12m', // Start after the spike test
    },
  },
  
  // Set thresholds for acceptable performance
  thresholds: {
    'http_req_duration': ['p(95)<3000'],      // 95% of requests should be below 3s
    'http_req_failed': ['rate<0.05'],         // Error rate should be below 5%
    'route_generation_time': ['p(95)<8000'],  // 95% of route generations should be below 8s
    'map_loading_time': ['p(95)<5000'],       // 95% of map loads should be below 5s
  },
};

// Main test function
export default function() {
  const baseUrl = __ENV.BASE_URL || 'https://staging.tourguideai.com';
  
  group('Home page load test', () => {
    const homeRes = http.get(`${baseUrl}/`);
    
    check(homeRes, {
      'Home page loaded successfully': (r) => r.status === 200,
      'Home page loaded in time': (r) => r.timings.duration < 3000,
    });
    
    sleep(1);
  });
  
  group('Chat page and route generation', () => {
    // Load the chat page
    const chatPageRes = http.get(`${baseUrl}/chat`);
    
    check(chatPageRes, {
      'Chat page loaded successfully': (r) => r.status === 200,
      'Chat page contains required elements': (r) => r.body.includes('Your personal tour guide'),
    });
    
    // Generate a route (API call)
    const startTime = new Date().getTime();
    
    const payload = JSON.stringify({
      query: 'Weekend trip to Paris',
    });
    
    const generateRouteRes = http.post(`${baseUrl}/api/routes/generate`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const endTime = new Date().getTime();
    const generateTime = endTime - startTime;
    
    routeGenerationTrend.add(generateTime);
    
    const success = check(generateRouteRes, {
      'Route generated successfully': (r) => r.status === 200,
      'Route contains destination info': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.destination === 'Paris';
        } catch (e) {
          return false;
        }
      },
    });
    
    if (success) {
      routesGenerated.add(1);
    } else {
      apiErrorRate.add(1);
    }
    
    sleep(3);
  });
  
  group('Map visualization test', () => {
    // Load the map page
    const mapStartTime = new Date().getTime();
    
    const mapPageRes = http.get(`${baseUrl}/map`);
    
    const mapEndTime = new Date().getTime();
    const mapLoadTime = mapEndTime - mapStartTime;
    
    mapLoadingTrend.add(mapLoadTime);
    
    check(mapPageRes, {
      'Map page loaded successfully': (r) => r.status === 200,
      'Map container exists': (r) => r.body.includes('map-container'),
    });
    
    // Get nearby points (API call)
    const pointsRes = http.get(`${baseUrl}/api/maps/nearby?lat=48.8566&lng=2.3522&radius=5000`);
    
    check(pointsRes, {
      'Nearby points API responded': (r) => r.status === 200,
      'API returned points data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.points);
        } catch (e) {
          return false;
        }
      },
    });
    
    sleep(2);
  });
  
  group('User profile test', () => {
    // Load the profile page
    const profileRes = http.get(`${baseUrl}/profile`);
    
    check(profileRes, {
      'Profile page loaded successfully': (r) => r.status === 200,
      'Profile container exists': (r) => r.body.includes('profile-section'),
    });
    
    // Get saved routes (API call)
    const routesRes = http.get(`${baseUrl}/api/user/routes`);
    
    check(routesRes, {
      'Saved routes API responded': (r) => r.status === 200,
    });
    
    sleep(1);
  });
} 