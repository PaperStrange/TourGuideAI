#!/usr/bin/env node

/**
 * CDN Deployment Script
 * 
 * This script uploads static assets from the build directory to the CDN.
 * It also invalidates the CloudFront cache for the uploaded files.
 * 
 * Usage:
 *   node scripts/deploy-to-cdn.js [--dry-run] [--invalidate-all]
 * 
 * Options:
 *   --dry-run       Don't actually upload files, just log what would be done
 *   --invalidate-all Invalidate all files in the CDN, not just the uploaded ones
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const crypto = require('crypto');
const { getCdnConfig } = require('../server/config/cdn');
const { uploadToS3, uploadMultipleToS3, invalidateCache } = require('../server/utils/cdnManager');

// Simple log utility functions
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warning: (msg) => console.warn(`[WARNING] ${msg}`)
};

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const invalidateAll = args.includes('--invalidate-all');

// Configuration
const buildDir = path.join(__dirname, '../build');
const staticDir = path.join(buildDir, 'static');

/**
 * Calculate file hash for cache busting
 * @param {string} filePath - Path to the file
 * @returns {string} - MD5 hash of the file
 */
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Deploy static assets to the CDN
 */
async function deployToCdn() {
  log.info('Starting CDN deployment...');
  let config = getCdnConfig();
  
  // For dry run, override config to always be enabled
  if (dryRun) {
    log.info('Dry run mode: enabling CDN in development for testing');
    config = {
      ...config,
      enabled: true,
      provider: 'cloudfront',
      baseUrl: 'https://test-cdn.tourguideai.com',
      options: {
        ...config.options,
        region: 'us-east-1',
        bucketName: 'test-assets-tourguideai',
        distributionId: 'TEST123456',
        s3FolderPath: 'assets/',
        maxAge: 86400
      }
    };
  }
  
  if (!config.enabled) {
    log.error('CDN is not enabled in the current environment');
    process.exit(1);
  }
  
  try {
    log.info('Checking build directory...');
    
    // Check if build directory exists
    if (!fs.existsSync(buildDir)) {
      log.error(`Build directory not found: ${buildDir}`);
      log.warning('Run "npm run build" to create the build directory first');
      process.exit(1);
    }
    
    // Check if static directory exists
    if (!fs.existsSync(staticDir)) {
      log.error(`Static directory not found: ${staticDir}`);
      log.warning('Make sure the build process creates a static directory');
      process.exit(1);
    }
    
    // Find all static files
    log.info('Finding static assets...');
    const staticFiles = glob.sync('**/*.*', { cwd: staticDir, nodir: true });
    
    log.success(`Found ${staticFiles.length} static files`);
    
    if (dryRun) {
      log.warning('Dry run mode: no files will be uploaded');
    }
    
    // Prepare upload queue
    const uploadQueue = staticFiles.map(file => {
      const localPath = path.join(staticDir, file);
      const fileExt = path.extname(file).toLowerCase();
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      if (fileExt === '.js') contentType = 'application/javascript';
      else if (fileExt === '.css') contentType = 'text/css';
      else if (fileExt === '.html') contentType = 'text/html';
      else if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
      else if (fileExt === '.png') contentType = 'image/png';
      else if (fileExt === '.svg') contentType = 'image/svg+xml';
      else if (fileExt === '.json') contentType = 'application/json';
      
      // Determine cache control based on file type
      let cacheControl;
      if (fileExt === '.html') {
        cacheControl = 'max-age=3600'; // 1 hour for HTML
      } else if (fileExt === '.js' || fileExt === '.css') {
        cacheControl = `max-age=${config.options.maxAge}`; // Long-term for immutable assets
      } else {
        cacheControl = `max-age=${config.options.maxAge}`; // Long-term for images and other static
      }
      
      // Calculate hash for cache busting
      const fileHash = calculateFileHash(localPath);
      
      // Create destination path with hash for cache busting
      const fileDir = path.dirname(file);
      const fileName = path.basename(file);
      const destPath = `${config.options.s3FolderPath}${fileDir === '.' ? '' : fileDir + '/'}${fileHash.substring(0, 8)}-${fileName}`;
      
      return {
        localPath,
        destPath,
        options: {
          contentType,
          cacheControl
        }
      };
    });
    
    // Upload files
    let uploadedFiles = [];
    if (dryRun) {
      // Just log what would be uploaded
      uploadQueue.forEach(file => {
        log.info(`Would upload: ${file.localPath} to ${file.destPath}`);
        log.info(`  Content-Type: ${file.options.contentType}`);
        log.info(`  Cache-Control: ${file.options.cacheControl}`);
      });
    } else {
      // Actually upload the files
      log.info('Uploading files to CDN...');
      
      // Upload in batches to avoid overwhelming the network
      const batchSize = 5;
      for (let i = 0; i < uploadQueue.length; i += batchSize) {
        const batch = uploadQueue.slice(i, i + batchSize);
        log.info(`Uploading files to CDN (${i + 1}-${Math.min(i + batch.length, uploadQueue.length)} of ${uploadQueue.length})...`);
        
        const batchResults = await uploadMultipleToS3(batch);
        uploadedFiles = [...uploadedFiles, ...batchResults];
        
        log.info(`Uploaded ${Math.min(i + batch.length, uploadQueue.length)} of ${uploadQueue.length} files...`);
      }
      
      log.success(`Uploaded ${uploadedFiles.length} files to CDN`);
    }
    
    // Invalidate cache if needed
    if (invalidateAll && !dryRun) {
      log.info('Invalidating CloudFront cache...');
      
      await invalidateCache(['/*']);
      
      log.success('Invalidated entire CloudFront cache');
    } else if (!dryRun) {
      // No need to invalidate cache for static assets with hash-based filenames
      log.info('No cache invalidation needed for hash-named static assets');
    }
    
    log.success('CDN deployment completed successfully!');
  } catch (error) {
    log.error('CDN deployment failed');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the deployment
deployToCdn(); 