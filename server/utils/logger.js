/**
 * Logger Utility
 * 
 * This module provides a centralized logging system for the application
 * with proper formatting, log levels, and transports.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (for more readable logs in terminal)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'tourguide-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error' 
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
    })
  ],
  exitOnError: false
});

/**
 * Log API requests (similar to morgan but with more control)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 * @returns {void}
 */
logger.logApiRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip } = req;
  const statusCode = res.statusCode;
  
  const logData = {
    method,
    url: originalUrl,
    status: statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userAgent: req.get('User-Agent') || 'unknown'
  };
  
  // Log at different levels based on status code
  if (statusCode >= 500) {
    logger.error('API Request', logData);
  } else if (statusCode >= 400) {
    logger.warn('API Request', logData);
  } else {
    logger.info('API Request', logData);
  }
};

/**
 * Create a child logger with additional metadata
 * @param {Object} metadata - Additional metadata to include in logs
 * @returns {Object} Child logger instance
 */
logger.child = (metadata) => {
  return logger.child(metadata);
};

/**
 * Log OpenAI API interaction
 * @param {string} endpoint - OpenAI API endpoint
 * @param {Object} request - Request data
 * @param {Object} response - Response data (optional)
 * @param {Error} error - Error object (optional)
 */
logger.logOpenAI = (endpoint, request, response = null, error = null) => {
  const logData = {
    api: 'openai',
    endpoint,
    requestData: {
      model: request.model,
      prompt_tokens: request.messages ? request.messages.length : 0
    }
  };
  
  if (response) {
    logData.responseData = {
      model: response.model,
      usage: response.usage,
      processingTime: response.processing_ms
    };
    logger.debug('OpenAI API call', logData);
  }
  
  if (error) {
    logData.error = {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      status: error.status
    };
    logger.error('OpenAI API error', logData);
  }
};

/**
 * Log Google Maps API interaction
 * @param {string} endpoint - Google Maps API endpoint
 * @param {Object} params - Request parameters
 * @param {Object} response - Response data (optional)
 * @param {Error} error - Error object (optional)
 */
logger.logGoogleMaps = (endpoint, params, response = null, error = null) => {
  const logData = {
    api: 'googlemaps',
    endpoint,
    requestParams: params
  };
  
  if (response) {
    logData.responseData = {
      status: response.status,
      resultCount: Array.isArray(response.results) ? response.results.length : 'n/a'
    };
    logger.debug('Google Maps API call', logData);
  }
  
  if (error) {
    logData.error = {
      message: error.message,
      code: error.code,
      status: error.status
    };
    logger.error('Google Maps API error', logData);
  }
};

module.exports = logger; 