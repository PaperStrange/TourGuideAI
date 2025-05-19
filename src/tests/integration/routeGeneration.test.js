import * as openaiApi from '../../api/openaiApi';
import * as googleMapsApi from '../../api/googleMapsApi';

// Mock the API modules
jest.mock('../../api/openaiApi', () => {
  const originalModule = jest.requireActual('../../api/openaiApi');
  return {
    ...originalModule,
    setApiKey: jest.fn().mockReturnValue(true),
    getStatus: jest.fn().mockReturnValue({ isConfigured: true, debug: false }),
    recognizeTextIntent: jest.fn(),
    generateRoute: jest.fn(),
    splitRouteByDay: jest.fn(),
  };
});

jest.mock('../../api/googleMapsApi', () => {
  const originalModule = jest.requireActual('../../api/googleMapsApi');
  return {
    ...originalModule,
    setApiKey: jest.fn().mockReturnValue(true),
    validateTransportation: jest.fn(),
    getNearbyInterestPoints: jest.fn()
  };
});

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
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Configure APIs
    openaiApi.setApiKey('test-openai-key');
    googleMapsApi.setApiKey('test-maps-key');
    
    // Mock OpenAI API responses
    openaiApi.recognizeTextIntent.mockResolvedValue({
      arrival: 'Rome',
      departure: '',
      travel_duration: '3 days',
      travel_interests: 'historical sites'
    });
    
    openaiApi.generateRoute.mockResolvedValue({
      id: 'route-123',
      name: 'Rome 3-Day Historical Tour',
      destination: 'Rome, Italy',
      sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain'],
      route_duration: '3 days'
    });
    
    openaiApi.splitRouteByDay.mockResolvedValue({
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
    });
    
    // Mock Google Maps API responses
    googleMapsApi.validateTransportation.mockResolvedValue({
      duration: '10 mins',
      duration_value: 600,
      distance: '5 km',
      distance_value: 5000
    });
    
    googleMapsApi.getNearbyInterestPoints.mockResolvedValue([
      {
        name: 'Test Point of Interest',
        address: 'Test Address',
        rating: 4.5,
        types: ['tourist_attraction']
      }
    ]);
  });

  test('complete route generation flow from user query to timeline display', async () => {
    // Step 1: Generate route from user query
    const userQuery = 'Show me a 3-day tour of Rome';
    
    const route = await openaiApi.generateRoute(userQuery);
    
    expect(route).toBeDefined();
    expect(route.name).toBe('Rome 3-Day Historical Tour');
    expect(route.destination).toBe('Rome, Italy');
    expect(route.sites_included_in_routes.length).toBe(3);
    
    // Step 2: Recognize user intent
    const intent = await openaiApi.recognizeTextIntent(userQuery);
    
    expect(intent).toBeDefined();
    expect(intent.arrival).toBe('Rome');
    expect(intent.travel_duration).toBe('3 days');
    
    // Step 3: Split route by day
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
    expect(nearbyPoints.length).toBeGreaterThan(0);
    
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
    openaiApi.generateRoute.mockRejectedValueOnce(new Error('Invalid request'));
    
    await expect(openaiApi.generateRoute('invalid query')).rejects.toThrow('Invalid request');
    
    // Test recovery by making a successful request after a failure
    openaiApi.generateRoute.mockResolvedValueOnce({
      id: 'route-123',
      name: 'Recovery Tour',
      destination: 'Recovery City'
    });
    
    const recoveryRoute = await openaiApi.generateRoute('valid query');
    
    expect(recoveryRoute).toBeDefined();
    expect(recoveryRoute.name).toBe('Recovery Tour');
  });
}); 