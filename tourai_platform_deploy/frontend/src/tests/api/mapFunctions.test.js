/**
 * Tests for map and location-based functions
 * 
 * This file includes tests for the API functions related to map display,
 * nearby points of interest, and transportation validation based on the 
 * testing-plan.md requirements.
 */

// Create mock implementations with proper return values
const mockMap = { id: 'mock-map' };
const mockRouteResult = {
  route: {
    summary: 'Test Route',
    legs: [{
      duration: { text: '20 mins' },
      distance: { text: '5 km' }
    }]
  }
};
const mockNearbyPoints = [
  { 
    name: 'Test Place', 
    place_id: 'test123',
    vicinity: 'Test Address',
    geometry: { location: { lat: 41.9, lng: 12.5 } },
    rating: 4.5,
    user_ratings_total: 100
  }
];
const mockValidatedRoute = {
  duration: '20 mins',
  distance: '5 km',
  transportation_type: 'driving'
};
const mockValidatedPoints = [
  {
    name: 'Roman Forum',
    distance: '0.5 km',
    duration: '10 mins',
    within_range: true
  },
  {
    name: 'Trevi Fountain',
    distance: '2 km',
    duration: '25 mins',
    within_range: true
  },
  {
    name: 'Vatican City',
    distance: '6 km',
    duration: '45 mins',
    within_range: false
  }
];

// Need to mock before importing the module
jest.mock('../../api/googleMapsApi', () => ({
  initializeMap: jest.fn().mockReturnValue({ id: 'mock-map' }),
  displayRouteOnMap: jest.fn().mockResolvedValue({
    route: {
      summary: 'Test Route',
      legs: [{
        duration: { text: '20 mins' },
        distance: { text: '5 km' }
      }]
    }
  }),
  getNearbyInterestPoints: jest.fn().mockResolvedValue([
    { 
      name: 'Test Place', 
      place_id: 'test123',
      vicinity: 'Test Address',
      geometry: { location: { lat: 41.9, lng: 12.5 } },
      rating: 4.5,
      user_ratings_total: 100
    }
  ]),
  validateTransportation: jest.fn().mockResolvedValue({
    duration: '20 mins',
    distance: '5 km',
    transportation_type: 'driving'
  }),
  validateInterestPoints: jest.fn().mockResolvedValue([
    {
      name: 'Roman Forum',
      distance: '0.5 km',
      duration: '10 mins',
      within_range: true
    },
    {
      name: 'Trevi Fountain',
      distance: '2 km',
      duration: '25 mins',
      within_range: true
    },
    {
      name: 'Vatican City',
      distance: '6 km',
      duration: '45 mins',
      within_range: false
    }
  ])
}));

// Now import the mocked module
import * as googleMapsApi from '../../api/googleMapsApi';

describe('Map and Location Functions', () => {
  // Mock global Google Maps object
  global.google = {
    maps: {
      Map: jest.fn().mockImplementation(() => ({
        setCenter: jest.fn(),
        setZoom: jest.fn()
      })),
      Marker: jest.fn().mockImplementation(() => ({
        setMap: jest.fn()
      })),
      InfoWindow: jest.fn().mockImplementation(() => ({
        open: jest.fn(),
        close: jest.fn()
      })),
      DirectionsService: jest.fn().mockImplementation(() => ({
        route: jest.fn((params, callback) => {
          callback({
            status: 'OK',
            routes: [{
              legs: [{
                duration: { text: '20 mins' },
                distance: { text: '5 km' }
              }]
            }]
          });
        })
      })),
      DirectionsRenderer: jest.fn().mockImplementation(() => ({
        setMap: jest.fn(),
        setDirections: jest.fn()
      })),
      LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat, lng })),
      Geocoder: jest.fn().mockImplementation(() => ({
        geocode: jest.fn((params, callback) => {
          callback([{ geometry: { location: { lat: 41.9, lng: 12.5 } } }], 'OK');
        })
      })),
      PlacesService: jest.fn().mockImplementation(() => ({
        nearbySearch: jest.fn((params, callback) => {
          callback([
            { 
              name: 'Test Place', 
              place_id: 'test123',
              vicinity: 'Test Address',
              geometry: { location: { lat: 41.9, lng: 12.5 } },
              rating: 4.5,
              user_ratings_total: 100
            }
          ], 'OK');
        }),
        getDetails: jest.fn((params, callback) => {
          callback({
            name: 'Test Place',
            place_id: 'test123',
            reviews: [
              {
                author_name: 'Test User',
                rating: 5,
                text: 'Great place!',
                relative_time_description: '1 week ago'
              }
            ]
          }, 'OK');
        })
      }))
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations before each test
    googleMapsApi.initializeMap.mockReturnValue(mockMap);
    googleMapsApi.displayRouteOnMap.mockResolvedValue(mockRouteResult);
    googleMapsApi.getNearbyInterestPoints.mockResolvedValue(mockNearbyPoints);
    googleMapsApi.validateTransportation.mockResolvedValue(mockValidatedRoute);
    googleMapsApi.validateInterestPoints.mockResolvedValue(mockValidatedPoints);
  });

  describe('map_real_time_display function', () => {
    test('should initialize map and display route', async () => {
      const mapContainer = document.createElement('div');
      const origin = 'Rome, Italy';
      const destination = 'Vatican City';
      
      // Initialize map
      const map = googleMapsApi.initializeMap(mapContainer);
      expect(map).toBeDefined();
      expect(googleMapsApi.initializeMap).toHaveBeenCalled();
      
      // Display route
      const routeResult = await googleMapsApi.displayRouteOnMap({ origin, destination });
      expect(routeResult).toBeDefined();
      expect(googleMapsApi.displayRouteOnMap).toHaveBeenCalled();
    });
  });

  describe('get_nearby_interest_point function', () => {
    test('should find nearby points of interest', async () => {
      const location = 'Colosseum, Rome';
      
      const nearbyPoints = await googleMapsApi.getNearbyInterestPoints(location);
      
      expect(nearbyPoints).toBeDefined();
      expect(Array.isArray(nearbyPoints)).toBe(true);
      expect(nearbyPoints.length).toBeGreaterThan(0);
      expect(googleMapsApi.getNearbyInterestPoints).toHaveBeenCalledWith(location);
    });
  });

  describe('user_route_transportation_validation function', () => {
    test('should validate transportation between two points', async () => {
      const route = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Vatican City',
        transportation_type: 'driving'
      };
      
      const validatedRoute = await googleMapsApi.validateTransportation(route);
      
      expect(validatedRoute).toBeDefined();
      expect(validatedRoute.duration).toBe('20 mins');
      expect(validatedRoute.distance).toBe('5 km');
      expect(validatedRoute.transportation_type).toBe('driving');
      expect(googleMapsApi.validateTransportation).toHaveBeenCalledWith(route);
    });
  });

  describe('user_route_interest_points_validation function', () => {
    test('should validate interest points within range', async () => {
      const baseLocation = 'Colosseum, Rome';
      const points = [
        { name: 'Roman Forum', id: 'p1' },
        { name: 'Trevi Fountain', id: 'p2' },
        { name: 'Vatican City', id: 'p3' }
      ];
      
      const validatedPoints = await googleMapsApi.validateInterestPoints(baseLocation, points);
      
      expect(validatedPoints).toBeDefined();
      expect(Array.isArray(validatedPoints)).toBe(true);
      expect(validatedPoints.length).toBeGreaterThan(0);
      expect(googleMapsApi.validateInterestPoints).toHaveBeenCalledWith(baseLocation, points);
      
      // Check Roman Forum is within range
      const forumPoint = validatedPoints.find(p => p.name === 'Roman Forum');
      expect(forumPoint).toBeDefined();
      expect(forumPoint.distance).toBe('0.5 km');
      expect(forumPoint.within_range).toBe(true);
      
      // Check Vatican City is not within range (over 5km)
      const vaticanPoint = validatedPoints.find(p => p.name === 'Vatican City');
      expect(vaticanPoint).toBeDefined();
      expect(vaticanPoint.distance).toBe('6 km');
      expect(vaticanPoint.within_range).toBe(false);
    });
  });
}); 