/**
 * CacheService
 * Handles offline data persistence and caching
 */

import { localStorageService } from './LocalStorageService';

class CacheService {
  constructor() {
    this.CACHE_KEYS = {
      ROUTE_CACHE: 'tourguide_route_cache',
      TIMELINE_CACHE: 'tourguide_timeline_cache',
      FAVORITES_CACHE: 'tourguide_favorites_cache',
      SETTINGS_CACHE: 'tourguide_settings_cache',
      CACHE_VERSION: 'tourguide_cache_version'
    };
    this.CACHE_VERSION = '1.0.0';
    this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize cache service
   */
  initialize() {
    this.checkCacheVersion();
    this.cleanExpiredCache();
  }

  /**
   * Check and update cache version
   */
  checkCacheVersion() {
    const currentVersion = localStorage.getItem(this.CACHE_KEYS.CACHE_VERSION);
    if (currentVersion !== this.CACHE_VERSION) {
      this.clearCache();
      localStorage.setItem(this.CACHE_KEYS.CACHE_VERSION, this.CACHE_VERSION);
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    const cacheKeys = Object.values(this.CACHE_KEYS).filter(key => key !== this.CACHE_KEYS.CACHE_VERSION);

    cacheKeys.forEach(key => {
      const cache = this.getCache(key);
      if (cache) {
        const updatedCache = Object.entries(cache).reduce((acc, [id, entry]) => {
          if (now - entry.timestamp < this.CACHE_EXPIRY) {
            acc[id] = entry;
          }
          return acc;
        }, {});
        this.setCache(key, updatedCache);
      }
    });
  }

  /**
   * Get cache for a specific key
   * @param {string} key - Cache key
   * @returns {Object|null} - Cache data or null if not found
   */
  getCache(key) {
    try {
      const cache = localStorage.getItem(key);
      return cache ? JSON.parse(cache) : null;
    } catch (error) {
      console.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache for a specific key
   * @param {string} key - Cache key
   * @param {Object} data - Cache data
   * @returns {boolean} - Success status
   */
  setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Cache a route
   * @param {Object} route - Route data
   * @returns {boolean} - Success status
   */
  cacheRoute(route) {
    const cache = this.getCache(this.CACHE_KEYS.ROUTE_CACHE) || {};
    cache[route.id] = {
      data: route,
      timestamp: Date.now()
    };
    return this.setCache(this.CACHE_KEYS.ROUTE_CACHE, cache);
  }

  /**
   * Get cached route
   * @param {string} routeId - Route ID
   * @returns {Object|null} - Cached route or null if not found/expired
   */
  getCachedRoute(routeId) {
    const cache = this.getCache(this.CACHE_KEYS.ROUTE_CACHE);
    if (!cache || !cache[routeId]) {
      return null;
    }

    const entry = cache[routeId];
    if (Date.now() - entry.timestamp > this.CACHE_EXPIRY) {
      delete cache[routeId];
      this.setCache(this.CACHE_KEYS.ROUTE_CACHE, cache);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache a timeline
   * @param {string} routeId - Route ID
   * @param {Object} timeline - Timeline data
   * @returns {boolean} - Success status
   */
  cacheTimeline(routeId, timeline) {
    const cache = this.getCache(this.CACHE_KEYS.TIMELINE_CACHE) || {};
    cache[routeId] = {
      data: timeline,
      timestamp: Date.now()
    };
    return this.setCache(this.CACHE_KEYS.TIMELINE_CACHE, cache);
  }

  /**
   * Get cached timeline
   * @param {string} routeId - Route ID
   * @returns {Object|null} - Cached timeline or null if not found/expired
   */
  getCachedTimeline(routeId) {
    const cache = this.getCache(this.CACHE_KEYS.TIMELINE_CACHE);
    if (!cache || !cache[routeId]) {
      return null;
    }

    const entry = cache[routeId];
    if (Date.now() - entry.timestamp > this.CACHE_EXPIRY) {
      delete cache[routeId];
      this.setCache(this.CACHE_KEYS.TIMELINE_CACHE, cache);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache favorites
   * @param {string[]} favorites - Array of favorite route IDs
   * @returns {boolean} - Success status
   */
  cacheFavorites(favorites) {
    const cache = {
      data: favorites,
      timestamp: Date.now()
    };
    return this.setCache(this.CACHE_KEYS.FAVORITES_CACHE, cache);
  }

  /**
   * Get cached favorites
   * @returns {string[]|null} - Cached favorites or null if not found/expired
   */
  getCachedFavorites() {
    const cache = this.getCache(this.CACHE_KEYS.FAVORITES_CACHE);
    if (!cache) {
      return null;
    }

    if (Date.now() - cache.timestamp > this.CACHE_EXPIRY) {
      this.setCache(this.CACHE_KEYS.FAVORITES_CACHE, null);
      return null;
    }

    return cache.data;
  }

  /**
   * Cache settings
   * @param {Object} settings - User settings
   * @returns {boolean} - Success status
   */
  cacheSettings(settings) {
    const cache = {
      data: settings,
      timestamp: Date.now()
    };
    return this.setCache(this.CACHE_KEYS.SETTINGS_CACHE, cache);
  }

  /**
   * Get cached settings
   * @returns {Object|null} - Cached settings or null if not found/expired
   */
  getCachedSettings() {
    const cache = this.getCache(this.CACHE_KEYS.SETTINGS_CACHE);
    if (!cache) {
      return null;
    }

    if (Date.now() - cache.timestamp > this.CACHE_EXPIRY) {
      this.setCache(this.CACHE_KEYS.SETTINGS_CACHE, null);
      return null;
    }

    return cache.data;
  }

  /**
   * Clear all cache
   */
  clearCache() {
    Object.values(this.CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Get cache size
   * @returns {number} - Total size of cache in bytes
   */
  getCacheSize() {
    let totalSize = 0;
    Object.values(this.CACHE_KEYS).forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // Approximate size in bytes
      }
    });
    return totalSize;
  }

  /**
   * Check if cache is full
   * @returns {boolean} - Whether cache is full
   */
  isCacheFull() {
    const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
    return this.getCacheSize() > MAX_CACHE_SIZE;
  }

  /**
   * Clear oldest cache entries if cache is full
   */
  clearOldestCache() {
    if (!this.isCacheFull()) {
      return;
    }

    const now = Date.now();
    const cacheKeys = Object.values(this.CACHE_KEYS).filter(key => key !== this.CACHE_KEYS.CACHE_VERSION);

    cacheKeys.forEach(key => {
      const cache = this.getCache(key);
      if (cache) {
        const updatedCache = Object.entries(cache)
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)
          .slice(-Math.floor(Object.keys(cache).length / 2))
          .reduce((acc, [id, entry]) => {
            acc[id] = entry;
            return acc;
          }, {});
        this.setCache(key, updatedCache);
      }
    });
  }
}

// Export a singleton instance
export const cacheService = new CacheService(); 