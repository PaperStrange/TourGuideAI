/**
 * API Key Validation Middleware
 * 
 * This middleware validates and securely provides API keys for external services.
 * It uses the tokenProvider service to securely access keys from the vault.
 */

const tokenProvider = require('../utils/tokenProvider');
const logger = require('../utils/logger');

/**
 * Validates and provides the OpenAI API key
 */
const validateOpenAIApiKey = async (req, res, next) => {
  try {
    // Get the API key from token provider
    const apiKey = await tokenProvider.getOpenAIToken();
    
    // Add API key to request
    req.openaiApiKey = apiKey;
    
    next();
  } catch (error) {
    logger.error('Error retrieving OpenAI API key', { error });
    
    return res.status(500).json({
      error: {
        message: 'OpenAI API key not available',
        type: 'api_key_error'
      }
    });
  }
};

/**
 * Validates and provides the Google Maps API key
 */
const validateGoogleMapsApiKey = async (req, res, next) => {
  try {
    // Get the API key from token provider
    const apiKey = await tokenProvider.getGoogleMapsToken();
    
    // Add API key to request
    req.googleMapsApiKey = apiKey;
    
    next();
  } catch (error) {
    logger.error('Error retrieving Google Maps API key', { error });
    
    return res.status(500).json({
      error: {
        message: 'Google Maps API key not available',
        type: 'api_key_error'
      }
    });
  }
};

/**
 * Middleware to check if any API keys need rotation
 */
const checkKeyRotation = async (req, res, next) => {
  try {
    // Get tokens needing rotation
    const tokensNeedingRotation = await tokenProvider.getTokensNeedingRotation();
    
    if (tokensNeedingRotation.length > 0) {
      // Log warning about keys needing rotation
      logger.warn('API keys needing rotation', { tokensNeedingRotation });
      
      // Add warning header to response
      res.setHeader('X-API-Key-Rotation-Warning', JSON.stringify(
        tokensNeedingRotation.map(token => ({
          service: token.serviceName,
          rotationDue: token.rotationDue
        }))
      ));
    }
    
    next();
  } catch (error) {
    logger.error('Error checking key rotation', { error });
    next(); // Continue despite error
  }
};

module.exports = {
  validateOpenAIApiKey,
  validateGoogleMapsApiKey,
  checkKeyRotation
}; 