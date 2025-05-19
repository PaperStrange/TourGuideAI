/**
 * CDN Manager Utility
 * 
 * Provides functionality for managing assets on the CDN:
 * - Upload files to S3/CloudFront
 * - Invalidate cache when needed
 * - Generate pre-signed URLs for direct uploads
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getCdnConfig } = require('../config/cdn');
const logger = require('./logger');

// Initialize AWS SDK with credentials
const initializeAWS = () => {
  const config = getCdnConfig();
  
  if (!config.enabled || config.provider !== 'cloudfront') {
    return false;
  }
  
  // Configure AWS with credentials
  AWS.config.update({
    region: config.options.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
  
  return true;
};

/**
 * Upload a file to S3 bucket
 * 
 * @param {string} filePath - Local path to the file
 * @param {string} destPath - Destination path in S3 (without bucket name)
 * @param {object} options - Additional options like contentType, cacheControl, etc.
 * @returns {Promise<string>} - URL of the uploaded file
 */
const uploadToS3 = async (filePath, destPath, options = {}) => {
  const config = getCdnConfig();
  
  if (!config.enabled) {
    logger.warn('CDN is not enabled. File not uploaded to S3.');
    return filePath;
  }
  
  // Initialize AWS SDK
  if (!initializeAWS()) {
    logger.error('AWS SDK initialization failed');
    throw new Error('AWS SDK initialization failed');
  }
  
  // Create S3 service object
  const s3 = new AWS.S3();
  
  // Prepare upload parameters
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const s3Path = destPath || `${config.options.s3FolderPath}${fileName}`;
  
  const params = {
    Bucket: config.options.bucketName,
    Key: s3Path,
    Body: fileContent,
    ContentType: options.contentType || 'application/octet-stream',
    CacheControl: options.cacheControl || `max-age=${config.options.maxAge}`,
    ACL: 'public-read'
  };
  
  try {
    // Upload file to S3
    const data = await s3.upload(params).promise();
    logger.info(`File uploaded successfully to ${data.Location}`);
    
    // Return the CDN URL
    return `${config.baseUrl}/${s3Path}`;
  } catch (error) {
    logger.error('Error uploading file to S3', { error });
    throw error;
  }
};

/**
 * Upload multiple files to S3
 * 
 * @param {Array<{localPath: string, destPath: string, options: object}>} files - Array of file objects
 * @returns {Promise<Array<string>>} - Array of uploaded file URLs
 */
const uploadMultipleToS3 = async (files) => {
  return Promise.all(files.map(file => 
    uploadToS3(file.localPath, file.destPath, file.options)
  ));
};

/**
 * Generate a pre-signed URL for direct browser uploads
 * 
 * @param {string} fileName - Name of the file to be uploaded
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<object>} - Object containing the pre-signed URL and fields
 */
const generatePresignedUrl = async (fileName, contentType, expiresIn = 3600) => {
  const config = getCdnConfig();
  
  if (!config.enabled) {
    logger.warn('CDN is not enabled. Cannot generate pre-signed URL.');
    throw new Error('CDN is not enabled');
  }
  
  // Initialize AWS SDK
  if (!initializeAWS()) {
    logger.error('AWS SDK initialization failed');
    throw new Error('AWS SDK initialization failed');
  }
  
  // Create S3 service object
  const s3 = new AWS.S3();
  
  // Generate a unique key for the file
  const fileKey = `${config.options.s3FolderPath}${Date.now()}-${fileName}`;
  
  // Set up parameters for pre-signed URL
  const params = {
    Bucket: config.options.bucketName,
    Key: fileKey,
    Expires: expiresIn,
    ContentType: contentType,
    ACL: 'public-read'
  };
  
  try {
    // Generate pre-signed URL
    const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return {
      url: presignedUrl,
      fields: {
        key: fileKey,
        'Content-Type': contentType,
        acl: 'public-read'
      },
      cdnUrl: `${config.baseUrl}/${fileKey}`
    };
  } catch (error) {
    logger.error('Error generating pre-signed URL', { error });
    throw error;
  }
};

/**
 * Invalidate CloudFront cache for specific paths
 * 
 * @param {Array<string>} paths - Array of paths to invalidate
 * @returns {Promise<string>} - Invalidation ID
 */
const invalidateCache = async (paths) => {
  const config = getCdnConfig();
  
  if (!config.enabled || !config.options.distributionId) {
    logger.warn('CDN is not enabled or distribution ID is missing. Cache not invalidated.');
    return null;
  }
  
  // Initialize AWS SDK
  if (!initializeAWS()) {
    logger.error('AWS SDK initialization failed');
    throw new Error('AWS SDK initialization failed');
  }
  
  // Create CloudFront service object
  const cloudfront = new AWS.CloudFront();
  
  // Prepare invalidation parameters
  const params = {
    DistributionId: config.options.distributionId,
    InvalidationBatch: {
      CallerReference: `tourguideai-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
      Paths: {
        Quantity: paths.length,
        Items: paths.map(p => p.startsWith('/') ? p : `/${p}`)
      }
    }
  };
  
  try {
    // Create invalidation
    const data = await cloudfront.createInvalidation(params).promise();
    logger.info(`Cache invalidation created with ID: ${data.Invalidation.Id}`);
    return data.Invalidation.Id;
  } catch (error) {
    logger.error('Error invalidating CloudFront cache', { error });
    throw error;
  }
};

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  generatePresignedUrl,
  invalidateCache
}; 