import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const routeGenerationTrend = new Trend('route_generation_time');
const mapLoadingTrend = new Trend('map_loading_time');
const apiErrorRate = new Rate('api_errors');
const routesGenerated = new Counter('routes_generated');
// New metrics for UX audit and task prompt systems
const sessionRecordingLoadTime = new Trend('session_recording_load_time');
const heatmapRenderTime = new Trend('heatmap_render_time');
const taskPromptResponseTime = new Trend('task_prompt_response_time');
const sessionRecordingsGenerated = new Counter('session_recordings_generated');
const taskPromptCompletions = new Counter('task_prompt_completions');

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
    
    // UX Audit System Load Test
    ux_audit_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 30 }, // Ramp up to 30 users over 1 minute
        { duration: '3m', target: 30 }, // Stay at 30 users for 3 minutes
        { duration: '1m', target: 0 },  // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      startTime: '18m', // Start after the break point test
    },
    
    // Task Prompt System Load Test
    task_prompt_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 40 }, // Ramp up to 40 users over 1 minute
        { duration: '3m', target: 40 }, // Stay at 40 users for 3 minutes
        { duration: '1m', target: 0 },  // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      startTime: '23m', // Start after the UX Audit load test
    }
  },
  
  // Set thresholds for acceptable performance
  thresholds: {
    'http_req_duration': ['p(95)<3000'],      // 95% of requests should be below 3s
    'http_req_failed': ['rate<0.05'],         // Error rate should be below 5%
    'route_generation_time': ['p(95)<8000'],  // 95% of route generations should be below 8s
    'map_loading_time': ['p(95)<5000'],       // 95% of map loads should be below 5s
    // New thresholds for UX audit and task prompt systems
    'session_recording_load_time': ['p(95)<6000'], // 95% of session recording loads below 6s
    'heatmap_render_time': ['p(95)<7000'],         // 95% of heatmap renders below 7s
    'task_prompt_response_time': ['p(95)<2000'],   // 95% of task prompt responses below 2s
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
  
  group('UX Audit System load test', () => {
    // Authenticate first (simplified for load test)
    const loginPayload = JSON.stringify({
      email: 'load-test-admin@example.com',
      password: 'load-test-password',
    });
    
    const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(loginRes, {
      'Login successful': (r) => r.status === 200,
      'Auth token received': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.token;
        } catch (e) {
          return false;
        }
      },
    });
    
    if (!success) {
      apiErrorRate.add(1);
      return;
    }
    
    // Extract token for subsequent requests
    const token = JSON.parse(loginRes.body).token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    // 1. Test session recording list load
    const startSessionListTime = new Date().getTime();
    const sessionListRes = http.get(`${baseUrl}/api/beta/analytics/sessions`, {
      headers: authHeaders,
    });
    const endSessionListTime = new Date().getTime();
    sessionRecordingLoadTime.add(endSessionListTime - startSessionListTime);
    
    check(sessionListRes, {
      'Session recording list loaded': (r) => r.status === 200,
      'Session list contains data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.sessions) && body.sessions.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    // 2. Test heatmap generation
    const startHeatmapTime = new Date().getTime();
    const heatmapRes = http.get(`${baseUrl}/api/beta/analytics/heatmap?page=home&timeRange=7d`, {
      headers: authHeaders,
    });
    const endHeatmapTime = new Date().getTime();
    heatmapRenderTime.add(endHeatmapTime - startHeatmapTime);
    
    check(heatmapRes, {
      'Heatmap data loaded successfully': (r) => r.status === 200,
      'Heatmap contains data points': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.dataPoints) && body.dataPoints.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    // 3. Test individual session recording playback
    const sampleSessionId = '12345-test-session-id';
    const sessionRecordingRes = http.get(`${baseUrl}/api/beta/analytics/sessions/${sampleSessionId}`, {
      headers: authHeaders,
    });
    
    const sessionSuccess = check(sessionRecordingRes, {
      'Session recording loaded': (r) => r.status === 200,
      'Session contains events': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.events) && body.events.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    if (sessionSuccess) {
      sessionRecordingsGenerated.add(1);
    } else {
      apiErrorRate.add(1);
    }
    
    // 4. Test UX metrics report generation
    const metricsRes = http.get(`${baseUrl}/api/beta/analytics/metrics/summary?timeRange=30d`, {
      headers: authHeaders,
    });
    
    check(metricsRes, {
      'UX metrics report loaded': (r) => r.status === 200,
      'Report contains valid metrics': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.averageSessionDuration && body.bounceRate != null;
        } catch (e) {
          return false;
        }
      },
    });
    
    sleep(2);
  });
  
  group('Task Prompt System load test', () => {
    // 1. Test loading task prompt templates
    const templatesRes = http.get(`${baseUrl}/api/beta/tasks/templates`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(templatesRes, {
      'Task templates loaded successfully': (r) => r.status === 200,
      'Templates contain data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.templates) && body.templates.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    
    // 2. Test creating a new task prompt
    const createTaskPayload = JSON.stringify({
      title: 'Test Task Prompt',
      description: 'This is a test task prompt for load testing',
      targetSegment: 'new-users',
      triggerCondition: 'pageVisit',
      triggerPage: '/map',
      taskSteps: [
        { description: 'Click on the Paris location' },
        { description: 'Select a weekend itinerary' }
      ]
    });
    
    const startTaskPromptTime = new Date().getTime();
    const createTaskRes = http.post(`${baseUrl}/api/beta/tasks/create`, createTaskPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const endTaskPromptTime = new Date().getTime();
    taskPromptResponseTime.add(endTaskPromptTime - startTaskPromptTime);
    
    const taskSuccess = check(createTaskRes, {
      'Task prompt created successfully': (r) => r.status === 201,
      'Task prompt has valid ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.taskId;
        } catch (e) {
          return false;
        }
      },
    });
    
    if (taskSuccess) {
      taskPromptCompletions.add(1);
      
      // 3. Test task prompt activation status
      const taskId = JSON.parse(createTaskRes.body).taskId;
      const activatePayload = JSON.stringify({
        active: true
      });
      
      const activateRes = http.put(`${baseUrl}/api/beta/tasks/${taskId}/status`, activatePayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(activateRes, {
        'Task activation status updated': (r) => r.status === 200,
        'Task is now active': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.active === true;
          } catch (e) {
            return false;
          }
        },
      });
      
      // 4. Test task analytics retrieval
      const analyticsRes = http.get(`${baseUrl}/api/beta/tasks/${taskId}/analytics`, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(analyticsRes, {
        'Task analytics retrieved': (r) => r.status === 200,
        'Analytics contain metrics': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.impressions != null && body.completionRate != null;
          } catch (e) {
            return false;
          }
        },
      });
    } else {
      apiErrorRate.add(1);
    }
    
    // 5. Test listing active task prompts
    const activeTasksRes = http.get(`${baseUrl}/api/beta/tasks/active`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(activeTasksRes, {
      'Active tasks list retrieved': (r) => r.status === 200,
      'Active tasks exist': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.tasks);
        } catch (e) {
          return false;
        }
      },
    });
    
    sleep(2);
  });
} 