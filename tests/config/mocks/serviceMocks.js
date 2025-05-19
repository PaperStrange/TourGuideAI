/**
 * Standard Service Mocks
 * 
 * This file contains standardized mock implementations for commonly used services.
 * Using these consistent mocks across tests helps maintain test reliability.
 */

// Route Generation Service Mocks
const mockRouteGenerationService = {
  analyzeUserQuery: jest.fn().mockResolvedValue({
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
  }),
  
  generateRouteFromQuery: jest.fn().mockResolvedValue({
    id: 'route_123',
    route_name: 'Paris Family Adventure',
    destination: 'Paris, France',
    duration: '3',
    overview: 'A wonderful family trip to Paris',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre Dame Cathedral'],
    daily_itinerary: [
      {
        day_title: 'Exploring Iconic Landmarks',
        description: 'Visit the most famous sites in Paris',
        day_number: 1,
        activities: [
          { id: 'act1', name: 'Eiffel Tower', description: 'Visit early to avoid crowds', time: '9:00 AM' },
          { id: 'act2', name: 'Louvre Museum', description: 'Home to the Mona Lisa', time: '2:00 PM' }
        ]
      }
    ]
  }),
  
  generateRandomRoute: jest.fn().mockResolvedValue({
    id: 'route_random',
    route_name: 'Random Destination Adventure',
    destination: 'Random City, Country',
    duration: '5',
    overview: 'A randomly generated trip'
  }),
  
  optimizeItinerary: jest.fn().mockImplementation(route => {
    return {
      ...route,
      optimized: true
    };
  })
};

// Route Management Service Mocks
const mockRouteManagementService = {
  getRouteById: jest.fn().mockResolvedValue({
    id: 'route_123',
    route_name: 'Paris Family Adventure',
    destination: 'Paris, France'
  }),
  
  getUserRoutes: jest.fn().mockResolvedValue([
    {
      id: 'route_123',
      route_name: 'Paris Family Adventure',
      destination: 'Paris, France'
    },
    {
      id: 'route_456',
      route_name: 'Tokyo Exploration',
      destination: 'Tokyo, Japan'
    }
  ]),
  
  saveRoute: jest.fn().mockImplementation(route => {
    return Promise.resolve({
      ...route,
      id: route.id || 'new_route_id'
    });
  }),
  
  updateRoute: jest.fn().mockResolvedValue({ success: true }),
  
  getFavoriteRoutes: jest.fn().mockResolvedValue([
    {
      id: 'route_456',
      route_name: 'Tokyo Exploration',
      destination: 'Tokyo, Japan',
      is_favorite: true
    }
  ]),
  
  addToFavorites: jest.fn().mockResolvedValue({ success: true }),
  removeFromFavorites: jest.fn().mockResolvedValue({ success: true }),
  deleteRoute: jest.fn().mockResolvedValue({ success: true }),
  duplicateRoute: jest.fn().mockResolvedValue({ id: 'duplicated_route_id' }),
  shareRoute: jest.fn().mockResolvedValue({ shareUrl: 'https://example.com/share/route_123' })
};

// Auth Service Mocks
const mockAuthService = {
  login: jest.fn().mockResolvedValue({
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com'
    },
    token: 'mock-jwt-token'
  }),
  
  logout: jest.fn().mockResolvedValue({ success: true }),
  
  register: jest.fn().mockResolvedValue({
    user: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com'
    },
    token: 'mock-jwt-token'
  }),
  
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com'
  }),
  
  isAuthenticated: jest.fn().mockReturnValue(true)
};

// User Profile Service Mocks
const mockUserProfileService = {
  getUserProfile: jest.fn().mockResolvedValue({
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true
    }
  }),
  
  updateUserProfile: jest.fn().mockResolvedValue({ success: true }),
  
  getUserStats: jest.fn().mockResolvedValue({
    routesCreated: 5,
    favoriteRoutes: 2,
    lastLoginDate: '2023-05-15T10:30:00Z'
  })
};

// API Client Mocks
const mockApiClient = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} })
};

module.exports = {
  mockRouteGenerationService,
  mockRouteManagementService,
  mockAuthService,
  mockUserProfileService,
  mockApiClient
}; 