/**
 * Google Maps API Routes
 * 
 * This module provides API routes for interacting with Google Maps services,
 * with proper error handling, validation, and caching.
 */

const express = require('express');
const router = express.Router();
const { validateGoogleMapsApiKey } = require('../middleware/apiKeyValidation');
const { cacheMiddleware } = require('../middleware/caching');
const { createGoogleMapsClient, handleApiError, validateParams } = require('../utils/apiHelpers');

// Cache duration in milliseconds (default: 1 hour)
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 3600000;

// Apply API key validation middleware to all routes
router.use(validateGoogleMapsApiKey);

/**
 * @route GET /api/maps/geocode
 * @description Geocode an address to coordinates
 * @access Public
 */
router.get('/geocode', cacheMiddleware(CACHE_DURATION, 'maps:geocode'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      address: { required: true, type: 'string' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const response = await googleMapsClient.get('/geocode/json', {
      params: {
        address: params.address
      }
    });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    // Format the response
    const result = response.data.results[0] || null;
    const formattedResponse = result ? {
      location: result.geometry.location,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      address_components: result.address_components,
      viewport: result.geometry.viewport
    } : null;
    
    res.json({
      result: formattedResponse,
      status: response.data.status
    });
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route GET /api/maps/nearby
 * @description Find nearby places based on location and type
 * @access Public
 */
router.get('/nearby', cacheMiddleware(CACHE_DURATION, 'maps:nearby'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      lat: { required: true, type: 'number' },
      lng: { required: true, type: 'number' },
      radius: { required: false, type: 'number', default: 1500 },
      type: { required: false, type: 'string' },
      keyword: { required: false, type: 'string' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const queryParams = {
      location: `${params.lat},${params.lng}`,
      radius: params.radius
    };
    
    if (params.type) queryParams.type = params.type;
    if (params.keyword) queryParams.keyword = params.keyword;
    
    const response = await googleMapsClient.get('/place/nearbysearch/json', {
      params: queryParams
    });
    
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Nearby Places API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    // Format the response
    const places = response.data.results.map(place => ({
      place_id: place.place_id,
      name: place.name,
      vicinity: place.vicinity,
      location: place.geometry.location,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types,
      photos: place.photos ? place.photos.map(photo => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
        html_attributions: photo.html_attributions
      })) : []
    }));
    
    res.json({
      places: places,
      status: response.data.status,
      next_page_token: response.data.next_page_token || null,
      result_count: places.length
    });
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route GET /api/maps/directions
 * @description Get directions between two points
 * @access Public
 */
router.get('/directions', cacheMiddleware(CACHE_DURATION, 'maps:directions'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      origin: { required: true, type: 'string' },
      destination: { required: true, type: 'string' },
      mode: { required: false, type: 'string', default: 'driving' },
      waypoints: { required: false, type: 'string' },
      avoid: { required: false, type: 'string' },
      units: { required: false, type: 'string', default: 'metric' },
      arrival_time: { required: false, type: 'string' },
      departure_time: { required: false, type: 'string' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const queryParams = {
      origin: params.origin,
      destination: params.destination,
      mode: params.mode,
      units: params.units,
    };
    
    if (params.waypoints) queryParams.waypoints = params.waypoints;
    if (params.avoid) queryParams.avoid = params.avoid;
    if (params.arrival_time) queryParams.arrival_time = params.arrival_time;
    if (params.departure_time) queryParams.departure_time = params.departure_time;
    
    const response = await googleMapsClient.get('/directions/json', {
      params: queryParams
    });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Directions API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    // Format the response
    const routes = response.data.routes.map(route => ({
      summary: route.summary,
      distance: route.legs[0].distance,
      duration: route.legs[0].duration,
      start_location: route.legs[0].start_location,
      end_location: route.legs[0].end_location,
      start_address: route.legs[0].start_address,
      end_address: route.legs[0].end_address,
      steps: route.legs[0].steps.map(step => ({
        distance: step.distance,
        duration: step.duration,
        start_location: step.start_location,
        end_location: step.end_location,
        travel_mode: step.travel_mode,
        instructions: step.html_instructions,
        maneuver: step.maneuver || null
      })),
      polyline: route.overview_polyline,
      warnings: route.warnings,
      bounds: route.bounds
    }));
    
    res.json({
      routes: routes,
      status: response.data.status
    });
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route GET /api/maps/place
 * @description Get detailed information about a place
 * @access Public
 */
router.get('/place', cacheMiddleware(CACHE_DURATION, 'maps:place'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      place_id: { required: true, type: 'string' },
      fields: { required: false, type: 'string' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const queryParams = {
      place_id: params.place_id,
      fields: params.fields || 'name,rating,formatted_address,geometry,photo,price_level,type,opening_hours,website,formatted_phone_number'
    };
    
    const response = await googleMapsClient.get('/place/details/json', {
      params: queryParams
    });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Place Details API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    // Format the response
    const place = response.data.result;
    
    res.json({
      place: place,
      status: response.data.status
    });
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route GET /api/maps/photo
 * @description Get a place photo by reference
 * @access Public
 */
router.get('/photo', async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      photo_reference: { required: true, type: 'string' },
      maxwidth: { required: false, type: 'number', default: 400 },
      maxheight: { required: false, type: 'number' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const queryParams = {
      photoreference: params.photo_reference,
      maxwidth: params.maxwidth
    };
    
    if (params.maxheight) queryParams.maxheight = params.maxheight;
    
    // Photos API returns image directly, not JSON
    const response = await googleMapsClient.get('/place/photo', {
      params: queryParams,
      responseType: 'arraybuffer'
    });
    
    // Set content type based on the response
    res.set('Content-Type', response.headers['content-type']);
    
    // Return the image data
    res.send(response.data);
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

/**
 * @route GET /api/maps/autocomplete
 * @description Get place autocomplete suggestions
 * @access Public
 */
router.get('/autocomplete', cacheMiddleware(CACHE_DURATION, 'maps:autocomplete'), async (req, res) => {
  try {
    // Validate parameters
    const params = validateParams(req.query, {
      input: { required: true, type: 'string' },
      types: { required: false, type: 'string' },
      location: { required: false, type: 'string' },
      radius: { required: false, type: 'number' },
      language: { required: false, type: 'string', default: 'en' }
    });
    
    const googleMapsClient = createGoogleMapsClient(req.googleMapsApiKey);
    
    const queryParams = {
      input: params.input,
      language: params.language
    };
    
    if (params.types) queryParams.types = params.types;
    if (params.location) queryParams.location = params.location;
    if (params.radius) queryParams.radius = params.radius;
    
    const response = await googleMapsClient.get('/place/autocomplete/json', {
      params: queryParams
    });
    
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Place Autocomplete API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    // Format the response
    const predictions = response.data.predictions.map(prediction => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: prediction.structured_formatting,
      types: prediction.types
    }));
    
    res.json({
      predictions: predictions,
      status: response.data.status
    });
    
  } catch (error) {
    const formattedError = handleApiError(error, 'googlemaps');
    res.status(formattedError.status).json({ error: formattedError });
  }
});

module.exports = router; 