# TourGuideAI API Overview

This document provides a comprehensive overview of all APIs used in the TourGuideAI application, including external APIs, internal architecture, and usage examples.

## External APIs

### OpenAI API

The OpenAI API is used for natural language processing and content generation tasks within TourGuideAI:

- **Purpose**: Generate travel itineraries, recognize travel intent from user queries, create travel recommendations
- **API Version**: GPT-4 / GPT-3.5-turbo
- **Endpoints Used**:
  - Completions API - For general text generation
  - Chat Completions API - For conversation-based interactions
- **Configuration**: Requires API key set in `.env` file as `REACT_APP_OPENAI_API_KEY`
- **Caching Strategy**: Stale-while-revalidate with 24-hour TTL, LZ-string compression for responses

### Google Maps Platform APIs

The Google Maps Platform provides a suite of APIs used for location-based features:

- **Purpose**: Display maps, search locations, calculate routes, find nearby attractions
- **API Services Used**:
  - Maps JavaScript API - For map rendering and interaction
  - Places API - For location search and points of interest
  - Directions API - For route calculation
  - Geocoding API - For converting addresses to coordinates
- **Configuration**: Requires API key set in `.env` file as `REACT_APP_GOOGLE_MAPS_API_KEY`

## API Client Architecture

TourGuideAI uses a structured approach to API integration:

```
src/
├── core/
│   ├── api/
│   │   ├── googleMapsApi.js   # Core Google Maps integration
│   │   ├── openaiApi.js       # Core OpenAI integration
│   │   └── index.js           # API exports
│   └── services/
│       └── apiClient.js       # Common API client with caching
└── api/
    ├── googleMapsApi.js       # Legacy (redirects to core)
    └── openaiApi.js           # Legacy (redirects to core)
```

- **Core API Modules**: Primary implementations with full functionality
- **Legacy API Modules**: Compatibility layer that re-exports from core modules
- **Server Proxy**: For secure API key management, requests can be proxied through backend

## OpenAI API Integration

### Key Features

- **Intent Recognition**: Extract travel preferences from natural language
- **Route Generation**: Create complete travel itineraries based on user input
- **Accommodation Recommendations**: Suggest lodging options based on preferences
- **Travel Tips**: Generate location-specific advice for travelers

### Usage Example

```javascript
import * as openaiApi from '../core/api/openaiApi';

// Initialize the API (only needed once, typically in app initialization)
openaiApi.setApiKey(process.env.REACT_APP_OPENAI_API_KEY);
openaiApi.setUseServerProxy(true); // Use server proxy for security

// Recognize travel intent from user query
const intent = await openaiApi.recognizeTextIntent(
  "I want to visit Paris for 3 days next month and focus on art museums"
);
// Result: { arrival: "Paris", travel_duration: "3 days", ... }

// Generate a complete travel route
const route = await openaiApi.generateRoute(
  "Plan a trip to Paris focusing on art museums",
  intent
);
// Result: { route_name: "Paris Art Tour", destination: "Paris", ... }
```

### Error Handling

```javascript
try {
  const route = await openaiApi.generateRoute(userQuery, intent);
  // Process successful response
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
  } else if (error.status === 401) {
    // Handle authentication error
  } else {
    // Handle other errors
  }
}
```

## Google Maps API Integration

### Key Features

- **Map Rendering**: Display interactive maps with custom markers and overlays
- **Geocoding**: Convert addresses to coordinates and vice versa
- **Route Display**: Visualize travel routes with directions
- **Points of Interest**: Find attractions near specified locations
- **Place Details**: Get comprehensive information about locations

### Usage Example

```javascript
import * as googleMapsApi from '../core/api/googleMapsApi';

// Initialize the API (only needed once, typically in app initialization)
googleMapsApi.setApiKey(process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
googleMapsApi.setUseServerProxy(true); // Use server proxy for security

// Initialize a map in a container element
const mapContainer = document.getElementById('map-container');
const map = await googleMapsApi.initializeMap(mapContainer, {
  center: { lat: 48.8566, lng: 2.3522 }, // Paris
  zoom: 12
});

// Geocode an address to coordinates
const location = await googleMapsApi.geocodeAddress("Eiffel Tower, Paris");
// Result: { location: { lat: 48.8584, lng: 2.2945 }, ... }

// Find nearby attractions
const attractions = await googleMapsApi.getNearbyInterestPoints(
  location.location,
  2000, // radius in meters
  'museum'
);

// Display a route on the map
const routeData = await googleMapsApi.displayRouteOnMap({
  origin: "Louvre Museum, Paris",
  destination: "Eiffel Tower, Paris",
  travelMode: "WALKING"
});
```

## API Client Service

The API client service provides a unified interface for all API calls with advanced features:

### Key Features

- **Caching**: Automatically caches responses for improved performance
- **Retry Logic**: Automatically retries failed requests with exponential backoff
- **Offline Support**: Falls back to cached data when offline
- **Error Handling**: Consistent error formatting and logging

### Usage Example

```javascript
import { apiHelpers } from '../core/services/apiClient';

// Make GET request with automatic caching
const data = await apiHelpers.get('/maps/geocode', { 
  params: { address: 'Paris' }
});

// Make POST request
const result = await apiHelpers.post('/openai/generate-route', {
  query: "Plan a trip to Paris",
  preferences: { duration: "3 days" }
});

// Clear cache
await apiHelpers.clearCache();
```

## API Security

TourGuideAI implements several security measures for API usage:

1. **Server-Side Proxying**: API keys are stored only on the server
2. **Key Rotation**: Automatic monitoring of API key age with rotation reminders
3. **Rate Limiting**: Prevents API quota exhaustion
4. **Request Validation**: All inputs are validated before sending to external APIs

## Configuration

All API configuration is managed through environment variables:

```
# API Configuration
REACT_APP_OPENAI_API_KEY=your_openai_key_here
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key_here

# API Settings
REACT_APP_USE_SERVER_PROXY=true
REACT_APP_API_URL=http://localhost:3000/api

# OpenAI Settings
REACT_APP_OPENAI_MODEL=gpt-4
REACT_APP_OPENAI_TEMPERATURE=0.7

# Caching Settings
REACT_APP_API_CACHE_DURATION=3600000
```

See `.env.example` for a complete list of configuration options.

## Migration

If you're working with older code that imports APIs from the legacy paths, please update your imports to use the core implementations. See `API_MIGRATION.md` for detailed migration instructions.

## API Caching Architecture

TourGuideAI implements a comprehensive caching strategy to improve performance, reduce API costs, and enable offline capabilities:

### Cache Service

The core caching mechanism is provided by `CacheService` in `src/core/services/storage/CacheService.js`:

- **TTL-Based Caching**: All API responses are cached with configurable Time-To-Live values
- **Compression**: LZ-string compression reduces storage size by approximately 70%
- **Cache Invalidation**: Automatic invalidation based on TTL with background cleanup
- **Cache Prioritization**: Size-based priority system auto-cleans older items when storage limit is reached
- **API-Specific TTLs**: Different cache expiration times based on data volatility:
  - Travel routes: 7 days
  - Points of interest: 30 days
  - Location search: 60 days
  - User preferences: 1 day

### Service Worker Cache

A service worker in `public/service-worker.js` provides browser-level API caching:

- **Strategy**: Network-first with cache fallback for API requests
- **Offline Support**: Cached API responses are available when offline
- **Cache Control**: Separate cache storage from application data
- **Background Sync**: Pending operations are queued for execution when online

### Cache Prefetching

For common API requests, TourGuideAI implements prefetching to improve perceived performance:

- **Route Prefetching**: Likely next routes are prefetched when users are browsing related routes
- **Location Prefetching**: Nearby location data is prefetched when viewing a destination
- **Preload Strategy**: Low-priority background fetching during idle periods

## API Performance Optimizations

Phase 5 (completed March 23, 2023) introduced significant performance optimizations for API interactions:

### Request Batching

Multiple related API requests are now batched to reduce network overhead:

```javascript
// Instead of multiple separate calls
const batchedResults = await apiHelpers.batchRequests([
  { path: '/maps/geocode', params: { address: 'Paris' } },
  { path: '/maps/nearby', params: { location: 'Paris', type: 'museum' } },
  { path: '/maps/nearby', params: { location: 'Paris', type: 'restaurant' } }
]);
```

### Parallel Requests

Non-dependent requests are processed in parallel:

```javascript
const [weatherData, attractionsData] = await Promise.all([
  apiHelpers.get('/weather', { params: { location: 'Paris' } }),
  apiHelpers.get('/attractions', { params: { location: 'Paris' } })
]);
```

### Response Streaming

For large responses like route data, streaming is now supported:

```javascript
const routeStream = apiHelpers.getStream('/routes/generate', { 
  params: { destination: 'Paris', duration: 7 }
});

routeStream.on('data', (chunk) => {
  // Process partial route data as it arrives
  updateRouteDisplay(chunk);
});
```

### API Response Compression

All API responses now use enhanced compression techniques:

- **Network Compression**: gzip/brotli for transit compression
- **Storage Compression**: LZ-string for client-side storage
- **Payload Optimization**: Response filtering to remove unnecessary data

### Background Processing with Web Workers

CPU-intensive processing of API data is offloaded to web workers:

```javascript
const routeWorker = new Worker('/workers/route-processor.js');

routeWorker.onmessage = (event) => {
  const { processedRoute } = event.data;
  displayRoute(processedRoute);
};

routeWorker.postMessage({
  action: 'processRouteData',
  routeData: rawRouteData
});
```

## API Error Handling

### Retry Strategy

All API requests include robust error handling:

- **Exponential Backoff**: Automatic retry with increasing delays
- **Circuit Breaking**: Temporary disabling of failing endpoints
- **Fallback Mechanism**: Cached data served when APIs fail
- **Graceful Degradation**: Progressive reduction in functionality based on available data

### Error Reporting

- **Centralized Logging**: All API errors are logged to a central service
- **User Feedback**: Friendly error messages with actionable information
- **Silent Recovery**: Background retry attempts without disrupting user experience

## API Endpoints

The TourGuideAI API provides the following endpoints:

### Authentication (Beta Program)

#### `POST /api/auth/login`

Authenticate a beta user and get a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "beta-tester"
  }
}
```

#### `POST /api/auth/logout`

Logout and invalidate the JWT token.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### `GET /api/auth/me`

Get current authenticated user's information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "beta-tester",
    "betaAccess": true
  }
}
```

#### `POST /api/auth/register` (Admin only)

Register a new beta user (requires admin privileges).

**Headers:**
- `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "beta-tester"
}
```

**Response:**
```json
{
  "user": {
    "id": "xyz789",
    "email": "newuser@example.com",
    "role": "beta-tester",
    "betaAccess": true,
    "createdAt": "2023-06-01T12:00:00Z"
  }
}
```

### OpenAI API Endpoints

// ... existing code ... 