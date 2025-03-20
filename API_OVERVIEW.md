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