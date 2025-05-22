/**
 * CDN Middleware
 * 
 * Middleware to handle CDN integration for static assets.
 * This middleware will rewrite URLs for static assets to use the CDN in production.
 */

const { getCdnUrl, getCdnConfig } = require('../config/cdn');
const logger = require('../utils/logger');

/**
 * Middleware to inject CDN URLs into the response
 */
const cdnMiddleware = (req, res, next) => {
  const config = getCdnConfig();
  
  // Skip if CDN is not enabled
  if (!config.enabled) {
    return next();
  }

  // Store the original send function
  const originalSend = res.send;

  // Override the send function to rewrite asset URLs
  res.send = function(body) {
    try {
      // Only process HTML responses
      const contentType = res.get('Content-Type');
      if (contentType && contentType.includes('text/html') && typeof body === 'string') {
        // Replace static asset URLs with CDN URLs
        // This is a simple example - in production, you might want to use a more robust HTML parser
        const modifiedBody = body.replace(
          /(src|href)=["'](\/static\/[^"']+)["']/g,
          (match, attr, url) => `${attr}="${getCdnUrl(url)}"`
        );
        
        // Call the original send with the modified body
        return originalSend.call(this, modifiedBody);
      }
    } catch (error) {
      logger.error('Error in CDN middleware while processing response', { error });
    }
    
    // Call the original send if no modifications needed or on error
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Express middleware to rewrite static asset URLs for CDN
 */
const staticAssetCdnMiddleware = (req, res, next) => {
  const config = getCdnConfig();
  
  // Skip if CDN is not enabled or not a static asset request
  if (!config.enabled || !req.path.startsWith('/static/')) {
    return next();
  }
  
  // Get the CDN URL for the requested asset
  const cdnUrl = getCdnUrl(req.path);
  
  // Redirect to the CDN URL
  res.redirect(cdnUrl);
};

module.exports = {
  cdnMiddleware,
  staticAssetCdnMiddleware
}; 