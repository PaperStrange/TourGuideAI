/**
 * LocalStorageService
 * Handles offline data storage and synchronization
 */

class LocalStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      ROUTES: 'tourguide_routes',
      TIMELINES: 'tourguide_timelines',
      FAVORITES: 'tourguide_favorites',
      SETTINGS: 'tourguide_settings',
      LAST_SYNC: 'tourguide_last_sync'
    };
  }

  /**
   * Save data to localStorage with error handling
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @returns {boolean} - Success status
   */
  saveData(key, data) {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage with error handling
   * @param {string} key - Storage key
   * @returns {any|null} - Retrieved data or null if not found
   */
  getData(key) {
    try {
      const serializedData = localStorage.getItem(key);
      return serializedData ? JSON.parse(serializedData) : null;
    } catch (error) {
      console.error('Error retrieving data from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - Success status
   */
  removeData(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
      return false;
    }
  }

  /**
   * Save a route to offline storage
   * @param {Object} route - Route data
   * @returns {boolean} - Success status
   */
  saveRoute(route) {
    const routes = this.getData(this.STORAGE_KEYS.ROUTES) || {};
    routes[route.id] = {
      ...route,
      lastUpdated: new Date().toISOString()
    };
    return this.saveData(this.STORAGE_KEYS.ROUTES, routes);
  }

  /**
   * Get a route from offline storage
   * @param {string} routeId - Route ID
   * @returns {Object|null} - Route data or null if not found
   */
  getRoute(routeId) {
    const routes = this.getData(this.STORAGE_KEYS.ROUTES) || {};
    return routes[routeId] || null;
  }

  /**
   * Get all routes from offline storage
   * @returns {Object} - All routes
   */
  getAllRoutes() {
    return this.getData(this.STORAGE_KEYS.ROUTES) || {};
  }

  /**
   * Save a timeline to offline storage
   * @param {string} routeId - Route ID
   * @param {Object} timeline - Timeline data
   * @returns {boolean} - Success status
   */
  saveTimeline(routeId, timeline) {
    const timelines = this.getData(this.STORAGE_KEYS.TIMELINES) || {};
    timelines[routeId] = {
      ...timeline,
      lastUpdated: new Date().toISOString()
    };
    return this.saveData(this.STORAGE_KEYS.TIMELINES, timelines);
  }

  /**
   * Get a timeline from offline storage
   * @param {string} routeId - Route ID
   * @returns {Object|null} - Timeline data or null if not found
   */
  getTimeline(routeId) {
    const timelines = this.getData(this.STORAGE_KEYS.TIMELINES) || {};
    return timelines[routeId] || null;
  }

  /**
   * Add a favorite route
   * @param {string} routeId - Route ID
   * @returns {boolean} - Success status
   */
  addFavorite(routeId) {
    const favorites = this.getData(this.STORAGE_KEYS.FAVORITES) || [];
    if (!favorites.includes(routeId)) {
      favorites.push(routeId);
      return this.saveData(this.STORAGE_KEYS.FAVORITES, favorites);
    }
    return true;
  }

  /**
   * Remove a favorite route
   * @param {string} routeId - Route ID
   * @returns {boolean} - Success status
   */
  removeFavorite(routeId) {
    const favorites = this.getData(this.STORAGE_KEYS.FAVORITES) || [];
    const updatedFavorites = favorites.filter(id => id !== routeId);
    return this.saveData(this.STORAGE_KEYS.FAVORITES, updatedFavorites);
  }

  /**
   * Get all favorite route IDs
   * @returns {string[]} - Array of favorite route IDs
   */
  getFavorites() {
    return this.getData(this.STORAGE_KEYS.FAVORITES) || [];
  }

  /**
   * Save user settings
   * @param {Object} settings - User settings
   * @returns {boolean} - Success status
   */
  saveSettings(settings) {
    return this.saveData(this.STORAGE_KEYS.SETTINGS, settings);
  }

  /**
   * Get user settings
   * @returns {Object} - User settings
   */
  getSettings() {
    return this.getData(this.STORAGE_KEYS.SETTINGS) || {};
  }

  /**
   * Update last sync timestamp
   * @returns {boolean} - Success status
   */
  updateLastSync() {
    return this.saveData(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  /**
   * Get last sync timestamp
   * @returns {string|null} - Last sync timestamp or null if never synced
   */
  getLastSync() {
    return this.getData(this.STORAGE_KEYS.LAST_SYNC);
  }

  /**
   * Clear all offline data
   * @returns {boolean} - Success status
   */
  clearAllData() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const localStorageService = new LocalStorageService(); 