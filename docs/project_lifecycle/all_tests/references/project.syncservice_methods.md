# SyncService Methods Reference

This document provides an overview of the SyncService methods and their behavior.

## Core Methods

### initialize(apiClient)
Initializes the sync service with the provided API client.
- **Parameters**: `apiClient` - API client instance
- **Returns**: None
- **Behavior**: Stores the API client reference and starts the periodic sync process

### startPeriodicSync()
Starts the periodic sync process.
- **Parameters**: None
- **Returns**: None
- **Behavior**: Sets up an interval to call `sync()` periodically

### queueForSync(type, id)
Adds an item to the sync queue.
- **Parameters**: 
  - `type` - Item type (route, timeline, etc.)
  - `id` - Item ID
- **Returns**: None
- **Behavior**: Adds the item to the sync queue in the format `${type}:${id}`

### sync()
Performs the full synchronization process.
- **Parameters**: None
- **Returns**: Promise<void>
- **Behavior**: 
  1. Checks if sync is already in progress or if queue is empty
  2. Gets the last sync timestamp
  3. Syncs routes, timelines, favorites, and waypoints
  4. Processes the sync queue
  5. Updates the last sync timestamp
  6. Handles any errors

## Sync Methods

### syncRoutes(lastSync)
Syncs routes with the server.
- **Parameters**: `lastSync` - Last sync timestamp
- **Returns**: Promise<void>
- **Behavior**:
  1. Gets routes from server updated since last sync
  2. Updates local storage with server data
  3. Gets local routes that need to be synced to server
  4. Updates server with local changes

### syncTimelines(lastSync)
Syncs timelines with the server.
- **Parameters**: `lastSync` - Last sync timestamp
- **Returns**: Promise<void>
- **Behavior**:
  1. Gets timelines from server updated since last sync
  2. Updates local storage with server data
  3. Gets local timelines that need to be synced to server
  4. Updates server with local changes

### syncFavorites()
Syncs favorites with the server.
- **Parameters**: None
- **Returns**: Promise<void>
- **Behavior**:
  1. Gets favorites from server
  2. Updates local storage with server data
  3. Gets local favorites
  4. Updates server with local changes

### syncWaypoints(lastSync)
Syncs waypoints with the server.
- **Parameters**: `lastSync` - Last sync timestamp
- **Returns**: Promise<void>
- **Behavior**:
  1. Gets waypoints from server updated since last sync
  2. Updates local storage with server data
  3. Gets local waypoints that need to be synced to server
  4. Updates server with local changes

## Support Methods

### processSyncQueue()
Processes items in the sync queue.
- **Parameters**: None
- **Returns**: Promise<void>
- **Behavior**:
  1. Iterates through items in the sync queue
  2. For each item, retrieves the data from local storage
  3. Updates the server with the data
  4. Removes the item from the queue on success
  5. Leaves the item in the queue on failure for retry

### retryFailedSyncs()
Retries failed sync operations.
- **Parameters**: None
- **Returns**: None
- **Behavior**: Sets a timeout to retry the sync with exponential backoff

### forceSync()
Forces an immediate sync operation.
- **Parameters**: None
- **Returns**: Promise<void>
- **Behavior**:
  1. Clears the sync queue
  2. Calls the sync method immediately

## Usage Example

```javascript
// Initialize the service
syncService.initialize(apiClient);

// Queue an item for sync
syncService.queueForSync('route', 'route123');

// Force immediate sync
await syncService.forceSync();
```

## Error Handling

All sync methods catch and log errors, then re-throw them to be handled by the calling method. The main `sync()` method catches any errors and calls `retryFailedSyncs()` to implement the retry logic.

---
*Document last updated: 2023-04-10* 