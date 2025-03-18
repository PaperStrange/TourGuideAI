/**
 * OpenAI API Service for TourGuideAI
 * 
 * This file contains implementations of OpenAI API functions for travel planning
 * using GPT models to generate personalized travel content.
 * 
 * @requires API_KEY - An OpenAI API key must be configured
 */

// Initialize API key from environment variables if available
if (process.env.REACT_APP_OPENAI_API_KEY) {
  setApiKey(process.env.REACT_APP_OPENAI_API_KEY);
}

// Make debug mode follow the NODE_ENV by default
setDebugMode(process.env.NODE_ENV === 'development');

// OpenAI API configuration
let config = {
  apiKey: '', // Set via setApiKey
  model: 'gpt-4o', // Default model
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  debug: false
};

/**
 * Set the OpenAI API key
 * @param {string} apiKey - The OpenAI API key
 */
export const setApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    throw new Error('Invalid API key format');
  }
  config.apiKey = apiKey;
  console.log('OpenAI API key configured successfully');
  return true;
};

/**
 * Set the OpenAI model to use
 * @param {string} model - The model name (e.g., 'gpt-4o', 'gpt-4-turbo')
 */
export const setModel = (model) => {
  config.model = model;
  console.log(`OpenAI model set to ${model}`);
  return true;
};

/**
 * Enable or disable debug logging
 * @param {boolean} enabled - Whether to enable debug logging
 */
export const setDebugMode = (enabled) => {
  config.debug = !!enabled;
  console.log(`Debug mode ${config.debug ? 'enabled' : 'disabled'}`);
  return true;
};

/**
 * Log debug messages if debug mode is enabled
 * @param {string} message - The message to log
 * @param {object} data - Optional data to log
 */
const debugLog = (message, data) => {
  if (config.debug) {
    console.log(`[OpenAI API] ${message}`, data || '');
  }
};

/**
 * Make a call to the OpenAI API
 * @param {object} messages - Array of message objects for the conversation
 * @param {object} options - Additional options for the API call
 * @returns {Promise<object>} - The API response
 */
const callOpenAI = async (messages, options = {}) => {
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured. Use setApiKey() to configure it.');
  }

  const requestOptions = {
    model: options.model || config.model,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    max_tokens: options.max_tokens || 2000,
    top_p: options.top_p || 1,
    frequency_penalty: options.frequency_penalty || 0,
    presence_penalty: options.presence_penalty || 0,
    response_format: options.response_format || { type: "json_object" }
  };

  debugLog('Making API call with options', requestOptions);

  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestOptions)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    debugLog('API response received', data);
    
    // Extract the content from the response
    const content = data.choices[0].message.content;
    
    try {
      // Parse JSON content
      return JSON.parse(content);
    } catch (parseError) {
      debugLog('Error parsing JSON response', { error: parseError, content });
      // If JSON parsing fails, return the raw content
      return { raw_content: content, error: 'JSON_PARSE_ERROR' };
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

/**
 * Function to recognize text intent from user input
 * @param {string} userInput - The user's query text
 * @returns {Promise<object>} - Structured intent data
 */
export const recognizeTextIntent = async (userInput) => {
  debugLog('Recognizing text intent for:', userInput);
  
  const messages = [
    {
      role: 'system',
      content: `You are a travel planning assistant that extracts travel intent from user queries.
      Extract the following information from the user's query and return as a JSON object:
      - arrival: destination location
      - departure: departure location (if mentioned)
      - arrival_date: arrival date or time period (if mentioned)
      - departure_date: departure date (if mentioned)
      - travel_duration: duration of the trip (e.g., "3 days", "weekend", "week")
      - entertainment_prefer: preferred entertainment or activities (if mentioned)
      - transportation_prefer: preferred transportation methods (if mentioned)
      - accommodation_prefer: preferred accommodation types (if mentioned)
      - total_cost_prefer: budget information (if mentioned)
      - user_time_zone: inferred time zone (default to "Unknown")
      - user_personal_need: any special requirements or preferences (if mentioned)
      
      If any field is not mentioned, use an empty string.`
    },
    {
      role: 'user',
      content: userInput
    }
  ];
  
  return await callOpenAI(messages, {
    temperature: 0.3, // Lower temperature for more deterministic extraction
  });
};

/**
 * Function to generate a route based on user input
 * @param {string} userInput - The user's query text
 * @returns {Promise<object>} - Generated route data
 */
export const generateRoute = async (userInput) => {
  debugLog('Generating route for:', userInput);
  
  // First, recognize the intent from the user's input
  const intent = await recognizeTextIntent(userInput);
  
  // Create a detailed prompt based on the recognized intent
  const messages = [
    {
      role: 'system',
      content: `You are a travel planning assistant that creates detailed travel itineraries.
      Create a comprehensive travel plan based on the user's query and the extracted intent.
      Include the following in your response as a JSON object:
      - route_name: A catchy name for this travel route
      - destination: The main destination
      - duration: Duration of the trip in days
      - start_date: Suggested start date (if applicable)
      - end_date: Suggested end date (if applicable)
      - overview: A brief overview of the trip
      - highlights: Array of top highlights/attractions
      - daily_itinerary: Array of day objects with activities
      - estimated_costs: Breakdown of estimated costs
      - recommended_transportation: Suggestions for getting around
      - accommodation_suggestions: Array of accommodation options
      - best_time_to_visit: Information about ideal visiting periods
      - travel_tips: Array of useful tips for this destination`
    },
    {
      role: 'user',
      content: `Generate a travel plan for: "${userInput}".
      
      Here's what I've understood about this request:
      Destination: ${intent.arrival || 'Not specified'}
      Duration: ${intent.travel_duration || 'Not specified'}
      Arrival date: ${intent.arrival_date || 'Not specified'}
      Entertainment preferences: ${intent.entertainment_prefer || 'Not specified'}
      Transportation preferences: ${intent.transportation_prefer || 'Not specified'}
      Accommodation preferences: ${intent.accommodation_prefer || 'Not specified'}
      Budget: ${intent.total_cost_prefer || 'Not specified'}
      Special needs: ${intent.user_personal_need || 'Not specified'}`
    }
  ];
  
  return await callOpenAI(messages, {
    temperature: 0.7,
    max_tokens: 2500
  });
};

/**
 * Function to generate a random route
 * @returns {Promise<object>} - Generated random route data
 */
export const generateRandomRoute = async () => {
  debugLog('Generating random route');
  
  const messages = [
    {
      role: 'system',
      content: `You are a travel planning assistant that creates surprising and interesting travel itineraries.
      Create a completely random but interesting travel itinerary to a destination that most travelers find appealing.
      Include the following in your response as a JSON object:
      - route_name: A catchy name for this travel route
      - destination: The main destination you've chosen
      - duration: Duration of the trip in days (choose something between 2-7 days)
      - overview: A brief overview of the trip
      - highlights: Array of top highlights/attractions
      - daily_itinerary: Array of day objects with activities
      - estimated_costs: Breakdown of estimated costs
      - recommended_transportation: Suggestions for getting around
      - accommodation_suggestions: Array of accommodation options
      - travel_tips: Array of useful tips for this destination`
    },
    {
      role: 'user',
      content: 'Surprise me with an interesting travel itinerary to somewhere exciting!'
    }
  ];
  
  return await callOpenAI(messages, {
    temperature: 0.9, // Higher temperature for more randomness
    max_tokens: 2500
  });
};

/**
 * Function to split route by day
 * @param {object} route - Route data to split
 * @returns {Promise<array>} - Array of daily itineraries
 */
export const splitRouteByDay = async (route) => {
  debugLog('Splitting route by day:', route);
  
  const messages = [
    {
      role: 'system',
      content: `You are a travel planning assistant that creates detailed daily itineraries.
      Based on the provided route information, create a day-by-day itinerary.
      For each day, include:
      - travel_day: Day number
      - current_date: Suggested date for this day
      - dairy_routes: Array of activities with:
         - time: Suggested time (e.g., "9:00 AM")
         - activity: Description of the activity
         - location: Where the activity takes place
         - duration: How long it will take
         - transportation: How to get there if applicable
         - cost: Estimated cost if applicable
         - notes: Any special notes or tips`
    },
    {
      role: 'user',
      content: `Create a detailed day-by-day itinerary for the following trip:
      
      Destination: ${route.destination || 'Unknown location'}
      Duration: ${route.duration || '3 days'}
      Overview: ${route.overview || 'No overview provided'}
      Highlights: ${Array.isArray(route.highlights) ? route.highlights.join(', ') : 'No highlights provided'}`
    }
  ];
  
  return await callOpenAI(messages, {
    temperature: 0.7,
    max_tokens: 2500
  });
};

/**
 * Get the current configuration status
 * @returns {object} - The current configuration
 */
export const getStatus = () => {
  return {
    isConfigured: !!config.apiKey,
    model: config.model,
    debug: config.debug
  };
};

export default {
  setApiKey,
  setModel,
  setDebugMode,
  getStatus,
  recognizeTextIntent,
  generateRoute,
  generateRandomRoute,
  splitRouteByDay
}; 