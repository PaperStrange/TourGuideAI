# API Modules Migration Guide

## Overview

As part of our project restructuring to a feature-based architecture, we have reorganized our API-related code and storage services. This document provides guidance on the migration process and what files have been deprecated.

## Migration Strategy

We are using a staged migration approach to maintain backward compatibility:

1. Original API files now re-export from their new locations with deprecation warnings
2. Tests and existing code will continue to work without immediate changes
3. Future development should use the new file locations

## Deprecated Files

The following files are now deprecated and will be removed in a future version:

### API Clients
- `src/api/googleMapsApi.js` → Use `src/core/api/googleMapsApi.js` instead
- `src/api/openaiApi.js` → Use `src/core/api/openaiApi.js` instead
- `src/services/apiClient.js` → Use `src/core/services/apiClient.js` instead

### Storage Services
- `src/services/storage/index.js` → Use `src/core/services/storage/index.js` instead
- `src/services/storage/LocalStorageService.js` → Use `src/core/services/storage/LocalStorageService.js` instead
- `src/services/storage/CacheService.js` → Use `src/core/services/storage/CacheService.js` instead
- `src/services/storage/SyncService.js` → Use `src/core/services/storage/SyncService.js` instead

## API Client Improvements

The new API client implementation (`src/core/services/apiClient.js`) includes several improvements:

- Enhanced error handling with retry logic
- Response caching for improved performance and offline capability
- Better integration with key management
- Support for server proxy usage
- Additional configuration options

## Storage Service Improvements

The new storage service implementations in `src/core/services/storage` include:
- More robust error handling
- Better integration with the API client
- Improved performance with optimized caching strategies
- Consistent interface across all storage services

## Migration Checklist

When updating your code to use the new API structure:

1. Update API imports to use the new paths
   ```javascript
   // Old
   import * as googleMapsApi from '../../api/googleMapsApi';
   
   // New
   import * as googleMapsApi from '../../core/api/googleMapsApi';
   ```

2. Update API client service imports
   ```javascript
   // Old
   import { ApiService, OpenAIService, MapsService } from '../../services/apiClient';
   
   // New
   import { apiHelpers, openaiApiClient, mapsApiClient } from '../../core/services/apiClient';
   ```

3. Update storage service imports
   ```javascript
   // Old
   import { localStorageService, cacheService, syncService } from '../../services/storage';
   
   // New
   import { localStorageService, cacheService, syncService } from '../../core/services/storage';
   ```

4. Test your changes to ensure everything works as expected

## Integration Test Updates

All integration tests should be updated to import from the new locations. This ensures that tests are validating the current implementation rather than the deprecated one.

## Timeline

- **Current Phase**: Deprecation notices added to old files
- **Next Version**: Update all imports to use new locations
- **Future Release**: Remove deprecated files

## Questions or Issues

If you encounter any issues during migration, please document them in the project issues with the tag `api-migration`. 