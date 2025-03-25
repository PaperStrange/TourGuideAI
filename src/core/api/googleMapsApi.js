/**
 * Google Maps API Service for TourGuideAI
 * 
 * This file contains implementations of Google Maps API functions for travel planning
 * using various Google Maps Platform services.
 * 
 * @requires API_KEY - A Google Maps API key must be configured
 * @requires Google Maps JavaScript API - The Google Maps library must be loaded
 */

/* global google */  // Tell ESLint that 'google' is a global variable from external script

import axios from 'axios';

// Google Maps API configuration
let config = {
  apiKey: '', // Set via setApiKey
  librariesLoaded: false,
  debug: false,
  mapInstance: null,
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  useServerProxy: process.env.REACT_APP_USE_SERVER_PROXY === 'true'
};

/**
 * Set the Google Maps API key
 * @param {string} apiKey - The Google Maps API key
 */
export const setApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    throw new Error('Invalid API key format');
  }
  config.apiKey = apiKey;
  console.log('Google Maps API key configured successfully');
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
 * Set whether to use the server proxy
 * @param {boolean} useProxy - Whether to use the server proxy
 */
export const setUseServerProxy = (useProxy) => {
  config.useServerProxy = !!useProxy;
  console.log(`Server proxy ${config.useServerProxy ? 'enabled' : 'disabled'}`);
  return true;
};

/**
 * Log debug messages if debug mode is enabled
 * @param {string} message - The message to log
 * @param {object} data - Optional data to log
 */
const debugLog = (message, data) => {
  if (config.debug) {
    console.log(`[Google Maps API] ${message}`, data || '');
  }
};

/**
 * Create API client for server requests
 * @returns {Object} API client instance
 */
const createApiClient = () => {
  return axios.create({
    baseURL: config.apiBaseUrl,
    timeout: 30000 // 30 seconds
  });
};

/**
 * Load the Google Maps JavaScript API
 * @returns {Promise<void>} - A promise that resolves when the API is loaded
 */
export const loadGoogleMapsApi = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      config.librariesLoaded = true;
      debugLog('Google Maps API already loaded');
      resolve();
      return;
    }

    if (!config.apiKey && !config.useServerProxy) {
      reject(new Error('Google Maps API key not configured. Use setApiKey() to configure it.'));
      return;
    }

    debugLog('Loading Google Maps API...');

    // Create a callback for when the API loads
    window.initGoogleMapsCallback = () => {
      config.librariesLoaded = true;
      debugLog('Google Maps API loaded successfully');
      resolve();
    };

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add script to the document
    document.head.appendChild(script);
  });
};

/**
 * Check if the Google Maps API is loaded and load it if not
 * @returns {Promise<void>} - A promise that resolves when the API is loaded
 */
const ensureApiLoaded = async () => {
  if (!config.librariesLoaded) {
    await loadGoogleMapsApi();
  }
  return Promise.resolve();
};

/**
 * Initialize a map in the provided container
 * @param {HTMLElement} container - The container element for the map
 * @param {object} options - Map initialization options
 * @returns {google.maps.Map} - The created map instance
 */
export const initializeMap = async (container, options = {}) => {
  await ensureApiLoaded();

  const defaultOptions = {
    center: { lat: 0, lng: 0 },
    zoom: 2,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    ...options
  };

  config.mapInstance = new google.maps.Map(container, defaultOptions);
  debugLog('Map initialized', defaultOptions);
  
  return config.mapInstance;
};

/**
 * Convert an address to coordinates using the Geocoding API
 * @param {string} address - The address to geocode
 * @returns {Promise<object>} - The geocoded location
 */
export const geocodeAddress = async (address) => {
  if (config.useServerProxy) {
    debugLog('Using server proxy for geocoding', { address });
    
    const apiClient = createApiClient();
    
    try {
      const response = await apiClient.get('/maps/geocode', {
        params: { address }
      });
      
      return response.data.result;
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  } else {
    await ensureApiLoaded();
    
    debugLog('Geocoding address', address);
    
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
          debugLog('Geocoding successful', results[0]);
          resolve({
            formatted_address: results[0].formatted_address,
            location: results[0].geometry.location.toJSON(),
            place_id: results[0].place_id
          });
        } else {
          const error = new Error(`Geocoding failed: ${status}`);
          debugLog('Geocoding failed', { status, error });
          reject(error);
        }
      });
    });
  }
};

/**
 * Function to display route on map
 * @param {object} route - Route information (origin, destination, waypoints)
 * @returns {Promise<object>} - The route data
 */
export const displayRouteOnMap = async (route) => {
  if (config.useServerProxy) {
    debugLog('Using server proxy for route display', { route });
    
    const apiClient = createApiClient();
    
    try {
      const response = await apiClient.get('/maps/directions', {
        params: {
          origin: route.origin || '',
          destination: route.destination || '',
          waypoints: Array.isArray(route.waypoints) ? route.waypoints.join('|') : '',
          mode: route.travelMode?.toLowerCase() || 'driving'
        }
      });
      
      // If map is initialized, also render the route
      if (config.mapInstance && window.google && window.google.maps) {
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: config.mapInstance,
          suppressMarkers: false,
          preserveViewport: false
        });
        
        // Create a DirectionsResult object from the response data
        const result = {
          routes: [response.data.route]
        };
        
        directionsRenderer.setDirections(result);
      }
      
      return response.data.route;
    } catch (error) {
      console.error('Error displaying route on map:', error);
      throw error;
    }
  } else {
    await ensureApiLoaded();
    
    if (!config.mapInstance) {
      throw new Error('Map not initialized. Call initializeMap() first.');
    }
    
    debugLog('Displaying route on map', route);
    
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: config.mapInstance,
      suppressMarkers: false,
      preserveViewport: false
    });
    
    // Prepare waypoints if any
    const waypoints = Array.isArray(route.waypoints) 
      ? route.waypoints.map(waypoint => ({
          location: waypoint,
          stopover: true
        }))
      : [];
    
    // Create request
    const request = {
      origin: route.origin || '',
      destination: route.destination || '',
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode[route.travelMode?.toUpperCase() || 'DRIVING']
    };
    
    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
          
          // Extract and format route data
          const routeData = result.routes[0];
          const legs = routeData.legs.map(leg => ({
            start_address: leg.start_address,
            end_address: leg.end_address,
            distance: leg.distance.text,
            duration: leg.duration.text,
            steps: leg.steps.map(step => ({
              instructions: step.instructions,
              distance: step.distance.text,
              duration: step.duration.text,
              travel_mode: step.travel_mode
            }))
          }));
          
          const formattedResult = {
            route: {
              summary: routeData.summary,
              bounds: {
                northeast: routeData.bounds.getNortheast().toJSON(),
                southwest: routeData.bounds.getSouthwest().toJSON()
              },
              legs: legs,
              overview_polyline: routeData.overview_polyline,
              warnings: routeData.warnings,
              total_distance: routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
              total_duration: routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0)
            }
          };
          
          debugLog('Route display successful', formattedResult);
          resolve(formattedResult);
        } else {
          const error = new Error(`Route calculation failed: ${status}`);
          debugLog('Route display failed', { status, error });
          reject(error);
        }
      });
    });
  }
};

/**
 * Function to get nearby interest points
 * @param {object|string} location - Location or position (lat/lng or place_id)
 * @param {number} radius - Search radius in meters
 * @param {string} type - Place type to search for
 * @returns {Promise<array>} - Array of nearby places
 */
export const getNearbyInterestPoints = async (location, radius = 5000, type = 'tourist_attraction') => {
  if (config.useServerProxy) {
    debugLog('Using server proxy for nearby interest points', { location, radius, type });
    
    const apiClient = createApiClient();
    
    try {
      // If location is an object with lat/lng, use those coordinates
      // Otherwise, just pass the location as is (string)
      const locationParam = typeof location === 'object' && location.lat && location.lng
        ? `${location.lat},${location.lng}`
        : location;
      
      const response = await apiClient.get('/maps/nearby', {
        params: {
          location: locationParam,
          radius: radius,
          type: type
        }
      });
      
      return response.data.places;
    } catch (error) {
      console.error('Error getting nearby interest points:', error);
      throw error;
    }
  } else {
    await ensureApiLoaded();
    
    debugLog('Getting nearby interest points', { location, radius, type });
    
    // Convert string location to coordinates if needed
    let locationObj = location;
    if (typeof location === 'string') {
      locationObj = await geocodeAddress(location);
      locationObj = locationObj.location;
    }
    
    // Create Places service
    const placesService = new google.maps.places.PlacesService(
      config.mapInstance || document.createElement('div')
    );
    
    // Create request
    const request = {
      location: locationObj,
      radius: radius,
      type: type
    };
    
    return new Promise((resolve, reject) => {
      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          // Format results
          const formattedResults = results.map(place => ({
            id: place.place_id,
            name: place.name,
            position: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            address: place.vicinity,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            types: place.types,
            photos: place.photos ? place.photos.map(photo => ({
              url: photo.getUrl({ maxWidth: 500, maxHeight: 500 }),
              height: photo.height,
              width: photo.width,
              html_attributions: photo.html_attributions
            })) : []
          }));
          
          debugLog('Nearby search successful', formattedResults);
          resolve(formattedResults);
        } else {
          const error = new Error(`Nearby search failed: ${status}`);
          debugLog('Nearby search failed', { status, error });
          reject(error);
        }
      });
    });
  }
};

/**
 * Function to validate transportation details
 * @param {object} route - Route with departure and arrival sites
 * @returns {Promise<object>} - Validated route with transportation details
 */
export const validateTransportation = async (route) => {
  if (config.useServerProxy) {
    debugLog('Using server proxy for transportation validation', { route });
    
    const apiClient = createApiClient();
    
    try {
      const response = await apiClient.post('/maps/validate-transportation', {
        departure_site: route.departure_site,
        arrival_site: route.arrival_site,
        transportation_type: route.transportation_type || 'driving'
      });
      
      return response.data.route;
    } catch (error) {
      console.error('Error validating transportation:', error);
      throw error;
    }
  } else {
    await ensureApiLoaded();
    
    debugLog('Validating transportation for route', route);
    
    if (!route.departure_site || !route.arrival_site) {
      throw new Error('Departure and arrival sites are required for transportation validation');
    }
    
    const directionsService = new google.maps.DirectionsService();
    
    // Create request
    const request = {
      origin: route.departure_site,
      destination: route.arrival_site,
      travelMode: google.maps.TravelMode[route.transportation_type?.toUpperCase() || 'DRIVING'],
      alternatives: true
    };
    
    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          // Get the best route
          const bestRoute = result.routes[0];
          const leg = bestRoute.legs[0];
          
          // Format the result
          const validatedRoute = {
            ...route,
            duration: leg.duration.text,
            duration_value: leg.duration.value, // duration in seconds
            distance: leg.distance.text,
            distance_value: leg.distance.value, // distance in meters
            start_address: leg.start_address,
            end_address: leg.end_address,
            steps: leg.steps.map(step => ({
              travel_mode: step.travel_mode,
              instructions: step.instructions,
              distance: step.distance.text,
              duration: step.duration.text
            })),
            alternatives: result.routes.slice(1).map(altRoute => ({
              summary: altRoute.summary,
              duration: altRoute.legs[0].duration.text,
              distance: altRoute.legs[0].distance.text
            }))
          };
          
          debugLog('Transportation validation successful', validatedRoute);
          resolve(validatedRoute);
        } else {
          const error = new Error(`Transportation validation failed: ${status}`);
          debugLog('Transportation validation failed', { status, error });
          reject(error);
        }
      });
    });
  }
};

/**
 * Function to validate interest points
 * @param {string} baseLocation - Base location for validation
 * @param {array} interestPoints - Array of interest points to validate
 * @param {number} maxDistance - Maximum distance in kilometers
 * @returns {Promise<array>} - Filtered and validated interest points
 */
export const validateInterestPoints = async (baseLocation, interestPoints, maxDistance = 5) => {
  if (config.useServerProxy) {
    debugLog('Using server proxy for interest points validation', { baseLocation, interestPoints, maxDistance });
    
    const apiClient = createApiClient();
    
    try {
      const response = await apiClient.post('/maps/validate-interest-points', {
        base_location: baseLocation,
        interest_points: interestPoints,
        max_distance: maxDistance
      });
      
      return response.data.validated_points;
    } catch (error) {
      console.error('Error validating interest points:', error);
      throw error;
    }
  } else {
    await ensureApiLoaded();
    
    debugLog('Validating interest points', { baseLocation, interestPoints, maxDistance });
    
    if (!Array.isArray(interestPoints) || interestPoints.length === 0) {
      return [];
    }
    
    // Convert base location to coordinates if it's a string
    let baseCoords = baseLocation;
    if (typeof baseLocation === 'string') {
      const geocoded = await geocodeAddress(baseLocation);
      baseCoords = geocoded.location;
    }
    
    const service = new google.maps.DistanceMatrixService();
    
    // Get points to validate (point names or coordinates)
    const points = interestPoints.map(point => {
      return point.name || point.position || point;
    });
    
    // Create request
    const request = {
      origins: [baseCoords],
      destinations: points,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC
    };
    
    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(request, (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK) {
          // Get the distances
          const distances = response.rows[0].elements;
          
          // Filter and enhance interest points
          const validatedPoints = interestPoints.filter((point, index) => {
            const element = distances[index];
            
            if (element.status !== 'OK') {
              return false;
            }
            
            // Convert distance value from meters to kilometers
            const distanceInKm = element.distance.value / 1000;
            
            // Check if within max distance
            return distanceInKm <= maxDistance;
          }).map((point, index) => {
            const element = distances[index];
            
            // Only enhance if element status is OK
            if (element.status === 'OK') {
              return {
                ...point,
                distance: element.distance.text,
                distance_value: element.distance.value,
                duration: element.duration.text,
                duration_value: element.duration.value,
                within_range: true
              };
            }
            
            return point;
          });
          
          debugLog('Interest points validation successful', validatedPoints);
          resolve(validatedPoints);
        } else {
          const error = new Error(`Interest points validation failed: ${status}`);
          debugLog('Interest points validation failed', { status, error });
          reject(error);
        }
      });
    });
  }
};

/**
 * Function to calculate route statistics
 * @param {object} route - Route information
 * @returns {Promise<object>} - Route statistics
 */
export const calculateRouteStatistics = async (route) => {
  await ensureApiLoaded();
  
  debugLog('Calculating statistics for route', route);
  
  // For a complete implementation, we'd need to call multiple Google APIs
  // Here, we'll use the Places API to get details about places in the route
  
  // Ensure we have places to analyze
  if (!route.places || !Array.isArray(route.places) || route.places.length === 0) {
    throw new Error('Route must include places to calculate statistics');
  }
  
  // Create Places service
  const placesService = new google.maps.places.PlacesService(
    config.mapInstance || document.createElement('div')
  );
  
  // Function to get place details
  const getPlaceDetails = (placeId) => {
    return new Promise((resolve, reject) => {
      placesService.getDetails({ placeId }, (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(result);
        } else {
          reject(new Error(`Place details failed: ${status}`));
        }
      });
    });
  };
  
  try {
    // Get detailed information about each place
    const placeDetailsPromises = route.places.map(place => {
      // If place is an object with a placeId property, use that
      // Otherwise, assume place is a place ID string
      const placeId = place.placeId || place.place_id || place;
      return getPlaceDetails(placeId);
    });
    
    // Wait for all place details to be fetched
    const placesDetails = await Promise.all(placeDetailsPromises);
    
    // Calculate statistics
    const stats = {
      sites: route.places.length,
      duration: route.route_duration || `${Math.ceil(route.places.length / 3)} days`, // Estimate based on number of places
      distance: '0 km', // Will be calculated
      transportation: {},
      cost: {
        estimated_total: 0,
        entertainment: 0,
        food: 0,
        accommodation: 0,
        transportation: 0
      },
      ratings: {
        average: 0,
        highest: 0,
        lowest: 5,
        total_reviews: 0
      }
    };
    
    // Calculate average rating and other place-based statistics
    let totalRating = 0;
    let validRatings = 0;
    
    placesDetails.forEach(place => {
      if (place.rating) {
        totalRating += place.rating;
        validRatings++;
        
        stats.ratings.highest = Math.max(stats.ratings.highest, place.rating);
        stats.ratings.lowest = Math.min(stats.ratings.lowest, place.rating);
        stats.ratings.total_reviews += place.user_ratings_total || 0;
      }
      
      // Try to estimate costs based on price_level if available
      if (place.price_level) {
        // Estimate cost based on price level (1-4)
        const baseCost = place.price_level * 20; // $20 per price level as a rough estimate
        stats.cost.entertainment += baseCost;
        stats.cost.estimated_total += baseCost;
      }
    });
    
    if (validRatings > 0) {
      stats.ratings.average = parseFloat((totalRating / validRatings).toFixed(1));
    }
    
    // Add basic cost estimates
    if (route.route_duration) {
      // Extract number of days from duration string
      const daysMatch = route.route_duration.match(/(\d+)/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        
        // Rough accommodation estimate ($100 per night)
        stats.cost.accommodation = days * 100;
        
        // Rough food estimate ($50 per day)
        stats.cost.food = days * 50;
        
        stats.cost.estimated_total += stats.cost.accommodation + stats.cost.food;
      }
    }
    
    // Format the final cost value
    stats.cost.estimated_total = `$${stats.cost.estimated_total}`;
    stats.cost.entertainment = `$${stats.cost.entertainment}`;
    stats.cost.food = `$${stats.cost.food}`;
    stats.cost.accommodation = `$${stats.cost.accommodation}`;
    stats.cost.transportation = `$${stats.cost.transportation || 0}`;
    
    debugLog('Route statistics calculation successful', stats);
    return stats;
  } catch (error) {
    debugLog('Route statistics calculation failed', error);
    throw error;
  }
};

/**
 * Get the current configuration status
 * @returns {object} Configuration status
 */
export const getStatus = () => {
  return {
    isConfigured: !!config.apiKey || config.useServerProxy,
    isLoaded: config.librariesLoaded,
    hasMapInstance: !!config.mapInstance,
    debug: config.debug,
    useServerProxy: config.useServerProxy
  };
};

export default {
  setApiKey,
  setDebugMode,
  setUseServerProxy,
  getStatus,
  loadGoogleMapsApi,
  initializeMap,
  geocodeAddress,
  displayRouteOnMap,
  getNearbyInterestPoints,
  validateTransportation,
  validateInterestPoints,
  calculateRouteStatistics
}; 