const { describe, test, expect, beforeEach } = require('@jest/globals');
const { routeGenerationService } = require('../services/routeGenerationService');
const openaiClient = require('../clients/openaiClient');
const googleMapsClient = require('../clients/googleMapsClient');
const validationService = require('../services/validationService');

// Mock external dependencies
jest.mock('../clients/openaiClient', () => ({
  generateRouteCompletion: jest.fn(),
  generateIntentAnalysis: jest.fn()
}));

jest.mock('../clients/googleMapsClient', () => ({
  validateLocation: jest.fn(),
  getAttractions: jest.fn(),
  getAccommodations: jest.fn(),
  getTransportOptions: jest.fn()
}));

jest.mock('../services/validationService', () => ({
  validateItinerary: jest.fn(),
  validateCosts: jest.fn(),
  validateLocationDataConsistency: jest.fn()
}));

describe('Route Generation Service', () => {
  // Sample data for tests
  const mockQuery = 'I want to visit Paris for 3 days with my family';
  const mockLocation = { lat: 48.8566, lng: 2.3522, address: 'Paris, France' };
  
  const mockIntent = {
    arrival: 'Paris, France',
    departure: null,
    arrival_date: null, 
    departure_date: null,
    travel_duration: '3 days',
    entertainment_prefer: 'family-friendly',
    transportation_prefer: null,
    accommodation_prefer: null,
    total_cost_prefer: null,
    user_personal_need: 'family'
  };
  
  const mockGeneratedRoute = {
    id: 'route_123',
    route_name: 'Family Paris Adventure',
    destination: 'Paris, France',
    duration: '3',
    overview: 'A wonderful family trip to Paris',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Luxembourg Gardens'],
    daily_itinerary: [
      {
        day_title: 'Family Fun at Iconic Landmarks',
        description: 'Visit the most famous family-friendly sites in Paris',
        activities: [
          { name: 'Eiffel Tower', description: 'Great views for the whole family', time: '9:00 AM' },
          { name: 'Seine River Cruise', description: 'Relaxing boat ride', time: '2:00 PM' }
        ]
      }
    ],
    estimated_costs: {
      'Total': '€1200'
    }
  };
  
  const mockAttractions = [
    { name: 'Eiffel Tower', rating: 4.5, description: 'Famous tower' },
    { name: 'Louvre Museum', rating: 4.8, description: 'World-class art museum' }
  ];
  
  const mockAccommodations = [
    { name: 'Family Hotel Paris', rating: 4.2, price_range: '€€' },
    { name: 'Paris Apartment', rating: 4.5, price_range: '€€€' }
  ];
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    openaiClient.generateIntentAnalysis.mockResolvedValue(mockIntent);
    openaiClient.generateRouteCompletion.mockResolvedValue(mockGeneratedRoute);
    
    googleMapsClient.validateLocation.mockResolvedValue({ valid: true, location: mockLocation });
    googleMapsClient.getAttractions.mockResolvedValue(mockAttractions);
    googleMapsClient.getAccommodations.mockResolvedValue(mockAccommodations);
    googleMapsClient.getTransportOptions.mockResolvedValue(['Metro', 'Bus', 'Taxi']);
    
    validationService.validateItinerary.mockReturnValue({ valid: true });
    validationService.validateCosts.mockReturnValue({ valid: true });
    validationService.validateLocationDataConsistency.mockReturnValue({ valid: true });
  });
  
  test('analyzeUserQuery should extract intent from query', async () => {
    const result = await routeGenerationService.analyzeUserQuery(mockQuery);
    
    expect(openaiClient.generateIntentAnalysis).toHaveBeenCalledWith(mockQuery);
    expect(result).toEqual(mockIntent);
  });
  
  test('generateRouteFromQuery should create complete route based on user query', async () => {
    const result = await routeGenerationService.generateRouteFromQuery(mockQuery);
    
    // Verify all expected service calls are made
    expect(openaiClient.generateIntentAnalysis).toHaveBeenCalledWith(mockQuery);
    expect(googleMapsClient.validateLocation).toHaveBeenCalledWith('Paris, France');
    expect(openaiClient.generateRouteCompletion).toHaveBeenCalled();
    expect(validationService.validateItinerary).toHaveBeenCalled();
    
    // Verify result structure
    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      route_name: expect.any(String),
      destination: expect.any(String),
      duration: expect.any(String),
      overview: expect.any(String),
      daily_itinerary: expect.any(Array)
    }));
  });
  
  test('generateRouteFromQuery should enhance route with real location data', async () => {
    const result = await routeGenerationService.generateRouteFromQuery(mockQuery);
    
    expect(googleMapsClient.getAttractions).toHaveBeenCalled();
    expect(googleMapsClient.getAccommodations).toHaveBeenCalled();
    
    // Verify that the route contains enhanced data
    expect(result.poi_data).toBeDefined();
    expect(result.accommodation_options).toBeDefined();
    expect(result.transportation_options).toBeDefined();
  });
  
  test('generateRandomRoute should create a route with random destination', async () => {
    const result = await routeGenerationService.generateRandomRoute();
    
    expect(openaiClient.generateRouteCompletion).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      route_name: expect.any(String),
      destination: expect.any(String)
    }));
  });
  
  test('should handle invalid location gracefully', async () => {
    // Mock an invalid location
    googleMapsClient.validateLocation.mockResolvedValueOnce({ 
      valid: false, 
      error: 'Location not found' 
    });
    
    await expect(routeGenerationService.generateRouteFromQuery('I want to visit Atlantis')).rejects.toThrow(
      'Unable to validate location: Location not found'
    );
  });
  
  test('should handle OpenAI API errors gracefully', async () => {
    // Mock an API error
    openaiClient.generateIntentAnalysis.mockRejectedValueOnce(
      new Error('API rate limit exceeded')
    );
    
    await expect(routeGenerationService.analyzeUserQuery(mockQuery)).rejects.toThrow(
      'Failed to analyze query: API rate limit exceeded'
    );
  });
  
  test('should reject invalid itineraries', async () => {
    // Mock validation failure
    validationService.validateItinerary.mockReturnValueOnce({ 
      valid: false, 
      errors: ['Missing required activities'] 
    });
    
    await expect(routeGenerationService.generateRouteFromQuery(mockQuery)).rejects.toThrow(
      'Invalid itinerary: Missing required activities'
    );
  });
  
  test('generateRouteWithConstraints should respect user constraints', async () => {
    const constraints = {
      budget: 'budget',
      interests: ['history', 'food'],
      accessibility: 'wheelchair'
    };
    
    const result = await routeGenerationService.generateRouteWithConstraints('Paris', 3, constraints);
    
    expect(openaiClient.generateRouteCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Paris',
        duration: 3,
        constraints: constraints
      })
    );
    
    expect(result).toEqual(expect.objectContaining({
      destination: 'Paris',
      duration: '3'
    }));
  });
  
  test('optimizeItinerary should improve existing route', async () => {
    const originalRoute = {
      ...mockGeneratedRoute,
      daily_itinerary: [
        {
          day_title: 'Unoptimized Day',
          description: 'Random activities without logic',
          activities: [
            { name: 'Louvre Museum', description: 'Art museum', time: '4:00 PM' },
            { name: 'Eiffel Tower', description: 'Famous tower', time: '9:00 AM' }
          ]
        }
      ]
    };
    
    // Mock optimized route response
    openaiClient.generateRouteCompletion.mockResolvedValueOnce({
      ...originalRoute,
      daily_itinerary: [
        {
          day_title: 'Optimized Day',
          description: 'Logical sequence of activities',
          activities: [
            { name: 'Eiffel Tower', description: 'Famous tower', time: '9:00 AM' },
            { name: 'Louvre Museum', description: 'Art museum', time: '2:00 PM' }
          ]
        }
      ]
    });
    
    const result = await routeGenerationService.optimizeItinerary(originalRoute);
    
    expect(result.daily_itinerary[0].day_title).toBe('Optimized Day');
    expect(result.daily_itinerary[0].activities[0].name).toBe('Eiffel Tower');
    expect(result.daily_itinerary[0].activities[1].name).toBe('Louvre Museum');
    expect(result.daily_itinerary[0].activities[1].time).toBe('2:00 PM');
  });
}); 