/**
 * OpenAI API Routes
 * 
 * This module provides API routes for interacting with OpenAI services,
 * with proper error handling, validation, and caching.
 */

const express = require('express');
const router = express.Router();
const { validateOpenAIApiKey } = require('../middleware/apiKeyValidation');
const { cacheMiddleware } = require('../middleware/caching');
const { createOpenAIClient, handleApiError, validateParams } = require('../utils/apiHelpers');

// Cache duration in milliseconds (default: 1 hour)
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 3600000;

// Apply API key validation middleware to all routes
router.use(validateOpenAIApiKey);

/**
 * @route POST /api/openai/recognize-intent
 * @description Recognize travel intent from text
 * @access Public
 */
router.post('/recognize-intent', cacheMiddleware(CACHE_DURATION, 'openai:intent'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.body, {
      text: { required: true, type: 'string' }
    });
    
    const openaiClient = createOpenAIClient(req.openaiApiKey);
    
    const response = await openaiClient.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
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
          content: params.text
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    // Extract the response content
    const content = response.data.choices[0].message.content;
    
    // Parse the JSON response
    const intentData = JSON.parse(content);
    
    // Add debug info
    const debugInfo = {
      model: response.data.model,
      usage: response.data.usage,
      processing_time: response.data.processing_ms
    };
    
    res.json({
      intent: intentData,
      debug: debugInfo
    });
  } catch (error) {
    const formattedError = handleApiError(error, 'openai');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route POST /api/openai/generate-route
 * @description Generate a travel route based on user input
 * @access Public
 */
router.post('/generate-route', cacheMiddleware(CACHE_DURATION, 'openai:route'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.body, {
      text: { required: true, type: 'string' },
      intent: { required: false, type: 'object', default: {} }
    });
    
    const openaiClient = createOpenAIClient(req.openaiApiKey);
    
    // Intent data
    const intent = params.intent;
    
    const response = await openaiClient.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
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
          content: `Generate a travel plan for: "${params.text}".
          
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
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });
    
    // Extract the response content
    const content = response.data.choices[0].message.content;
    
    // Parse the JSON response
    const routeData = JSON.parse(content);
    
    // Add debug info
    const debugInfo = {
      model: response.data.model,
      usage: response.data.usage,
      processing_time: response.data.processing_ms
    };
    
    res.json({
      route: routeData,
      debug: debugInfo
    });
  } catch (error) {
    const formattedError = handleApiError(error, 'openai');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route POST /api/openai/generate-random-route
 * @description Generate a random travel route
 * @access Public
 */
router.post('/generate-random-route', cacheMiddleware(CACHE_DURATION, 'openai:random'), async (req, res) => {
  try {
    const openaiClient = createOpenAIClient(req.openaiApiKey);
    
    const response = await openaiClient.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
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
      ],
      temperature: 0.9,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });
    
    // Extract the response content
    const content = response.data.choices[0].message.content;
    
    // Parse the JSON response
    const randomRouteData = JSON.parse(content);
    
    // Add debug info
    const debugInfo = {
      model: response.data.model,
      usage: response.data.usage,
      processing_time: response.data.processing_ms
    };
    
    res.json({
      route: randomRouteData,
      debug: debugInfo
    });
  } catch (error) {
    const formattedError = handleApiError(error, 'openai');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route POST /api/openai/split-route-by-day
 * @description Split a route into daily itineraries
 * @access Public
 */
router.post('/split-route-by-day', cacheMiddleware(CACHE_DURATION, 'openai:split'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.body, {
      route: { required: true, type: 'object' }
    });
    
    const openaiClient = createOpenAIClient(req.openaiApiKey);
    
    const route = params.route;
    
    const response = await openaiClient.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a travel planning assistant that creates detailed daily itineraries.
          Based on the provided route information, create a day-by-day itinerary.
          For each day, include:
          - travel_day: Day number
          - current_date: Suggested date for this day
          - dairy_routes: Array of activities with:
             - route_id: Unique identifier for this route (format: r001, r002, etc.)
             - departure_site: Starting point for this leg
             - arrival_site: Ending point for this leg
             - departure_time: Suggested departure time (include timezone)
             - arrival_time: Estimated arrival time (include timezone)
             - user_time_zone: User's time zone (e.g., "GMT-4")
             - transportation_type: How to get there (e.g., "walk", "drive", "public_transit")
             - duration: Estimated duration
             - duration_unit: Unit for duration (e.g., "minute", "hour")
             - distance: Estimated distance
             - distance_unit: Unit for distance (e.g., "mile", "km")
             - recommended_reason: Why this site is recommended`
        },
        {
          role: 'user',
          content: `Create a detailed day-by-day itinerary for the following trip:
          
          Destination: ${route.destination || 'Unknown location'}
          Duration: ${route.duration || '3 days'}
          Overview: ${route.overview || 'No overview provided'}
          Highlights: ${Array.isArray(route.highlights) ? route.highlights.join(', ') : 'No highlights provided'}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });
    
    // Extract the response content
    const content = response.data.choices[0].message.content;
    
    // Parse the JSON response
    const timelineData = JSON.parse(content);
    
    // Add debug info
    const debugInfo = {
      model: response.data.model,
      usage: response.data.usage,
      processing_time: response.data.processing_ms
    };
    
    res.json({
      timeline: timelineData,
      debug: debugInfo
    });
  } catch (error) {
    const formattedError = handleApiError(error, 'openai');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

module.exports = router; 