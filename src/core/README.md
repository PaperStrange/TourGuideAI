# Core Modules

This directory contains core functionality that is shared across different features of TourGuideAI.

## Structure

- `/api` - API client modules for external service integration
  - `googleMapsApi.js` - Google Maps Platform API integration
  - `openaiApi.js` - OpenAI API integration
- `/components` - Shared UI components
- `/services` - Service modules for business logic
  - `/storage` - Data persistence services
    - `CacheService.js` - Enhanced caching with TTL and compression
    - `LocalStorageService.js` - Local storage management
    - `SyncService.js` - Data synchronization
  - `apiClient.js` - Common API client service with caching and retry logic
  - `RouteService.js` - Route management and processing
- `/utils` - Utility functions and helpers
  - `imageUtils.js` - Image optimization utilities

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

### Cache Service

The enhanced cache service provides TTL-based caching with compression:

```javascript
import { cacheService } from '../core/services/storage/CacheService';

// Store data with TTL (time to live) in seconds
await cacheService.setItem('cache-key', dataObject, 3600); // 1 hour TTL

// Retrieve cached data (returns null if expired or not found)
const cachedData = await cacheService.getItem('cache-key');

// Clear specific cache items
await cacheService.removeItem('cache-key');

// Clear all cache by prefix
await cacheService.clearCacheByPrefix('api:');

// Get cache statistics
const stats = cacheService.getCacheStats();
```

### Image Utilities

Utilities for optimizing image loading and display:

```javascript
import { useLazyImage, getOptimizedImageSources } from '../core/utils/imageUtils';

// In a React component:
const { imageSrc, isLoaded, setImageRef } = useLazyImage(
  'path/to/image.jpg',
  'path/to/placeholder.jpg'
);

// Get optimized image sources including WebP
const { srcset, fallbackSrc } = getOptimizedImageSources('path/to/image.jpg');
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

## Offline Support

The application uses a service worker for offline functionality:

- Network-first with cache fallback for API requests
- Cache-first for static assets
- Background syncing for operations while offline
- Offline fallback page when no cached content is available

## Migration

If you're working with older code that imports from `src/api/*` or `src/services/apiClient.js`, please update your imports to use these core modules instead. See the `API_MIGRATION.md` document for more details. 