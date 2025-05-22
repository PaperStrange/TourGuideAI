import * as googleMapsApi from '../../api/googleMapsApi';

// Mock the global window object for Google Maps API script
global.window = Object.assign(global.window || {}, {
  google: null
});

describe('Google Maps API', () => {
  let mapInstance;

  // Setup Google maps API mock
  beforeEach(() => {
    // Create a map instance mock
    mapInstance = {};
    
    // Mock the global google object 
    global.google = {
      maps: {
        Map: jest.fn().mockImplementation(() => mapInstance),
        Marker: jest.fn().mockImplementation(() => ({
          setMap: jest.fn()
        })),
        DirectionsService: jest.fn().mockImplementation(() => ({
          route: jest.fn((params, callback) => {
            callback({
              routes: [{
                summary: 'Test Route',
                bounds: {
                  getNortheast: () => ({ toJSON: () => ({ lat: 42.0, lng: 12.6 }) }),
                  getSouthwest: () => ({ toJSON: () => ({ lat: 41.8, lng: 12.4 }) })
                },
                legs: [{
                  start_address: 'Rome, Italy',
                  end_address: 'Vatican City',
                  distance: { text: '5 km', value: 5000 },
                  duration: { text: '20 mins', value: 1200 },
                  steps: [{
                    instructions: 'Go straight',
                    distance: { text: '5 km', value: 5000 },
                    duration: { text: '20 mins', value: 1200 },
                    travel_mode: 'DRIVING'
                  }]
                }],
                overview_polyline: 'test_polyline',
                warnings: []
              }]
            }, 'OK');
          })
        })),
        DirectionsRenderer: jest.fn().mockImplementation(() => ({
          setMap: jest.fn(),
          setDirections: jest.fn()
        })),
        LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat, lng })),
        Geocoder: jest.fn().mockImplementation(() => ({
          geocode: jest.fn((params, callback) => {
            callback([{ 
              geometry: { 
                location: { 
                  lat: () => 41.9, 
                  lng: () => 12.5,
                  toJSON: () => ({ lat: 41.9, lng: 12.5 })
                } 
              },
              formatted_address: 'Rome, Italy',
              place_id: 'test_place_rome'
            }], 'OK');
          })
        })),
        places: {
          PlacesService: jest.fn().mockImplementation(() => ({
            nearbySearch: jest.fn((params, callback) => {
              callback([
                { 
                  name: 'Test Place', 
                  place_id: 'test123',
                  vicinity: 'Test Address',
                  rating: 4.5,
                  user_ratings_total: 100,
                  types: ['tourist_attraction'],
                  geometry: { 
                    location: { 
                      lat: () => 41.9, 
                      lng: () => 12.5 
                    } 
                  },
                  photos: [{
                    getUrl: () => 'test_photo_url',
                    height: 500,
                    width: 500,
                    html_attributions: ['test']
                  }]
                }
              ], 'OK');
            }),
            getDetails: jest.fn((params, callback) => {
              callback({
                place_id: params.placeId,
                name: 'Test Place Detail',
                formatted_address: 'Test Address, Test City',
                geometry: {
                  location: { lat: () => 41.9, lng: () => 12.5 }
                },
                rating: 4.5,
                website: 'https://test-place.com',
                opening_hours: {
                  weekday_text: ['Monday: 9:00 AM – 5:00 PM', 'Tuesday: 9:00 AM – 5:00 PM']
                }
              }, 'OK');
            })
          })),
          PlacesServiceStatus: {
            OK: 'OK',
            ZERO_RESULTS: 'ZERO_RESULTS',
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
          }
        },
        MapTypeId: {
          ROADMAP: 'roadmap',
          SATELLITE: 'satellite',
          HYBRID: 'hybrid',
          TERRAIN: 'terrain'
        },
        TravelMode: {
          DRIVING: 'DRIVING',
          WALKING: 'WALKING',
          BICYCLING: 'BICYCLING',
          TRANSIT: 'TRANSIT'
        },
        UnitSystem: {
          METRIC: 'METRIC',
          IMPERIAL: 'IMPERIAL'
        },
        DirectionsStatus: {
          OK: 'OK',
          NOT_FOUND: 'NOT_FOUND',
          ZERO_RESULTS: 'ZERO_RESULTS',
          UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        },
        GeocoderStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
          OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
          REQUEST_DENIED: 'REQUEST_DENIED',
          INVALID_REQUEST: 'INVALID_REQUEST',
          UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        },
        DistanceMatrixService: jest.fn().mockImplementation(() => ({
          getDistanceMatrix: jest.fn((params, callback) => {
            callback({
              rows: [{
                elements: params.destinations.map(() => ({
                  status: 'OK',
                  distance: { text: '5 km', value: 5000 },
                  duration: { text: '15 mins', value: 900 }
                }))
              }],
              originAddresses: params.origins,
              destinationAddresses: params.destinations
            }, 'OK');
          })
        })),
        DistanceMatrixStatus: {
          OK: 'OK',
          ZERO_RESULTS: 'ZERO_RESULTS',
          UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        }
      }
    };

    // Set API key and initialize map
    googleMapsApi.setApiKey('test-api-key');
    // Initialize a map instance for tests that need it
    googleMapsApi.initializeMap(document.createElement('div'));
  });

  afterEach(() => {
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
      expect(result.location).toBeDefined();
    });
  });

  describe('Route Display', () => {
    test('should display route on map', async () => {
      const routeData = {
        origin: 'Rome, Italy',
        destination: 'Vatican City',
        travelMode: 'DRIVING'
      };
      
      const result = await googleMapsApi.displayRouteOnMap(routeData);
      
      expect(result).toBeDefined();
      expect(google.maps.DirectionsService).toHaveBeenCalled();
      expect(google.maps.DirectionsRenderer).toHaveBeenCalled();
    });
  });

  describe('Points of Interest', () => {
    test('should get nearby interest points', async () => {
      const location = { lat: 41.9, lng: 12.5 };
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
      expect(result.duration).toBeDefined();
      expect(result.distance).toBeDefined();
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
      expect(result.sites).toBeDefined();
    });
  });
}); 