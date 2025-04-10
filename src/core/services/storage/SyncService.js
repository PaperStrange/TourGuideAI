/**
 * SyncService
 * Handles synchronization of offline data with the server
 */

import { localStorageService } from './LocalStorageService';

class SyncService {
  constructor() {
    this.SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    this.syncInProgress = false;
    this.syncQueue = new Set();
  }

  /**
   * Initialize sync service
   * @param {Object} apiClient - API client instance
   */
  initialize(apiClient) {
    this.apiClient = apiClient;
    this.startPeriodicSync();
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync() {
    setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Add item to sync queue
   * @param {string} type - Item type (route, timeline, etc.)
   * @param {string} id - Item ID
   */
  queueForSync(type, id) {
    this.syncQueue.add(`${type}:${id}`);
  }

  /**
   * Perform sync operation
   * @returns {Promise<void>}
   */
  async sync() {
    if (this.syncInProgress || this.syncQueue.size === 0) {
      return;
    }

    this.syncInProgress = true;
    const lastSync = localStorageService.getLastSync();

    try {
      // Sync routes
      await this.syncRoutes(lastSync);

      // Sync timelines
      await this.syncTimelines(lastSync);

      // Sync favorites
      await this.syncFavorites();

      // Sync waypoints
      await this.syncWaypoints(lastSync);

      // Process sync queue
      await this.processSyncQueue();

      // Update last sync timestamp
      localStorageService.updateLastSync();
    } catch (error) {
      console.error('Sync failed:', error);
      // Retry failed syncs later
      this.retryFailedSyncs();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync routes with server
   * @param {string} lastSync - Last sync timestamp
   * @returns {Promise<void>}
   */
  async syncRoutes(lastSync) {
    try {
      // Get routes from server that have been updated since last sync
      const serverRoutes = await this.apiClient.getRoutes({ since: lastSync });
      
      // Update local storage with server data
      serverRoutes.forEach(route => {
        localStorageService.saveRoute(route);
      });

      // Get local routes that need to be synced to server
      const localRoutes = localStorageService.getAllRoutes();
      for (const routeId in localRoutes) {
        const route = localRoutes[routeId];
        if (!lastSync || new Date(route.lastUpdated) > new Date(lastSync)) {
          await this.apiClient.updateRoute(routeId, route);
        }
      }
    } catch (error) {
      console.error('Route sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync timelines with server
   * @param {string} lastSync - Last sync timestamp
   * @returns {Promise<void>}
   */
  async syncTimelines(lastSync) {
    try {
      // Get timelines from server that have been updated since last sync
      const serverTimelines = await this.apiClient.getTimelines({ since: lastSync });
      
      // Update local storage with server data
      if (Array.isArray(serverTimelines)) {
        serverTimelines.forEach(timeline => {
          localStorageService.saveTimeline(timeline);
        });
      } else if (typeof serverTimelines === 'object') {
        // Handle object format where keys are timeline IDs
        Object.entries(serverTimelines).forEach(([timelineId, timeline]) => {
          localStorageService.saveTimeline(timelineId, timeline);
        });
      }
      
      // Get local timelines that need to be synced to server
      const localTimelines = localStorageService.getAllTimelines();
      for (const timelineId in localTimelines) {
        const timeline = localTimelines[timelineId];
        if (!lastSync || new Date(timeline.lastUpdated) > new Date(lastSync)) {
          await this.apiClient.updateTimeline(timelineId, timeline);
        }
      }
    } catch (error) {
      console.error('Timeline sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync favorites with server
   * @returns {Promise<void>}
   */
  async syncFavorites() {
    try {
      // Get favorites from server
      const serverFavorites = await this.apiClient.getFavorites();
      
      // Update local storage with server data
      serverFavorites.forEach(routeId => {
        localStorageService.addFavorite(routeId);
      });

      // Get local favorites that need to be synced to server
      const localFavorites = localStorageService.getFavorites();
      
      // Sync local changes to server
      await this.apiClient.updateFavorites(localFavorites);
    } catch (error) {
      console.error('Favorites sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync waypoints with server
   * @param {string} lastSync - Last sync timestamp
   * @returns {Promise<void>}
   */
  async syncWaypoints(lastSync) {
    try {
      // Get waypoints from server that have been updated since last sync
      const serverWaypoints = await this.apiClient.getWaypoints({ since: lastSync });
      
      // Update local storage with server data
      serverWaypoints.forEach(waypoint => {
        localStorageService.saveWaypoint(waypoint);
      });

      // Get local waypoints that need to be synced to server
      const localWaypoints = localStorageService.getAllWaypoints();
      for (const waypointId in localWaypoints) {
        const waypoint = localWaypoints[waypointId];
        if (!lastSync || new Date(waypoint.lastUpdated) > new Date(lastSync)) {
          await this.apiClient.updateWaypoint(waypointId, waypoint);
        }
      }
    } catch (error) {
      console.error('Waypoint sync failed:', error);
      throw error;
    }
  }

  /**
   * Process sync queue
   * @returns {Promise<void>}
   */
  async processSyncQueue() {
    for (const item of this.syncQueue) {
      const [type, id] = item.split(':');
      
      try {
        switch (type) {
          case 'route':
            const route = localStorageService.getRoute(id);
            if (route) {
              await this.apiClient.updateRoute(id, route);
            }
            break;
          case 'timeline':
            const timeline = localStorageService.getTimeline(id);
            if (timeline) {
              await this.apiClient.updateTimeline(id, timeline);
            }
            break;
          default:
            console.warn(`Unknown sync type: ${type}`);
        }
        this.syncQueue.delete(item);
      } catch (error) {
        console.error(`Failed to sync ${type}:${id}:`, error);
        // Keep item in queue for retry
      }
    }
  }

  /**
   * Retry failed syncs
   */
  retryFailedSyncs() {
    // Implement exponential backoff for failed syncs
    setTimeout(() => {
      this.sync();
    }, this.SYNC_INTERVAL * 2);
  }

  /**
   * Force immediate sync
   * @returns {Promise<void>}
   */
  async forceSync() {
    this.syncQueue.clear();
    await this.sync();
  }
}

// Export a singleton instance
export const syncService = new SyncService(); 