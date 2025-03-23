/**
 * Route Creation Load Test Scenario
 * 
 * This scenario simulates users creating new travel routes.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import { getApiUrl, getDefaultHeaders } from '../k6.config.js';

// Test data for route creation
const destinations = [
  'Paris, France',
  'London, United Kingdom',
  'New York, USA',
  'Tokyo, Japan',
  'Sydney, Australia',
  'Rome, Italy',
  'Barcelona, Spain',
  'Amsterdam, Netherlands',
  'Berlin, Germany',
  'Singapore',
];

const interests = [
  'museums',
  'food',
  'nightlife',
  'shopping',
  'outdoors',
  'history',
  'architecture',
  'adventure',
  'relaxation',
  'nature',
];

const budgets = ['low', 'medium', 'high'];

// Main route creation flow
export function routeCreation() {
  const apiUrl = getApiUrl();
  
  group('Route Creation Flow', () => {
    // Step 1: Request destinations suggestions (simulates autocomplete)
    const randomDestinationIndex = randomIntBetween(0, destinations.length - 1);
    const partialDestination = destinations[randomDestinationIndex].split(',')[0].substring(0, 3);
    
    const autocompleteResponse = http.get(
      `${apiUrl}/destinations/suggestions?query=${partialDestination}`,
      {
        headers: getDefaultHeaders(),
        tags: { type: 'api', name: 'destination_autocomplete' },
      }
    );
    
    check(autocompleteResponse, {
      'autocomplete status is 200': (r) => r.status === 200,
      'autocomplete has suggestions': (r) => JSON.parse(r.body).suggestions.length > 0,
    });
    
    sleep(randomIntBetween(1, 3));
    
    // Step 2: Select random parameters for route creation
    const destination = destinations[randomDestinationIndex];
    const durationDays = randomIntBetween(3, 14);
    
    // Select 1-3 random interests
    const selectedInterests = [];
    const numInterests = randomIntBetween(1, 3);
    
    for (let i = 0; i < numInterests; i++) {
      const interestIndex = randomIntBetween(0, interests.length - 1);
      if (!selectedInterests.includes(interests[interestIndex])) {
        selectedInterests.push(interests[interestIndex]);
      }
    }
    
    const budget = budgets[randomIntBetween(0, budgets.length - 1)];
    
    const routeParams = {
      destination: destination,
      duration: durationDays,
      interests: selectedInterests,
      budget: budget,
      includeNearbyAttractions: Math.random() > 0.5, // 50% chance of including nearby attractions
    };
    
    // Step 3: Generate route
    const routeResponse = http.post(
      `${apiUrl}/routes/generate`,
      JSON.stringify(routeParams),
      {
        headers: getDefaultHeaders(),
        tags: { type: 'api', name: 'route_generation' },
        timeout: '60s', // Route generation can take time
      }
    );
    
    check(routeResponse, {
      'route generation status is 200': (r) => r.status === 200,
      'route has days array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.days) && body.days.length === durationDays;
      },
      'route has destination': (r) => {
        const body = JSON.parse(r.body);
        return body.destination && body.destination.includes(destination.split(',')[0]);
      },
    });
    
    // If route was created successfully, proceed to fetch route details
    if (routeResponse.status === 200) {
      const routeId = JSON.parse(routeResponse.body).id;
      
      sleep(randomIntBetween(2, 5));
      
      // Step 4: View route details
      const routeDetailsResponse = http.get(
        `${apiUrl}/routes/${routeId}`,
        {
          headers: getDefaultHeaders(),
          tags: { type: 'api', name: 'route_details' },
        }
      );
      
      check(routeDetailsResponse, {
        'route details status is 200': (r) => r.status === 200,
        'route details has correct id': (r) => JSON.parse(r.body).id === routeId,
      });
      
      sleep(randomIntBetween(3, 7));
      
      // Step 5: Save route (50% of users save the route)
      if (Math.random() > 0.5) {
        const saveResponse = http.post(
          `${apiUrl}/user/routes/save`,
          JSON.stringify({ routeId: routeId }),
          {
            headers: getDefaultHeaders(),
            tags: { type: 'api', name: 'save_route' },
          }
        );
        
        check(saveResponse, {
          'save route status is 200': (r) => r.status === 200,
          'save route success': (r) => JSON.parse(r.body).success === true,
        });
      }
    }
    
    // Wait between 5-15 seconds between route creations
    sleep(randomIntBetween(5, 15));
  });
} 