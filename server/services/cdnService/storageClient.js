/**
 * CDN Storage Client
 * 
 * Handles interactions with cloud storage providers (S3/CloudFront)
 * Implements AWS SDK v3 for improved performance and modularity
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// Using AWS SDK v3 for modular imports and better tree-shaking
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Singleton clients to prevent re-initialization
let s3Client = null;
let cloudFrontClient = null;

/**
 * Initialize the storage clients with the provided configuration
 * @param {object} config - CDN configuration
 * @returns {boolean} Whether initialization was successful
 */
function initialize(config) {
  if (!config.enabled) {
    return false;
  }

  try {
    // Configure AWS SDK v3 clients
    const clientConfig = {
      region: config.options.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    };

    // Create S3 client
    s3Client = new S3Client(clientConfig);
    
    // Create CloudFront client if distributionId is provided
    if (config.options.distributionId) {
      cloudFrontClient = new CloudFrontClient(clientConfig);
    }
    
    logger.info('CDN storage clients initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize CDN storage clients', { error });
    return false;
  }
}

/**
 * Upload an asset to S3 storage
 * @param {string} filePath - Local path to the file
 * @param {string} destPath - Destination path in S3
 * @param {object} options - Upload options
 * @returns {Promise<string>} CDN URL of the uploaded asset
 */
async function uploadAsset(filePath, destPath, options = {}) {
  if (!s3Client) {
    throw new Error('Storage client not initialized');
  }
  
  const config = options.config || require('../../config/cdn').getCdnConfig();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const s3Path = destPath || `${config.options.s3FolderPath}${fileName}`;
  
  const params = {
    Bucket: config.options.bucketName,
    Key: s3Path,
    Body: fileContent,
    ContentType: options.contentType || 'application/octet-stream',
    CacheControl: options.cacheControl || `max-age=${config.options.maxAge}`,
    ACL: options.acl || 'public-read'
  };
  
  try {
    // Upload file to S3 using AWS SDK v3
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    
    logger.info(`File uploaded successfully to S3: ${s3Path}`, { 
      etag: response.ETag,
      versionId: response.VersionId
    });
    
    // Construct and return the CDN URL
    return `${config.baseUrl}/${s3Path}`;
  } catch (error) {
    logger.error('Error uploading file to S3', { error, filePath, s3Path });
    throw error;
  }
}

/**
 * Generate a pre-signed URL for direct browser uploads
 * @param {string} fileName - Name of the file to be uploaded
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - URL expiration time in seconds
 * @param {object} options - Additional options
 * @returns {Promise<object>} Object with URL and fields for the upload
 */
async function generatePresignedUrl(fileName, contentType, expiresIn = 3600, options = {}) {
  if (!s3Client) {
    throw new Error('Storage client not initialized');
  }
  
  const config = options.config || require('../../config/cdn').getCdnConfig();
  
  // Generate a unique key for the file
  const fileKey = `${config.options.s3FolderPath}${Date.now()}-${fileName}`;
  
  // Set up parameters for pre-signed URL
  const params = {
    Bucket: config.options.bucketName,
    Key: fileKey,
    ContentType: contentType,
    ACL: options.acl || 'public-read'
  };
  
  try {
    // Create the command object for the operation
    const command = new PutObjectCommand(params);
    
    // Generate the presigned URL with AWS SDK v3
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return {
      url: presignedUrl,
      fields: {
        key: fileKey,
        'Content-Type': contentType,
        acl: options.acl || 'public-read'
      },
      cdnUrl: `${config.baseUrl}/${fileKey}`
    };
  } catch (error) {
    logger.error('Error generating pre-signed URL', { error, fileName });
    throw error;
  }
}

/**
 * Create a CloudFront invalidation for the specified paths
 * @param {Array<string>} paths - Array of paths to invalidate
 * @param {object} options - Additional options
 * @returns {Promise<string>} Invalidation ID
 */
async function invalidateCloudFront(paths, options = {}) {
  if (!cloudFrontClient) {
    throw new Error('CloudFront client not initialized');
  }
  
  const config = options.config || require('../../config/cdn').getCdnConfig();
  
  if (!config.options.distributionId) {
    throw new Error('CloudFront distribution ID not configured');
  }
  
  // Create a unique reference for the invalidation
  const callerReference = `tourguideai-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  
  // Prepare invalidation parameters
  const params = {
    DistributionId: config.options.distributionId,
    InvalidationBatch: {
      CallerReference: callerReference,
      Paths: {
        Quantity: paths.length,
        Items: paths.map(p => p.startsWith('/') ? p : `/${p}`)
      }
    }
  };
  
  try {
    // Create invalidation using AWS SDK v3
    const command = new CreateInvalidationCommand(params);
    const response = await cloudFrontClient.send(command);
    
    logger.info(`Cache invalidation created with ID: ${response.Invalidation.Id}`);
    return response.Invalidation.Id;
  } catch (error) {
    logger.error('Error invalidating CloudFront cache', { error, paths });
    throw error;
  }
}

/**
 * Check if an object exists in S3
 * @param {string} s3Path - Path to the object in S3
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} Whether the object exists
 */
async function objectExists(s3Path, options = {}) {
  if (!s3Client) {
    throw new Error('Storage client not initialized');
  }
  
  const config = options.config || require('../../config/cdn').getCdnConfig();
  
  const params = {
    Bucket: config.options.bucketName,
    Key: s3Path
  };
  
  try {
    // Check if object exists using AWS SDK v3
    const command = new HeadObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  initialize,
  uploadAsset,
  generatePresignedUrl,
  invalidateCloudFront,
  objectExists
}; 