/**
 * Database Schema Validation Tests
 * 
 * This file contains tests for validating database schema models,
 * ensuring that schema validation, default values, and relationships
 * work as expected.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RouteModel } = require('../models/RouteModel');

// Increase timeout for MongoDB operations
jest.setTimeout(30000);

describe('Database Schema Validation', () => {
  let mongoServer;

  // Setup in-memory MongoDB server
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clean up after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear test database between tests
  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('RouteModel Schema', () => {
    test('should require all required fields', async () => {
      // Try to create without required fields
      const emptyRoute = new RouteModel({});
      
      // Validate and expect errors
      let validationError;
      try {
        await emptyRoute.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.errors.route_name).toBeDefined();
      expect(validationError.errors.destination).toBeDefined();
      expect(validationError.errors.duration).toBeDefined();
      expect(validationError.errors.overview).toBeDefined();
    });

    test('should set default values correctly', async () => {
      // Create with minimal required fields
      const minimalRoute = new RouteModel({
        route_name: 'Test Route',
        destination: 'Test Destination',
        duration: '3 days',
        overview: 'Test Overview',
        daily_itinerary: [{
          day_title: 'Day 1',
          activities: [{
            name: 'Test Activity'
          }]
        }]
      });

      // Check default values
      expect(minimalRoute.is_public).toBe(false);
      expect(minimalRoute.is_deleted).toBe(false);
      expect(minimalRoute.is_favorite).toBe(false);
      expect(minimalRoute.creation_date).toBeInstanceOf(Date);
      expect(minimalRoute.last_modified).toBeInstanceOf(Date);
    });

    test('should validate nested schema elements', async () => {
      // Create route with invalid nested data
      const routeWithInvalidNested = new RouteModel({
        route_name: 'Test Route',
        destination: 'Test Destination',
        duration: '3 days',
        overview: 'Test Overview',
        daily_itinerary: [{
          // Missing required day_title
          activities: [{
            // Missing required name
            description: 'Test description'
          }]
        }]
      });
      
      // Validate and expect errors
      let validationError;
      try {
        await routeWithInvalidNested.validate();
      } catch (error) {
        validationError = error;
      }
      
      expect(validationError).toBeDefined();
      expect(validationError.errors['daily_itinerary.0.day_title']).toBeDefined();
      expect(validationError.errors['daily_itinerary.0.activities.0.name']).toBeDefined();
    });

    test('should successfully create a valid route', async () => {
      // Create valid route
      const validRoute = {
        route_name: 'Paris Adventure',
        destination: 'Paris, France',
        duration: '5 days',
        overview: 'Exploring the city of lights',
        highlights: ['Eiffel Tower', 'Louvre', 'Notre Dame'],
        daily_itinerary: [
          {
            day_title: 'Day 1: Arrival and Eiffel Tower',
            description: 'Arrive in Paris and visit the Eiffel Tower',
            activities: [
              {
                name: 'Check-in at hotel',
                description: 'Check into your hotel in the heart of Paris',
                time: '14:00',
                location: {
                  lat: 48.8566,
                  lng: 2.3522,
                  address: 'Paris, France'
                }
              },
              {
                name: 'Eiffel Tower',
                description: 'Visit the iconic Eiffel Tower',
                time: '18:00',
                location: {
                  lat: 48.8584,
                  lng: 2.2945,
                  address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris'
                }
              }
            ]
          }
        ],
        estimated_costs: new Map([
          ['accommodation', '€150 per night'],
          ['food', '€50 per day'],
          ['activities', '€100 total']
        ]),
        tags: ['romantic', 'cultural', 'sightseeing']
      };
      
      const createdRoute = await RouteModel.create(validRoute);
      
      // Check if created successfully
      expect(createdRoute._id).toBeDefined();
      expect(createdRoute.route_name).toBe('Paris Adventure');
      expect(createdRoute.destination).toBe('Paris, France');
      expect(createdRoute.daily_itinerary[0].activities.length).toBe(2);
      expect(createdRoute.tags).toContain('romantic');
      expect(createdRoute.estimated_costs.get('accommodation')).toBe('€150 per night');
    });
  });

  describe('RouteModel Static Methods', () => {
    let testRouteId;
    let userId = new mongoose.Types.ObjectId();
    
    // Create a test route before tests
    beforeEach(async () => {
      const testRoute = await RouteModel.create({
        route_name: 'Test Route',
        creator: userId,
        destination: 'Test Destination',
        duration: '3 days',
        overview: 'Test Overview',
        daily_itinerary: [{
          day_title: 'Day 1',
          activities: [{
            name: 'Test Activity'
          }]
        }]
      });
      testRouteId = testRoute._id;
    });
    
    test('findById should return route by ID', async () => {
      const route = await RouteModel.findById(testRouteId);
      expect(route).toBeDefined();
      expect(route.route_name).toBe('Test Route');
    });
    
    test('findById should not return deleted routes', async () => {
      // Mark as deleted
      await RouteModel.findOneAndUpdate(
        { _id: testRouteId },
        { is_deleted: true }
      );
      
      const route = await RouteModel.findById(testRouteId);
      expect(route).toBeNull();
    });
    
    test('findByCreator should return routes by creator ID', async () => {
      const routes = await RouteModel.findByCreator(userId);
      expect(routes.length).toBe(1);
      expect(routes[0].route_name).toBe('Test Route');
    });
    
    test('softDelete should mark route as deleted', async () => {
      await RouteModel.softDelete(testRouteId);
      
      // Verify it's marked as deleted
      const route = await RouteModel.findOne({ _id: testRouteId });
      expect(route.is_deleted).toBe(true);
      
      // Verify it doesn't show up in normal queries
      const notFound = await RouteModel.findById(testRouteId);
      expect(notFound).toBeNull();
    });
  });
}); 