/**
 * CDN Service
 * 
 * This service provides a unified interface for CDN operations:
 * - Asset upload and management
 * - Cache control and invalidation
 * - URL generation for assets
 */

const cdnConfig = require('../../config/cdn');
const logger = require('../../utils/logger');
const storageClient = require('./storageClient');
const assetProcessor = require('./assetProcessor');
const cacheManager = require('./cacheManager');

class CdnService {
  constructor(config = cdnConfig.getCdnConfig()) {
    this.config = config;
    this.initialized = false;
    this.storageClient = storageClient;
  }

  /**
   * Initialize the CDN service
   * @returns {boolean} Whether initialization was successful
   */
  initialize() {
    if (this.initialized) return true;
    if (!this.config.enabled) {
      logger.info('CDN is disabled in the current environment');
      return false;
    }

    try {
      this.storageClient.initialize(this.config);
      this.initialized = true;
      logger.info(`CDN service initialized with provider: ${this.config.provider}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize CDN service', { error });
      return false;
    }
  }

  /**
   * Upload a file to the CDN
   * @param {string} filePath - Local path to the file
   * @param {string} destPath - Destination path in CDN (optional)
   * @param {object} options - Upload options
   * @returns {Promise<string>} The CDN URL of the uploaded file
   */
  async uploadFile(filePath, destPath, options = {}) {
    this._ensureInitialized();
    
    try {
      // Process the asset before upload (optimize, detect content type, etc.)
      const processedAsset = await assetProcessor.processAsset(filePath, options);
      
      // Upload the processed asset
      const cdnUrl = await this.storageClient.uploadAsset(
        processedAsset.filePath,
        destPath || processedAsset.recommendedPath,
        {
          contentType: processedAsset.contentType,
          cacheControl: processedAsset.cacheControl || this._getCacheControl(options),
          ...options
        }
      );
      
      return cdnUrl;
    } catch (error) {
      logger.error('Error uploading file to CDN', { error, filePath });
      throw new Error(`Failed to upload file to CDN: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to the CDN
   * @param {Array<{localPath: string, destPath: string, options: object}>} files 
   * @returns {Promise<Array<string>>} Array of CDN URLs for the uploaded files
   */
  async uploadMultipleFiles(files) {
    this._ensureInitialized();
    return Promise.all(files.map(file => 
      this.uploadFile(file.localPath, file.destPath, file.options)
    ));
  }

  /**
   * Generate a pre-signed URL for direct browser uploads
   * @param {string} fileName - Name of the file to be uploaded
   * @param {string} contentType - MIME type of the file
   * @param {object} options - Additional options
   * @returns {Promise<object>} Object with URL and fields for the upload
   */
  async generatePresignedUrl(fileName, contentType, options = {}) {
    this._ensureInitialized();
    
    const expiresIn = options.expiresIn || 3600; // Default 1 hour
    
    try {
      return await this.storageClient.generatePresignedUrl(
        fileName,
        contentType,
        expiresIn,
        options
      );
    } catch (error) {
      logger.error('Error generating pre-signed URL', { error, fileName });
      throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
    }
  }

  /**
   * Invalidate CDN cache for specific paths
   * @param {Array<string>} paths - Array of paths to invalidate
   * @returns {Promise<string>} Invalidation ID or status
   */
  async invalidateCache(paths) {
    this._ensureInitialized();
    
    try {
      return await cacheManager.invalidatePaths(
        this.config,
        paths,
        this.storageClient
      );
    } catch (error) {
      logger.error('Error invalidating CDN cache', { error, paths });
      throw new Error(`Failed to invalidate CDN cache: ${error.message}`);
    }
  }

  /**
   * Get CDN URL for a static asset
   * @param {string} assetPath - Relative path to the asset
   * @returns {string} Full CDN URL
   */
  getAssetUrl(assetPath) {
    // Use the existing implementation from cdnConfig
    return cdnConfig.getCdnUrl(assetPath);
  }

  /**
   * Get current CDN configuration
   * @returns {object} Current CDN configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Ensure the service is initialized before use
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      const initialized = this.initialize();
      if (!initialized) {
        throw new Error('CDN service is not enabled or failed to initialize');
      }
    }
  }

  /**
   * Get cache control header based on options and defaults
   * @param {object} options - Options containing cache control settings
   * @returns {string} Cache control header value
   * @private
   */
  _getCacheControl(options) {
    if (options.cacheControl) {
      return options.cacheControl;
    }
    
    if (options.contentType && options.contentType.startsWith('image/')) {
      return `public, max-age=${this.config.options.maxAge}, immutable`;
    }
    
    return `max-age=${this.config.options.maxAge}`;
  }
}

// Export a singleton instance
module.exports = new CdnService(); 