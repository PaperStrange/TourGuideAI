/**
 * Caching Middleware
 * 
 * This middleware implements caching for API responses to reduce
 * external API calls and improve performance.
 */

const mcache = require('memory-cache');
const crypto = require('crypto');

/**
 * Creates a cache key from the request
 * @param {Object} req - Express request object
 * @param {string} prefix - Optional prefix for the cache key
 * @returns {string} Cache key
 */
const createCacheKey = (req, prefix = '') => {
  // Create a hash of the request URL and body
  const data = req.originalUrl + JSON.stringify(req.body || {});
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return `${prefix}:${hash}`;
};

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in milliseconds
 * @param {string} prefix - Optional prefix for the cache key
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (duration, prefix = '') => {
  return (req, res, next) => {
    // Skip caching for non-GET methods
    if (req.method !== 'GET' && req.method !== 'POST') {
      return next();
    }
    
    const key = createCacheKey(req, prefix);
    const cachedBody = mcache.get(key);
    
    if (cachedBody) {
      // Return cached response
      res.setHeader('X-Cache', 'HIT');
      return res.send(cachedBody);
    }
    
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function to cache the response
    res.send = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        mcache.put(key, body, duration);
      }
      
      res.setHeader('X-Cache', 'MISS');
      originalSend.call(this, body);
    };
    
    next();
  };
};

/**
 * Clear cache for a specific prefix
 * @param {string} prefix - Cache key prefix
 */
const clearCache = (prefix) => {
  // Get all keys
  const keys = mcache.keys();
  
  // Filter keys by prefix and delete them
  keys.forEach(key => {
    if (key.startsWith(`${prefix}:`)) {
      mcache.del(key);
    }
  });
};

module.exports = {
  cacheMiddleware,
  clearCache,
  createCacheKey
}; 