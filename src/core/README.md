# Core Modules

This directory contains core functionality that is shared across different features of TourGuideAI.

## Structure

- `/api` - API client modules for external service integration
  - `googleMapsApi.js` - Google Maps Platform API integration
  - `openaiApi.js` - OpenAI API integration
- `/components` - Shared UI components
- `/services` - Service modules for business logic
  - `/storage` - Data persistence services
  - `apiClient.js` - Common API client service with caching and retry logic
- `/utils` - Utility functions and helpers

## API Module Usage

The API modules provide a consistent interface for external service integration:

### Google Maps API

```javascript
import * as googleMapsApi from '../core/api/googleMapsApi';

// Initialize API with key
googleMapsApi.setApiKey('your-api-key');

// Enable server proxy mode (recommended)
googleMapsApi.setUseServerProxy(true);

// Use various functions
const location = await googleMapsApi.geocodeAddress('New York, NY');
const places = await googleMapsApi.getNearbyInterestPoints(location, 1000, 'restaurant');
```

### OpenAI API

```javascript
import * as openaiApi from '../core/api/openaiApi';

// Initialize API with key (or use proxy server)
openaiApi.setApiKey('your-api-key');
openaiApi.setUseServerProxy(true);

// Generate travel routes
const intent = await openaiApi.recognizeTextIntent('I want to visit Paris next month');
const route = await openaiApi.generateRoute('Plan a trip to Paris focusing on art and cuisine');
```

### API Client Service

The API client service provides centralized functionality for making API requests:

```javascript
import { apiHelpers } from '../core/services/apiClient';

// Make requests using the client
const data = await apiHelpers.get('/endpoint', { param1: 'value' });
const result = await apiHelpers.post('/other-endpoint', { data: 'payload' });

// Clear API cache
await apiHelpers.clearCache();
```

## Migration

If you're working with older code that imports from `src/api/*` or `src/services/apiClient.js`, please update your imports to use these core modules instead. See the `API_MIGRATION.md` document for more details. 