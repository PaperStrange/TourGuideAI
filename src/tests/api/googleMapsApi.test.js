import * as googleMapsApi from '../../api/googleMapsApi';

describe('Google Maps API', () => {
  // Mock the global google object
  global.google = {
    maps: {
      Map: jest.fn().mockImplementation(() => ({})),
      Marker: jest.fn().mockImplementation(() => ({
        setMap: jest.fn()
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
              geometry: { location: { lat: 41.9, lng: 12.5 } }
            }
          ], 'OK');
        })
      }))
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Configuration', () => {
    test('should set and get API key', () => {
      const testKey = 'test-api-key';
      const result = googleMapsApi.setApiKey(testKey);
      expect(result).toBe(true);
      
      const status = googleMapsApi.getStatus();
      expect(status.isConfigured).toBe(true);
    });

    test('should reject invalid API key', () => {
      expect(() => googleMapsApi.setApiKey('')).toThrow();
      expect(() => googleMapsApi.setApiKey(null)).toThrow();
      expect(() => googleMapsApi.setApiKey(123)).toThrow();
    });

    test('should set debug mode', () => {
      googleMapsApi.setDebugMode(true);
      const status = googleMapsApi.getStatus();
      expect(status.debug).toBe(true);
      
      googleMapsApi.setDebugMode(false);
      const updatedStatus = googleMapsApi.getStatus();
      expect(updatedStatus.debug).toBe(false);
    });
  });

  describe('Map Initialization', () => {
    test('should initialize map', () => {
      const mapContainer = document.createElement('div');
      const map = googleMapsApi.initializeMap(mapContainer);
      
      expect(map).toBeDefined();
      expect(google.maps.Map).toHaveBeenCalled();
    });
  });

  describe('Geocoding', () => {
    test('should geocode address', async () => {
      const address = 'Rome, Italy';
      const result = await googleMapsApi.geocodeAddress(address);
      
      expect(result).toBeDefined();
      expect(result.lat).toBeCloseTo(41.9);
      expect(result.lng).toBeCloseTo(12.5);
    });
  });

  describe('Route Display', () => {
    test('should display route on map', async () => {
      const map = {};
      const origin = 'Rome, Italy';
      const destination = 'Vatican City';
      const result = await googleMapsApi.displayRouteOnMap(map, origin, destination);
      
      expect(result).toBeDefined();
      expect(google.maps.DirectionsService).toHaveBeenCalled();
      expect(google.maps.DirectionsRenderer).toHaveBeenCalled();
    });
  });

  describe('Points of Interest', () => {
    test('should get nearby interest points', async () => {
      const location = 'Colosseum, Rome';
      const result = await googleMapsApi.getNearbyInterestPoints(location);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Transportation Validation', () => {
    test('should validate transportation', async () => {
      const routeToValidate = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Vatican City',
        transportation_type: 'driving'
      };
      
      const result = await googleMapsApi.validateTransportation(routeToValidate);
      
      expect(result).toBeDefined();
      expect(result.duration).toBe('20 mins');
      expect(result.distance).toBe('5 km');
    });
  });

  describe('Interest Points Validation', () => {
    test('should validate interest points', async () => {
      const baseLocation = 'Colosseum, Rome';
      const pointsToValidate = [
        { name: 'Roman Forum', id: 'p1' },
        { name: 'Trevi Fountain', id: 'p2' }
      ];
      
      const result = await googleMapsApi.validateInterestPoints(baseLocation, pointsToValidate);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Route Statistics', () => {
    test('should calculate route statistics', async () => {
      const route = {
        route_duration: '3 days',
        places: ['place1', 'place2'],
        sites_included_in_routes: ['Colosseum', 'Vatican']
      };
      
      const result = await googleMapsApi.calculateRouteStatistics(route);
      
      expect(result).toBeDefined();
      expect(result.sites).toBe(2);
      expect(result.duration).toBe('3 days');
      expect(result.cost).toBeDefined();
    });
  });
}); 