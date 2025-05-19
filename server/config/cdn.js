/**
 * CDN Configuration
 * 
 * This file contains configuration for Content Delivery Network integration.
 * Different configurations are provided for development, staging, and production.
 */

const cdnConfig = {
  // Development environment (local)
  development: {
    enabled: false,
    baseUrl: '',
    provider: 'local',
    options: {}
  },
  
  // Staging environment
  staging: {
    enabled: true,
    baseUrl: process.env.CDN_STAGING_URL || 'https://staging-cdn.tourguideai.com',
    provider: 'cloudfront',
    options: {
      region: process.env.AWS_REGION || 'us-east-1',
      distributionId: process.env.CDN_STAGING_DISTRIBUTION_ID,
      bucketName: process.env.CDN_STAGING_BUCKET_NAME || 'staging-assets-tourguideai',
      maxAge: 86400, // 1 day in seconds
      s3FolderPath: 'assets/'
    }
  },
  
  // Production environment
  production: {
    enabled: true,
    baseUrl: process.env.CDN_PRODUCTION_URL || 'https://cdn.tourguideai.com',
    provider: 'cloudfront',
    options: {
      region: process.env.AWS_REGION || 'us-east-1',
      distributionId: process.env.CDN_PRODUCTION_DISTRIBUTION_ID,
      bucketName: process.env.CDN_PRODUCTION_BUCKET_NAME || 'assets-tourguideai',
      maxAge: 2592000, // 30 days in seconds
      s3FolderPath: 'assets/'
    }
  }
};

/**
 * Get CDN configuration for the current environment
 * @returns {Object} CDN configuration object
 */
const getCdnConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return cdnConfig[env] || cdnConfig.development;
};

/**
 * Get CDN URL for a static asset
 * @param {string} assetPath - The relative path to the asset
 * @returns {string} The full CDN URL to the asset
 */
const getCdnUrl = (assetPath) => {
  const config = getCdnConfig();
  
  // If CDN is not enabled or in development, return the relative path
  if (!config.enabled) {
    return assetPath;
  }
  
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
  
  // Construct and return the full CDN URL
  return `${config.baseUrl}/${cleanPath}`;
};

module.exports = {
  getCdnConfig,
  getCdnUrl
}; 