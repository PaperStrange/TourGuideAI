/**
 * Tests for map and location-based functions
 * 
 * This file includes tests for the API functions related to map display,
 * nearby points of interest, and transportation validation based on the 
 * testing-plan.md requirements.
 */

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
  });

  describe('map_real_time_display function', () => {
    test('should initialize map and display route', async () => {
      const mapContainer = document.createElement('div');
      const origin = 'Rome, Italy';
      const destination = 'Vatican City';
      
      // Initialize map
      const map = googleMapsApi.initializeMap(mapContainer);
      expect(map).toBeDefined();
      expect(global.google.maps.Map).toHaveBeenCalled();
      
      // Display route
      const routeResult = await googleMapsApi.displayRouteOnMap(map, origin, destination);
      expect(routeResult).toBeDefined();
      expect(global.google.maps.DirectionsService).toHaveBeenCalled();
      expect(global.google.maps.DirectionsRenderer).toHaveBeenCalled();
    });
  });

  describe('get_nearby_interest_point function', () => {
    test('should find nearby points of interest', async () => {
      const location = 'Colosseum, Rome';
      
      const nearbyPoints = await googleMapsApi.getNearbyInterestPoints(location);
      
      expect(nearbyPoints).toBeDefined();
      expect(Array.isArray(nearbyPoints)).toBe(true);
      expect(nearbyPoints.length).toBeGreaterThan(0);
      expect(nearbyPoints[0].name).toBe('Test Place');
      expect(nearbyPoints[0].place_id).toBe('test123');
    });
    
    test('should include place details in results', async () => {
      // Mock PlacesService to include additional details
      global.google.maps.PlacesService = jest.fn().mockImplementation(() => ({
        nearbySearch: jest.fn((params, callback) => {
          callback([
            { 
              name: 'Roman Forum', 
              place_id: 'forum123',
              vicinity: '1 Forum Way, Rome',
              geometry: { location: { lat: 41.89, lng: 12.48 } },
              rating: 4.8,
              user_ratings_total: 5000,
              types: ['tourist_attraction', 'point_of_interest']
            },
            { 
              name: 'Palatine Hill', 
              place_id: 'palatine123',
              vicinity: 'Palatine Hill, Rome',
              geometry: { location: { lat: 41.89, lng: 12.48 } },
              rating: 4.7,
              user_ratings_total: 4500,
              types: ['tourist_attraction', 'point_of_interest']
            }
          ], 'OK');
        }),
        getDetails: jest.fn((params, callback) => {
          const details = {
            name: params.placeId === 'forum123' ? 'Roman Forum' : 'Palatine Hill',
            place_id: params.placeId,
            formatted_address: 'Rome, Italy',
            international_phone_number: '+39 123456789',
            website: 'https://example.com',
            opening_hours: {
              weekday_text: [
                'Monday: 8:30 AM – 7:00 PM',
                'Tuesday: 8:30 AM – 7:00 PM'
              ],
              isOpen: () => true
            },
            reviews: [
              {
                author_name: 'Tourist One',
                rating: 5,
                text: 'Amazing historical site!',
                relative_time_description: '2 weeks ago'
              },
              {
                author_name: 'Tourist Two',
                rating: 4,
                text: 'Very interesting but crowded.',
                relative_time_description: '1 month ago'
              }
            ]
          };
          callback(details, 'OK');
        })
      }));
      
      const location = 'Colosseum, Rome';
      const radius = 500; // 500 meters
      
      const nearbyPoints = await googleMapsApi.getNearbyInterestPoints(location, radius);
      
      expect(nearbyPoints).toBeDefined();
      expect(nearbyPoints.length).toBe(2);
      expect(nearbyPoints[0].name).toBe('Roman Forum');
      expect(nearbyPoints[1].name).toBe('Palatine Hill');
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
    });
    
    test('should handle different transportation modes', async () => {
      // Mock different responses for different transport modes
      const mockDirectionsService = jest.fn((params, callback) => {
        let duration, distance;
        
        switch(params.travelMode) {
          case 'WALKING':
            duration = { text: '45 mins' };
            distance = { text: '3 km' };
            break;
          case 'TRANSIT':
            duration = { text: '25 mins' };
            distance = { text: '5 km' };
            break;
          case 'BICYCLING':
            duration = { text: '20 mins' };
            distance = { text: '4 km' };
            break;
          default: // DRIVING
            duration = { text: '15 mins' };
            distance = { text: '5 km' };
        }
        
        callback({
          status: 'OK',
          routes: [{
            legs: [{
              duration: duration,
              distance: distance
            }]
          }]
        });
      });
      
      global.google.maps.DirectionsService = jest.fn().mockImplementation(() => ({
        route: mockDirectionsService
      }));
      
      // Test walking
      const walkingRoute = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Roman Forum',
        transportation_type: 'walking'
      };
      
      const validatedWalkingRoute = await googleMapsApi.validateTransportation(walkingRoute);
      expect(validatedWalkingRoute.duration).toBe('45 mins');
      expect(validatedWalkingRoute.distance).toBe('3 km');
      expect(validatedWalkingRoute.transportation_type).toBe('walking');
      
      // Test transit
      const transitRoute = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Vatican City',
        transportation_type: 'transit'
      };
      
      const validatedTransitRoute = await googleMapsApi.validateTransportation(transitRoute);
      expect(validatedTransitRoute.duration).toBe('25 mins');
      expect(validatedTransitRoute.transportation_type).toBe('transit');
      
      // Test bicycling
      const bicyclingRoute = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Trevi Fountain',
        transportation_type: 'bicycling'
      };
      
      const validatedBicyclingRoute = await googleMapsApi.validateTransportation(bicyclingRoute);
      expect(validatedBicyclingRoute.duration).toBe('20 mins');
      expect(validatedBicyclingRoute.transportation_type).toBe('bicycling');
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
      
      // Mock the DirectionsService to give different distances
      global.google.maps.DirectionsService = jest.fn().mockImplementation(() => ({
        route: jest.fn((params, callback) => {
          let duration, distance;
          
          if (params.destination === 'Roman Forum') {
            duration = { text: '10 mins' };
            distance = { text: '0.5 km' };
          } else if (params.destination === 'Trevi Fountain') {
            duration = { text: '25 mins' };
            distance = { text: '2 km' };
          } else if (params.destination === 'Vatican City') {
            duration = { text: '45 mins' };
            distance = { text: '6 km' };
          }
          
          callback({
            status: 'OK',
            routes: [{
              legs: [{
                duration: duration,
                distance: distance
              }]
            }]
          });
        })
      }));
      
      const validatedPoints = await googleMapsApi.validateInterestPoints(baseLocation, points);
      
      expect(validatedPoints).toBeDefined();
      expect(Array.isArray(validatedPoints)).toBe(true);
      expect(validatedPoints.length).toBeGreaterThan(0);
      
      // Check Roman Forum is within range
      const forumPoint = validatedPoints.find(p => p.name === 'Roman Forum');
      expect(forumPoint).toBeDefined();
      expect(forumPoint.distance).toBe('0.5 km');
      expect(forumPoint.duration).toBe('10 mins');
      expect(forumPoint.within_range).toBe(true);
      
      // Check Trevi Fountain is within range
      const treviPoint = validatedPoints.find(p => p.name === 'Trevi Fountain');
      expect(treviPoint).toBeDefined();
      expect(treviPoint.distance).toBe('2 km');
      expect(treviPoint.within_range).toBe(true);
      
      // Check Vatican City is not within range (over 5km)
      const vaticanPoint = validatedPoints.find(p => p.name === 'Vatican City');
      expect(vaticanPoint).toBeDefined();
      expect(vaticanPoint.distance).toBe('6 km');
      expect(vaticanPoint.within_range).toBe(false);
    });
  });
}); 