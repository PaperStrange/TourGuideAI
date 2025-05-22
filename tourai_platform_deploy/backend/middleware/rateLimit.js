/**
 * Rate Limiting Middleware
 * 
 * This middleware implements rate limiting to protect API endpoints
 * from abuse and to help manage API costs and quotas.
 */

const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Create a logger instance for rate limiting
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Creates a rate limiter middleware with the specified configuration
 * 
 * @param {Object} options - Rate limiter configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests in the time window
 * @param {string} options.keyPrefix - Prefix for the rate limit keys
 * @param {string} options.message - Message to return when rate limit is exceeded
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  // Default options
  const defaults = {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes by default
    max: process.env.RATE_LIMIT_MAX || 100, // 100 requests per windowMs by default
    keyPrefix: 'rl',
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  };

  const config = { ...defaults, ...options };

  // Create the rate limiter
  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    keyGenerator: (req) => {
      // Use IP address as the key by default
      return `${config.keyPrefix}:${req.ip}`;
    },
    handler: (req, res) => {
      // Log rate limit exceeded
      logger.warn(`Rate limit exceeded: ${req.ip} - ${req.method} ${req.originalUrl}`);
      
      // Return rate limit exceeded error
      res.status(429).json({
        error: {
          status: 429,
          id: `rate-limit-exceeded-${Date.now()}`,
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message,
          retry_after: Math.ceil(config.windowMs / 1000)
        }
      });
    },
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    skipFailedRequests: config.skipFailedRequests,
    skipSuccessfulRequests: config.skipSuccessfulRequests
  });

  return limiter;
};

// Create different rate limiters for different API routes
const openaiLimiter = createRateLimiter({
  keyPrefix: 'rl:openai',
  message: 'Too many OpenAI API requests, please try again later',
  windowMs: process.env.OPENAI_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.OPENAI_RATE_LIMIT_MAX || 50
});

const mapsLimiter = createRateLimiter({
  keyPrefix: 'rl:maps',
  message: 'Too many Google Maps API requests, please try again later',
  windowMs: process.env.MAPS_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.MAPS_RATE_LIMIT_MAX || 100
});

// Global rate limiter for all API routes
const globalLimiter = createRateLimiter({
  keyPrefix: 'rl:global',
  message: 'Too many API requests, please try again later'
});

module.exports = {
  createRateLimiter,
  openaiLimiter,
  mapsLimiter,
  globalLimiter
}; 