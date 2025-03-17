/**
 * TourGuideAI API Server
 * 
 * This server provides secure API proxying for OpenAI and Google Maps APIs,
 * with authentication, rate limiting, and caching.
 */

// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const responseTime = require('response-time');
const path = require('path');

// Custom utilities and middleware
const logger = require('./utils/logger');
const { globalLimiter, openaiLimiter, mapsLimiter } = require('./middleware/rateLimit');

// Import API routes
const openaiRoutes = require('./routes/openai');
const mapsRoutes = require('./routes/googlemaps');

// Initialize Express app
const app = express();

// Basic security headers
app.use(helmet());

// Request logging
app.use(morgan('combined'));
app.use(responseTime((req, res, time) => {
  logger.logApiRequest(req, res, time);
}));

// Parse JSON request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply rate limiting
app.use(globalLimiter);
app.use('/api/openai', openaiLimiter);
app.use('/api/maps', mapsLimiter);

// API routes
app.use('/api/openai', openaiRoutes);
app.use('/api/maps', mapsRoutes);

// Serve static files from the frontend build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Serve the React frontend for any other request
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const errorId = `err-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Log the error
  logger.error('Unhandled error', {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  // Send error response
  res.status(err.status || 500).json({
    error: {
      id: errorId,
      status: err.status || 500,
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`TourGuideAI API server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`Server started at ${new Date().toISOString()}`);
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  
  // Give the server time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports = app; 