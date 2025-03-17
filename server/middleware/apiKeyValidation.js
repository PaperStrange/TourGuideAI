/**
 * API Key Validation Middleware
 * 
 * This middleware validates that the required API keys are set in environment variables.
 * It prevents the application from making API calls if keys are missing.
 */

/**
 * Validates that the OpenAI API key is set
 */
const validateOpenAIApiKey = (req, res, next) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return res.status(500).json({
      error: {
        message: 'OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.',
        type: 'api_key_missing'
      }
    });
  }
  
  // Add API key to request for downstream middleware/routes
  req.openaiApiKey = apiKey;
  next();
};

/**
 * Validates that the Google Maps API key is set
 */
const validateGoogleMapsApiKey = (req, res, next) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return res.status(500).json({
      error: {
        message: 'Google Maps API key not configured. Please set the GOOGLE_MAPS_API_KEY environment variable.',
        type: 'api_key_missing'
      }
    });
  }
  
  // Add API key to request for downstream middleware/routes
  req.googleMapsApiKey = apiKey;
  next();
};

module.exports = {
  validateOpenAIApiKey,
  validateGoogleMapsApiKey
}; 