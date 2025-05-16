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
const fs = require('fs');

// Custom utilities and middleware
const logger = require('./utils/logger');
const tokenProvider = require('./utils/tokenProvider');
const { globalLimiter, openaiLimiter, mapsLimiter } = require('./middleware/rateLimit');
const { validateOpenAIApiKey, validateGoogleMapsApiKey, checkKeyRotation } = require('./middleware/apiKeyValidation');
const { fullOptionalAuth } = require('./middleware/authMiddleware');
const { cdnMiddleware, staticAssetCdnMiddleware } = require('./middleware/cdnMiddleware');
const betaUsers = require('./models/betaUsers');
const inviteCodes = require('./models/inviteCodes');

// Import API routes
const openaiRoutes = require('./routes/openai');
const mapsRoutes = require('./routes/googlemaps');
const authRoutes = require('./routes/auth');
const inviteCodeRoutes = require('./routes/inviteCodes');
const emailRoutes = require('./routes/emails');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Apply CDN middleware in production environment
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  app.use(cdnMiddleware);
  app.use(staticAssetCdnMiddleware);
  logger.info('CDN middleware applied for static asset delivery');
}

// Serve static files from public directory - FIRST in middleware chain
app.use(express.static(path.join(__dirname, 'public')));

// Initialize token provider
tokenProvider.initialize().catch(err => {
  logger.error('Failed to initialize token provider', { error: err });
});

// Initialize beta users and invite codes
betaUsers.initialize().catch(err => {
  logger.error('Failed to initialize beta users', { error: err });
});

inviteCodes.initialize().catch(err => {
  logger.error('Failed to initialize invite codes', { error: err });
});

// Basic security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3000", "*"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply rate limiting
app.use(globalLimiter);

// Check for API keys needing rotation
app.use(checkKeyRotation);

// Apply optional authentication with permissions to all routes
app.use(fullOptionalAuth);

// Auth routes
app.use('/api/auth', authRoutes);

// Invite code routes
app.use('/api/invite-codes', inviteCodeRoutes);

// Email routes
app.use('/api/emails', emailRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// API routes with key validation
app.use('/api/openai', validateOpenAIApiKey, openaiLimiter, openaiRoutes);
app.use('/api/maps', validateGoogleMapsApiKey, mapsLimiter, mapsRoutes);

// Health check endpoint - must be defined BEFORE the catch-all React handler
app.get('/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    tokenVault: {
      initialized: tokenProvider.initialized,
      backend: process.env.VAULT_BACKEND || 'local'
    }
  });
});

// Explicitly define API routes to avoid being overridden by the React app
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files from the frontend build directory in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Serve the React frontend for any other request
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
  
  logger.info('Serving production build from React app');
}

// Development-only endpoint to generate invite codes
if (process.env.NODE_ENV !== 'production') {
  app.get('/dev/generate-invite', async (req, res) => {
    try {
      // Generate a new invite code
      const code = await inviteCodes.generateCode('system-dev');
      
      // Return the code
      res.json({
        success: true,
        message: 'Generated new invite code for development',
        code: code.code,
        expiresAt: code.expiresAt
      });
    } catch (error) {
      logger.error('Error generating development invite code', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to generate invite code',
        error: error.message
      });
    }
  });
  
  // Display all invite codes
  app.get('/dev/list-invites', async (req, res) => {
    try {
      const codes = await inviteCodes.getAllCodes();
      res.json({
        success: true,
        codes: codes.map(code => ({
          code: code.code,
          isValid: code.isValid,
          used: !!code.usedBy,
          expiresAt: code.expiresAt
        }))
      });
    } catch (error) {
      logger.error('Error listing invite codes', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to list invite codes',
        error: error.message
      });
    }
  });
}

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
  logger.info(`Token Vault using ${process.env.VAULT_BACKEND || 'local'} backend`);
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