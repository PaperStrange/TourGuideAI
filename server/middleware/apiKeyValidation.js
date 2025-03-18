/**
 * API Key Validation Middleware
 * 
 * This middleware validates that the required API keys are set in environment variables.
 * It prevents the application from making API calls if keys are missing.
 */

const keyManager = require('../utils/keyManager');

/**
 * Validates that the OpenAI API key is set and valid
 */
const validateOpenAIApiKey = async (req, res, next) => {
  try {
    const keyId = process.env.OPENAI_KEY_ID;
    
    if (!keyId) {
      return res.status(500).json({
        error: {
          message: 'OpenAI API key ID not configured. Please set the OPENAI_KEY_ID environment variable.',
          type: 'api_key_missing'
        }
      });
    }

    // Validate and get the key
    const isValid = await keyManager.validateKey(keyId);
    if (!isValid) {
      return res.status(500).json({
        error: {
          message: 'OpenAI API key is invalid or needs rotation.',
          type: 'api_key_invalid'
        }
      });
    }

    // Get the key and add it to the request
    const apiKey = await keyManager.getKey(keyId);
    req.openaiApiKey = apiKey;
    
    // Add key stats to response headers for monitoring
    const stats = keyManager.getKeyStats(keyId);
    res.setHeader('X-OpenAI-Key-Stats', JSON.stringify({
      lastUsed: stats.lastUsed,
      usageCount: stats.usageCount,
      daysUntilRotation: stats.daysUntilRotation
    }));

    next();
  } catch (error) {
    return res.status(500).json({
      error: {
        message: 'Error validating OpenAI API key',
        type: 'api_key_error',
        details: error.message
      }
    });
  }
};

/**
 * Validates that the Google Maps API key is set and valid
 */
const validateGoogleMapsApiKey = async (req, res, next) => {
  try {
    const keyId = process.env.GOOGLE_MAPS_KEY_ID;
    
    if (!keyId) {
      return res.status(500).json({
        error: {
          message: 'Google Maps API key ID not configured. Please set the GOOGLE_MAPS_KEY_ID environment variable.',
          type: 'api_key_missing'
        }
      });
    }

    // Validate and get the key
    const isValid = await keyManager.validateKey(keyId);
    if (!isValid) {
      return res.status(500).json({
        error: {
          message: 'Google Maps API key is invalid or needs rotation.',
          type: 'api_key_invalid'
        }
      });
    }

    // Get the key and add it to the request
    const apiKey = await keyManager.getKey(keyId);
    req.googleMapsApiKey = apiKey;
    
    // Add key stats to response headers for monitoring
    const stats = keyManager.getKeyStats(keyId);
    res.setHeader('X-GoogleMaps-Key-Stats', JSON.stringify({
      lastUsed: stats.lastUsed,
      usageCount: stats.usageCount,
      daysUntilRotation: stats.daysUntilRotation
    }));

    next();
  } catch (error) {
    return res.status(500).json({
      error: {
        message: 'Error validating Google Maps API key',
        type: 'api_key_error',
        details: error.message
      }
    });
  }
};

/**
 * Middleware to check if any API keys need rotation
 */
const checkKeyRotation = async (req, res, next) => {
  try {
    const keys = keyManager.listKeys();
    const keysNeedingRotation = keys.filter(key => {
      const stats = keyManager.getKeyStats(key.keyId);
      return stats.daysUntilRotation <= 1; // Keys that need rotation within 24 hours
    });

    if (keysNeedingRotation.length > 0) {
      // Log warning about keys needing rotation
      console.warn('API keys needing rotation:', keysNeedingRotation);
      
      // Add warning header to response
      res.setHeader('X-API-Key-Rotation-Warning', JSON.stringify(
        keysNeedingRotation.map(key => ({
          type: key.type,
          keyId: key.keyId,
          daysUntilRotation: keyManager.getKeyStats(key.keyId).daysUntilRotation
        }))
      ));
    }

    next();
  } catch (error) {
    console.error('Error checking key rotation:', error);
    next();
  }
};

module.exports = {
  validateOpenAIApiKey,
  validateGoogleMapsApiKey,
  checkKeyRotation
}; 