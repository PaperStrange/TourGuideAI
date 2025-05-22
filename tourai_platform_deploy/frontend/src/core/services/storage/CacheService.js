/**
 * Enhanced Cache Service with TTL and compression support
 */
import { localStorageService } from './LocalStorageService';
import LZString from 'lz-string';

// Default cache configuration
const DEFAULT_CONFIG = {
  // Maximum cache size in bytes (50MB)
  maxCacheSize: parseInt(process.env.REACT_APP_MAX_CACHE_SIZE, 10) || 52428800,
  
  // Default TTL in seconds (24 hours)
  defaultTTL: parseInt(process.env.REACT_APP_CACHE_EXPIRY, 10) || 86400,
  
  // Use compression by default
  useCompression: true,
  
  // By default, clean expired items on service initialization
  cleanOnInit: true
};

/**
 * Cache service for storing and retrieving data with TTL
 */
class CacheService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cachePrefix = 'cache:';
    this.cacheMetaKey = 'cache:meta';
    this.cacheMeta = this._loadCacheMeta();
    
    if (this.config.cleanOnInit) {
      this.cleanExpiredItems();
    }
  }
  
  /**
   * Initialize the cache service
   * @param {Object} config - Cache configuration (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(config = {}) {
    // Update config if provided
    if (Object.keys(config).length > 0) {
      this.config = { ...this.config, ...config };
    }
    
    // Reload cache metadata
    this.cacheMeta = this._loadCacheMeta();
    
    // Clean expired items if configured
    if (this.config.cleanOnInit) {
      await this.cleanExpiredItems();
    }
    
    return true;
  }
  
  /**
   * Set cache item with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async setItem(key, data, ttl = this.config.defaultTTL) {
    const cacheKey = this._getCacheKey(key);
    const now = Date.now();
    const expiresAt = now + (ttl * 1000);
    const cacheItem = {
      data,
      createdAt: now,
      expiresAt,
      size: 0
    };
    
    try {
      // Calculate raw data size (approximate)
      const serializedData = JSON.stringify(data);
      cacheItem.size = new Blob([serializedData]).size;
      
      // Check against max cache size
      if (!this._checkCacheSize(cacheItem.size)) {
        console.warn('Cache size would exceed max size. Cleaning old entries first.');
        await this._cleanOldestItems(cacheItem.size);
      }
      
      // Store data with compression if enabled
      let storedValue;
      if (this.config.useCompression) {
        storedValue = LZString.compressToUTF16(serializedData);
        cacheItem.compressed = true;
      } else {
        storedValue = serializedData;
        cacheItem.compressed = false;
      }
      
      // Store the data
      const success = await localStorageService.saveData(cacheKey, storedValue);
      
      if (success) {
        // Update cache metadata
        this.cacheMeta[key] = {
          expiresAt,
          createdAt: now,
          size: cacheItem.size,
          compressed: cacheItem.compressed
        };
        
        await this._saveCacheMeta();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error setting cache item:', error);
      return false;
    }
  }
  
  /**
   * Get cache item
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached data or null if expired/not found
   */
  async getItem(key) {
    const cacheKey = this._getCacheKey(key);
    const metaEntry = this.cacheMeta[key];
    
    // Check if item exists and is not expired
    if (!metaEntry || metaEntry.expiresAt < Date.now()) {
      if (metaEntry) {
        // Item exists but is expired
        this._removeItemMeta(key);
        await localStorageService.removeData(cacheKey);
      }
      return null;
    }
    
    try {
      const cachedValue = await localStorageService.getData(cacheKey);
      
      if (!cachedValue) return null;
      
      // Decompress if necessary
      if (metaEntry.compressed) {
        const decompressed = LZString.decompressFromUTF16(cachedValue);
        return decompressed ? JSON.parse(decompressed) : null;
      } else {
        return JSON.parse(cachedValue);
      }
    } catch (error) {
      console.error('Error getting cache item:', error);
      return null;
    }
  }
  
  /**
   * Remove cache item
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async removeItem(key) {
    const cacheKey = this._getCacheKey(key);
    this._removeItemMeta(key);
    return await localStorageService.removeData(cacheKey);
  }
  
  /**
   * Clear all cache items
   * @returns {Promise<boolean>} - Success status
   */
  async clearCache() {
    try {
      // Get all cache keys
      const allKeys = Object.keys(this.cacheMeta).map(key => this._getCacheKey(key));
      
      // Remove all cache items
      for (const key of allKeys) {
        await localStorageService.removeData(key);
      }
      
      // Clear cache metadata
      this.cacheMeta = {};
      await this._saveCacheMeta();
      
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
  
  /**
   * Clear cache items by prefix
   * @param {string} prefix - Cache key prefix
   * @returns {Promise<boolean>} - Success status
   */
  async clearCacheByPrefix(prefix) {
    try {
      // Get matching keys
      const matchingKeys = Object.keys(this.cacheMeta).filter(key => key.startsWith(prefix));
      
      // Remove matching items
      for (const key of matchingKeys) {
        await this.removeItem(key);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing cache by prefix:', error);
      return false;
    }
  }
  
  /**
   * Clean expired items
   * @returns {Promise<number>} - Number of items removed
   */
  async cleanExpiredItems() {
    const now = Date.now();
    const expiredKeys = Object.keys(this.cacheMeta).filter(key => 
      this.cacheMeta[key].expiresAt < now
    );
    
    for (const key of expiredKeys) {
      await this.removeItem(key);
    }
    
    return expiredKeys.length;
  }
  
  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const allItems = Object.keys(this.cacheMeta);
    const totalItems = allItems.length;
    const expiredItems = allItems.filter(key => this.cacheMeta[key].expiresAt < now).length;
    const totalSize = allItems.reduce((sum, key) => sum + (this.cacheMeta[key].size || 0), 0);
    
    return {
      totalItems,
      expiredItems,
      activeItems: totalItems - expiredItems,
      totalSize,
      maxSize: this.config.maxCacheSize,
      usagePercentage: (totalSize / this.config.maxCacheSize) * 100
    };
  }
  
  /**
   * Prefetch API responses for common routes
   * @param {Array} urls - URLs to prefetch
   * @param {object} options - Prefetch options
   * @returns {Promise<number>} - Number of successfully prefetched items
   */
  async prefetchItems(urls, options = {}) {
    const { ttl, fetcher = fetch, batchSize = 5 } = options;
    
    let successCount = 0;
    
    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const currentBatchResults = await Promise.all(
        batch.map(async url => {
          try {
            const data = await fetcher(url);
            const success = await this.setItem(url, data, ttl);
            return success ? 1 : 0;
          } catch (error) {
            console.error(`Error prefetching ${url}:`, error);
            return 0;
          }
        })
      );
      
      // Update success count after processing each batch
      successCount += currentBatchResults.reduce((sum, result) => sum + result, 0);
    }
    
    return successCount;
  }
  
  // Private methods
  
  /**
   * Get full cache key with prefix
   * @private
   */
  _getCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }
  
  /**
   * Load cache metadata
   * @private
   */
  _loadCacheMeta() {
    return localStorageService.getData(this.cacheMetaKey) || {};
  }
  
  /**
   * Save cache metadata
   * @private
   */
  async _saveCacheMeta() {
    return await localStorageService.saveData(this.cacheMetaKey, this.cacheMeta);
  }
  
  /**
   * Remove item metadata
   * @private
   */
  _removeItemMeta(key) {
    if (this.cacheMeta[key]) {
      delete this.cacheMeta[key];
      this._saveCacheMeta();
    }
  }
  
  /**
   * Check if adding data would exceed max cache size
   * @private
   */
  _checkCacheSize(additionalSize) {
    const currentSize = Object.values(this.cacheMeta).reduce((sum, meta) => sum + (meta.size || 0), 0);
    return (currentSize + additionalSize) <= this.config.maxCacheSize;
  }
  
  /**
   * Clean oldest items to make room for new data
   * @private
   */
  async _cleanOldestItems(requiredSize) {
    // Get all items sorted by creation time (oldest first)
    const sortedItems = Object.keys(this.cacheMeta).sort((a, b) => 
      this.cacheMeta[a].createdAt - this.cacheMeta[b].createdAt
    );
    
    let freedSize = 0;
    let removedCount = 0;
    
    // Remove oldest items until we have enough space
    for (const key of sortedItems) {
      if (freedSize >= requiredSize) break;
      
      const itemSize = this.cacheMeta[key].size || 0;
      const removed = await this.removeItem(key);
      
      if (removed) {
        freedSize += itemSize;
        removedCount++;
      }
    }
    
    return removedCount;
  }
}

// Create and export singleton instance
export const cacheService = new CacheService();

// Export class for testing and custom instances
export default CacheService; 