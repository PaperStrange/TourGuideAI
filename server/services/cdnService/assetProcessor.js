/**
 * CDN Asset Processor
 * 
 * Handles asset-specific processing before upload:
 * - Content type detection
 * - Image optimization and conversion
 * - Recommended path generation
 * - Cache control determination
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');
const logger = require('../../utils/logger');

// In a real implementation, these would use proper image processing libraries
// like sharp, imagemin, etc. For simplicity, this is a placeholder.
let imageOptimizer = null;
try {
  // Optional dependency - don't break if not installed
  imageOptimizer = require('sharp');
} catch (error) {
  logger.info('Image optimization not available. Install sharp for image processing capabilities.');
}

/**
 * Process an asset before uploading to CDN
 * @param {string} filePath - Path to the asset file
 * @param {object} options - Processing options
 * @returns {Promise<object>} Processed asset information
 */
async function processAsset(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // Get basic file information
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Detect content type based on file extension
    const contentType = options.contentType || mime.lookup(filePath) || 'application/octet-stream';
    
    // Create a hash of the file content for cache busting and deduplication
    const fileHash = calculateFileHash(filePath);
    
    // Determine processed file path - use original if no processing needed
    let processedFilePath = filePath;
    let optimized = false;
    
    // Optimize images if enabled and the processor is available
    if (shouldOptimizeImage(contentType, options) && imageOptimizer) {
      processedFilePath = await optimizeImage(filePath, contentType, options);
      optimized = true;
    }
    
    // Determine recommended path based on file type and hash
    const recommendedPath = generateRecommendedPath(fileName, fileHash, contentType, options);
    
    // Determine optimal cache control settings based on file type
    const cacheControl = determineCacheControl(contentType, optimized, options);
    
    return {
      filePath: processedFilePath,
      originalPath: filePath,
      fileName,
      fileExt,
      contentType,
      fileHash,
      fileSize: stats.size,
      recommendedPath,
      cacheControl,
      optimized,
      metadata: {
        lastModified: stats.mtime,
        created: stats.birthtime
      }
    };
  } catch (error) {
    logger.error('Error processing asset', { error, filePath });
    throw new Error(`Failed to process asset: ${error.message}`);
  }
}

/**
 * Calculate MD5 hash of file content
 * @param {string} filePath - Path to the file
 * @returns {string} MD5 hash string
 */
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Generate a recommended path for the asset in the CDN
 * @param {string} fileName - Original filename
 * @param {string} fileHash - File content hash
 * @param {string} contentType - Detected content type
 * @param {object} options - Additional options
 * @returns {string} Recommended path for the asset
 */
function generateRecommendedPath(fileName, fileHash, contentType, options = {}) {
  // Split content type to get the main type (image, text, application, etc.)
  const [mainType, subType] = contentType.split('/');
  
  // Use custom folder if provided in options
  if (options.folder) {
    return `${options.folder}/${fileHash.substring(0, 8)}-${fileName}`;
  }
  
  // Determine appropriate folder based on content type
  let folder = '';
  
  switch (mainType) {
    case 'image':
      folder = 'images';
      break;
    case 'text':
      if (subType === 'css') {
        folder = 'css';
      } else if (subType === 'javascript' || subType === 'js') {
        folder = 'js';
      } else {
        folder = 'text';
      }
      break;
    case 'application':
      if (subType === 'javascript' || subType === 'js') {
        folder = 'js';
      } else if (subType === 'json') {
        folder = 'data';
      } else {
        folder = 'files';
      }
      break;
    case 'font':
      folder = 'fonts';
      break;
    case 'video':
      folder = 'videos';
      break;
    case 'audio':
      folder = 'audio';
      break;
    default:
      folder = 'other';
  }
  
  // Format: folder/hash-filename
  return `${folder}/${fileHash.substring(0, 8)}-${fileName}`;
}

/**
 * Determine if an image should be optimized
 * @param {string} contentType - Asset content type
 * @param {object} options - Processing options
 * @returns {boolean} Whether the image should be optimized
 */
function shouldOptimizeImage(contentType, options = {}) {
  // Skip optimization if explicitly disabled
  if (options.optimize === false) {
    return false;
  }
  
  // Only optimize images
  if (!contentType.startsWith('image/')) {
    return false;
  }
  
  // Skip optimization for SVG and GIF as they require special handling
  if (contentType === 'image/svg+xml' || contentType === 'image/gif') {
    return false;
  }
  
  return true;
}

/**
 * Optimize an image for CDN delivery
 * @param {string} filePath - Path to the image file
 * @param {string} contentType - Image content type
 * @param {object} options - Optimization options
 * @returns {Promise<string>} Path to the optimized image
 */
async function optimizeImage(filePath, contentType, options = {}) {
  // Skip if image optimizer not available
  if (!imageOptimizer) {
    return filePath;
  }
  
  // This is a placeholder for actual image optimization
  // In a real implementation, this would use Sharp to resize, compress, etc.
  logger.info(`Would optimize image: ${filePath}`);
  
  // Just return the original path for now
  return filePath;
}

/**
 * Determine appropriate cache control settings
 * @param {string} contentType - Asset content type
 * @param {boolean} optimized - Whether the asset was optimized
 * @param {object} options - Additional options
 * @returns {string} Cache control header value
 */
function determineCacheControl(contentType, optimized, options = {}) {
  // Use explicit cache control if provided
  if (options.cacheControl) {
    return options.cacheControl;
  }
  
  const config = options.config || require('../../config/cdn').getCdnConfig();
  const maxAge = config.options.maxAge || 2592000; // Default 30 days
  
  // Default cache control setting
  let cacheControl = `max-age=${maxAge}`;
  
  // Add cache directives based on content type
  if (contentType.startsWith('image/') || 
      contentType.startsWith('font/') ||
      contentType === 'application/javascript' ||
      contentType === 'text/css') {
    // Static assets that rarely change - add immutable directive
    cacheControl = `public, ${cacheControl}, immutable`;
  } else if (contentType === 'text/html') {
    // HTML should have shorter cache times
    cacheControl = `public, max-age=3600`; // 1 hour
  } else if (contentType === 'application/json') {
    // API responses and data might change frequently
    cacheControl = `public, max-age=60`; // 1 minute
  } else {
    // Default for other content types
    cacheControl = `public, ${cacheControl}`;
  }
  
  return cacheControl;
}

module.exports = {
  processAsset,
  calculateFileHash,
  generateRecommendedPath,
  shouldOptimizeImage,
  optimizeImage,
  determineCacheControl
}; 