/**
 * Mock API Responses for Integration Tests
 * 
 * This file provides standardized mock API responses for integration tests.
 */

const mockRouteGenerationResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    id: 'mock-route-123',
    title: 'Paris Family Adventure',
    destination: 'Paris, France',
    duration: 3,
    stops: [
      {
        id: 'stop-1',
        name: 'Eiffel Tower',
        location: { lat: 48.8584, lng: 2.2945 },
        description: 'Iconic wrought-iron tower with observation decks',
        visitDuration: 120,
        openingHours: '9:00 AM - 11:45 PM',
        dayIndex: 0,
        timeSlot: '10:00 AM'
      },
      {
        id: 'stop-2',
        name: 'Louvre Museum',
        location: { lat: 48.8606, lng: 2.3376 },
        description: 'World-famous art museum home to the Mona Lisa',
        visitDuration: 180,
        openingHours: '9:00 AM - 6:00 PM',
        dayIndex: 0,
        timeSlot: '2:00 PM'
      },
      {
        id: 'stop-3',
        name: 'Notre-Dame Cathedral',
        location: { lat: 48.8530, lng: 2.3499 },
        description: 'Medieval Catholic cathedral',
        visitDuration: 90,
        openingHours: '7:45 AM - 6:45 PM',
        dayIndex: 1,
        timeSlot: '9:00 AM'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

const mockRouteAnalysisResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    query: 'I want to visit Paris for 3 days with my family',
    intents: {
      destination: 'Paris, France',
      duration: 3,
      travelers: {
        count: 4,
        includesChildren: true,
        type: 'family'
      },
      interests: ['sightseeing', 'family-friendly', 'cultural'],
      budget: 'medium',
      activityLevel: 'moderate'
    },
    confidence: 0.89,
    suggestedTags: ['paris', 'family', 'cultural', '3-day-trip']
  }
};

const mockUserProfileResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      favoriteCities: ['Paris', 'London', 'Rome'],
      interests: ['history', 'food', 'museums'],
      travelStyle: 'family'
    },
    savedRoutes: ['route-id-1', 'route-id-2'],
    favoriteRoutes: ['route-id-1'],
    settings: {
      units: 'metric',
      language: 'en',
      currency: 'USD',
      notifications: {
        email: true,
        push: false
      }
    },
    subscription: {
      plan: 'premium',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
};

const mockSaveRouteResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    success: true,
    routeId: 'mock-route-123',
    message: 'Route saved successfully'
  }
};

const mockErrorResponse = {
  status: 500,
  contentType: 'application/json',
  body: {
    error: 'Internal server error',
    message: 'Something went wrong',
    code: 'SERVER_ERROR'
  }
};

const mockAuthError = {
  status: 401,
  contentType: 'application/json',
  body: {
    error: 'Unauthorized',
    message: 'You need to be logged in to access this resource',
    code: 'UNAUTHORIZED'
  }
};

// New mock responses for user journey tests
const mockQuickGenerateResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    id: 'quick-route-123',
    title: 'Paris Business Trip',
    destination: 'Paris, France',
    duration: 2,
    stops: [
      {
        id: 'quick-stop-1',
        name: 'Louvre Museum',
        location: { lat: 48.8606, lng: 2.3376 },
        description: 'World-famous art museum home to the Mona Lisa',
        visitDuration: 120,
        openingHours: '9:00 AM - 6:00 PM',
        dayIndex: 0,
        timeSlot: '5:00 PM',
        category: 'cultural'
      },
      {
        id: 'quick-stop-2',
        name: 'Le Jules Verne',
        location: { lat: 48.8583, lng: 2.2944 },
        description: 'Fine dining restaurant in the Eiffel Tower',
        visitDuration: 120,
        openingHours: '6:00 PM - 10:00 PM',
        dayIndex: 0,
        timeSlot: '7:30 PM',
        category: 'dining'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

const mockSavedRoutesResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    routes: [
      {
        id: 'saved-route-1',
        title: 'Paris Family Adventure',
        destination: 'Paris, France',
        duration: 3,
        thumbnail: 'https://example.com/paris-thumbnail.jpg',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'saved-route-2',
        title: 'London Weekend',
        destination: 'London, United Kingdom',
        duration: 2,
        thumbnail: 'https://example.com/london-thumbnail.jpg',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    totalCount: 2
  }
};

const mockShareRouteResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    success: true,
    shareUrl: 'https://tourguideai.example.com/shared/route/abc123',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }
};

const mockExportResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    success: true,
    exportUrl: 'https://tourguideai.example.com/exports/route-123.pdf',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
};

const mockCalendarIntegrationResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    success: true,
    message: 'Added to calendar successfully',
    calendarEventId: 'cal-event-123'
  }
};

const mockAddFavoriteResponse = {
  status: 200,
  contentType: 'application/json',
  body: {
    success: true,
    routeId: 'mock-route-123',
    message: 'Route added to favorites'
  }
};

// Export all mock responses
module.exports = {
  // Route generation
  'api/route/generate': mockRouteGenerationResponse,
  'api/route/analyze': mockRouteAnalysisResponse,
  'api/route/save': mockSaveRouteResponse,
  
  // User profile
  'api/user/profile': mockUserProfileResponse,
  
  // Error responses
  'api/error': mockErrorResponse,
  'api/auth/error': mockAuthError,
  
  // User journey additional mocks
  'api/route/quickGenerate': mockQuickGenerateResponse,
  'api/user/saved-routes': mockSavedRoutesResponse,
  'api/route/share': mockShareRouteResponse,
  'api/route/export': mockExportResponse,
  'api/calendar/add': mockCalendarIntegrationResponse,
  'api/route/favorite': mockAddFavoriteResponse
}; 