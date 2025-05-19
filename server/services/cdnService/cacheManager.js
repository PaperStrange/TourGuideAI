/**
 * CDN Cache Manager
 * 
 * Handles CDN cache invalidation and management:
 * - CloudFront cache invalidation
 * - Cache strategy implementation
 * - Cache TTL optimization
 */

const logger = require('../../utils/logger');

/**
 * Invalidate specific paths in the CDN cache
 * @param {object} config - CDN configuration
 * @param {Array<string>} paths - Array of paths to invalidate
 * @param {object} storageClient - Storage client with invalidation methods
 * @returns {Promise<string>} Invalidation ID or status
 */
async function invalidatePaths(config, paths, storageClient) {
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    throw new Error('Invalid paths provided for cache invalidation');
  }
  
  if (!config.options.distributionId) {
    logger.warn('No CloudFront distribution ID configured, skipping invalidation');
    return 'skipped';
  }

  // Normalize paths to ensure proper format for CloudFront
  const normalizedPaths = paths.map(path => {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    
    // Add wildcard for directory paths
    if (path.endsWith('/') && !path.endsWith('*/')) {
      path = `${path}*`;
    }
    
    return path;
  });

  // Add wildcard path if needed for batch invalidations
  if (paths.length === 1 && config.options.useWildcardInvalidation) {
    const pathParts = normalizedPaths[0].split('/');
    if (pathParts.length > 2) {
      // Replace the filename with wildcard but keep the directory structure
      pathParts.pop();
      normalizedPaths.push(`${pathParts.join('/')}/*`);
    }
  }

  try {
    logger.info(`Invalidating ${normalizedPaths.length} paths in CloudFront distribution: ${config.options.distributionId}`);
    
    // Perform the actual invalidation using the storage client
    const invalidationId = await storageClient.invalidateCloudFront(
      normalizedPaths,
      { config }
    );
    
    logger.info(`Cache invalidation created successfully with ID: ${invalidationId}`);
    return invalidationId;
  } catch (error) {
    logger.error('Failed to invalidate paths in CloudFront', { error, paths });
    throw error;
  }
}

/**
 * Calculate optimal cache TTL based on content type and update frequency
 * @param {string} contentType - Content MIME type
 * @param {object} options - Additional options for TTL calculation
 * @returns {number} TTL in seconds
 */
function calculateOptimalTtl(contentType, options = {}) {
  // Use explicit TTL if provided
  if (options.ttl) {
    return options.ttl;
  }
  
  // Default TTLs by content type
  const ttlMap = {
    'text/html': 3600, // 1 hour
    'text/css': 604800, // 1 week
    'application/javascript': 604800, // 1 week
    'application/json': 60, // 1 minute
    'image/': 2592000, // 30 days
    'video/': 2592000, // 30 days
    'audio/': 2592000, // 30 days
    'font/': 31536000, // 1 year
    'default': 86400 // 1 day
  };
  
  // Find matching content type
  for (const [type, ttl] of Object.entries(ttlMap)) {
    if (contentType.startsWith(type)) {
      return ttl;
    }
  }
  
  return ttlMap.default;
}

/**
 * Generate appropriate cache headers for content
 * @param {string} contentType - Content MIME type 
 * @param {object} options - Additional options
 * @returns {string} Formatted cache-control header
 */
function generateCacheHeaders(contentType, options = {}) {
  const ttl = calculateOptimalTtl(contentType, options);
  let cacheControl = `max-age=${ttl}`;
  
  // Add public directive for most content
  if (!options.private) {
    cacheControl = `public, ${cacheControl}`;
  }
  
  // Add immutable for static content that won't change
  if (
    contentType.startsWith('image/') ||
    contentType.startsWith('font/') ||
    contentType.startsWith('video/') ||
    contentType === 'text/css' ||
    contentType === 'application/javascript'
  ) {
    cacheControl = `${cacheControl}, immutable`;
  }
  
  // Add no-store for sensitive content
  if (options.sensitive) {
    cacheControl = 'private, no-store, max-age=0';
  }
  
  // Add stale-while-revalidate for content that can be served stale
  if (options.staleWhileRevalidate) {
    const staleTime = options.staleTime || Math.round(ttl / 2);
    cacheControl = `${cacheControl}, stale-while-revalidate=${staleTime}`;
  }
  
  return cacheControl;
}

module.exports = {
  invalidatePaths,
  calculateOptimalTtl,
  generateCacheHeaders
}; 