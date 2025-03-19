import * as openaiApi from '../../api/openaiApi';
import * as googleMapsApi from '../../api/googleMapsApi';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key]),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the fetch API
global.fetch = jest.fn();

describe('Route Generation Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    
    // Mock successful API response
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ result: 'success' }) } }] })
      })
    );
    
    // Configure APIs
    openaiApi.setApiKey('test-openai-key');
    googleMapsApi.setApiKey('test-maps-key');
  });

  test('complete route generation flow from user query to timeline display', async () => {
    // Step 1: Generate route from user query
    const userQuery = 'Show me a 3-day tour of Rome';
    
    // Mock the route generation response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ 
            message: { 
              content: JSON.stringify({
                id: 'route-123',
                name: 'Rome 3-Day Historical Tour',
                destination: 'Rome, Italy',
                sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain'],
                route_duration: '3 days'
              }) 
            } 
          }] 
        })
      })
    );
    
    const route = await openaiApi.generateRoute(userQuery);
    
    expect(route).toBeDefined();
    expect(route.name).toBe('Rome 3-Day Historical Tour');
    expect(route.destination).toBe('Rome, Italy');
    expect(route.sites_included_in_routes.length).toBe(3);
    
    // Step 2: Recognize user intent
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ 
            message: { 
              content: JSON.stringify({
                arrival: 'Rome',
                departure: '',
                travel_duration: '3 days',
                travel_interests: 'historical sites'
              }) 
            } 
          }] 
        })
      })
    );
    
    const intent = await openaiApi.recognizeIntent(userQuery);
    
    expect(intent).toBeDefined();
    expect(intent.arrival).toBe('Rome');
    expect(intent.travel_duration).toBe('3 days');
    
    // Step 3: Split route by day
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ 
            message: { 
              content: JSON.stringify({
                travel_split_by_day: [
                  {
                    travel_day: 1,
                    current_date: '2025/03/10',
                    dairy_routes: [
                      {
                        route_id: 'r001',
                        departure_site: 'Hotel Rome',
                        arrival_site: 'Colosseum',
                        transportation_type: 'walk',
                        duration: '20',
                        duration_unit: 'minute'
                      }
                    ]
                  }
                ]
              }) 
            } 
          }] 
        })
      })
    );
    
    const timeline = await openaiApi.splitRouteByDay(route);
    
    expect(timeline).toBeDefined();
    expect(timeline.travel_split_by_day).toBeDefined();
    expect(timeline.travel_split_by_day.length).toBe(1);
    expect(timeline.travel_split_by_day[0].dairy_routes.length).toBe(1);
    
    // Step 4: Validate transportation with Google Maps
    const routeToValidate = timeline.travel_split_by_day[0].dairy_routes[0];
    
    const validatedRoute = await googleMapsApi.validateTransportation(routeToValidate);
    
    expect(validatedRoute).toBeDefined();
    expect(validatedRoute.duration).toBeDefined();
    expect(validatedRoute.distance).toBeDefined();
    
    // Step 5: Get nearby points of interest
    const nearbyPoints = await googleMapsApi.getNearbyInterestPoints(routeToValidate.arrival_site);
    
    expect(nearbyPoints).toBeDefined();
    expect(Array.isArray(nearbyPoints)).toBe(true);
    
    // Step 6: Save route to local storage (simulating what the application would do)
    const routeWithDetails = {
      ...route,
      user_intent_recognition: intent,
      timeline: timeline
    };
    
    localStorage.setItem('tourguide_routes', JSON.stringify({
      'route-123': routeWithDetails
    }));
    
    const savedRoutes = JSON.parse(localStorage.getItem('tourguide_routes'));
    
    expect(savedRoutes).toBeDefined();
    expect(savedRoutes['route-123']).toBeDefined();
    expect(savedRoutes['route-123'].name).toBe('Rome 3-Day Historical Tour');
    expect(savedRoutes['route-123'].timeline).toBeDefined();
  });

  test('should handle errors in the route generation process', async () => {
    // Mock API error
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Invalid request' } })
      })
    );
    
    await expect(openaiApi.generateRoute('invalid query')).rejects.toThrow();
    
    // Test recovery by making a successful request after a failure
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ 
            message: { 
              content: JSON.stringify({
                id: 'route-123',
                name: 'Recovery Tour',
                destination: 'Recovery City'
              }) 
            } 
          }] 
        })
      })
    );
    
    const recoveryRoute = await openaiApi.generateRoute('valid query');
    
    expect(recoveryRoute).toBeDefined();
    expect(recoveryRoute.name).toBe('Recovery Tour');
  });
}); 