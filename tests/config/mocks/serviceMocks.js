/**
 * Standard Service Mocks
 * 
 * This file contains standardized mock implementations for commonly used services.
 * Using these consistent mocks across tests helps maintain test reliability.
 */

/**
 * Service mocks for testing
 */

// Mock Route Generation Service
export const mockRouteGenerationService = {
  generateRoute: jest.fn().mockResolvedValue({
    success: true,
    route: {
      id: 'route123',
      destination: 'Washington DC',
      duration: 3,
      route_name: 'Historical DC Tour',
      activities: [
        {
          name: 'Smithsonian National Museum of Natural History',
          description: 'Famous natural history museum',
          duration: 2,
          category: 'museum'
        }
      ]
    }
  }),
  
  validateDestination: jest.fn().mockResolvedValue({
    valid: true,
    coordinates: { lat: 38.9072, lng: -77.0369 }
  }),
  
  getRoutePreview: jest.fn().mockResolvedValue({
    preview: 'Generated route preview',
    estimatedDuration: 3
  })
};

// Mock Route Management Service
export const mockRouteManagementService = {
  saveRoute: jest.fn().mockResolvedValue({
    success: true,
    routeId: 'route123'
  }),
  
  getRoutes: jest.fn().mockResolvedValue([
    {
      id: 'route123',
      route_name: 'Historical DC Tour',
      destination: 'Washington DC',
      duration: 3,
      created_at: '2024-01-01',
      is_favorite: false
    }
  ]),
  
  updateRoute: jest.fn().mockResolvedValue({
    success: true
  }),
  
  deleteRoute: jest.fn().mockResolvedValue({
    success: true
  }),
  
  toggleFavorite: jest.fn().mockResolvedValue({
    success: true,
    is_favorite: true
  })
};

// Mock Analytics Service
export const mockAnalyticsService = {
  getUserActivityData: jest.fn().mockResolvedValue([
    { date: '2024-01-01', activity: 10 },
    { date: '2024-01-02', activity: 15 }
  ]),
  
  getFeatureUsageData: jest.fn().mockResolvedValue([
    { feature: 'route_generation', usage: 25 },
    { feature: 'map_view', usage: 40 }
  ]),
  
  getDeviceDistributionData: jest.fn().mockResolvedValue([
    { device: 'desktop', count: 60 },
    { device: 'mobile', count: 40 }
  ]),
  
  getHeatmapPagesList: jest.fn().mockResolvedValue([
    '/chat',
    '/map',
    '/profile'
  ])
};

// Mock API Status Service
export const mockApiStatusService = {
  checkStatus: jest.fn().mockResolvedValue({
    openai: { status: 'operational', latency: 150 },
    google_maps: { status: 'operational', latency: 80 },
    database: { status: 'operational', latency: 20 }
  }),
  
  getDetailedStatus: jest.fn().mockResolvedValue({
    overall: 'operational',
    services: {
      openai: { status: 'operational', response_time: 150 },
      google_maps: { status: 'operational', response_time: 80 },
      database: { status: 'operational', response_time: 20 }
    }
  })
};

// Mock Storage Services
export const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(true),
  has: jest.fn().mockResolvedValue(false)
};

export const mockLocalStorageService = {
  getData: jest.fn().mockReturnValue(null),
  setData: jest.fn().mockReturnValue(true),
  removeData: jest.fn().mockReturnValue(true),
  clearAllData: jest.fn().mockReturnValue(true),
  getStorageUsage: jest.fn().mockReturnValue({ used: 0, available: 1000000 })
};

export const mockSyncService = {
  syncToServer: jest.fn().mockResolvedValue({ success: true }),
  syncFromServer: jest.fn().mockResolvedValue({ success: true }),
  getLastSyncTime: jest.fn().mockReturnValue(new Date().toISOString()),
  setSyncEnabled: jest.fn().mockReturnValue(true),
  isSyncEnabled: jest.fn().mockReturnValue(true)
};

// Mock Authentication Service
export const mockAuthService = {
  login: jest.fn().mockResolvedValue({
    success: true,
    token: 'mock-jwt-token',
    user: { id: 1, name: 'Test User', email: 'test@example.com' }
  }),
  
  register: jest.fn().mockResolvedValue({
    success: true,
    message: 'Registration successful'
  }),
  
  logout: jest.fn().mockResolvedValue({
    success: true
  }),
  
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test User',
    email: 'test@example.com'
  }),
  
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    user: { id: 1, name: 'Test User', email: 'test@example.com' }
  })
};

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