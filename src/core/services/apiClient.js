/**
 * API Client Service
 * 
 * This module provides a client-side service for interacting with the backend API.
 * It handles communication with our server-side API endpoints for OpenAI and Google Maps.
 */

import axios from 'axios';

// Default configuration
const config = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  useSimulation: process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_REAL_API !== 'true',
  debug: process.env.NODE_ENV === 'development',
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY || ''
};

// Log configuration status in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Client Configuration:', {
    baseURL: config.baseURL,
    useSimulation: config.useSimulation,
    debug: config.debug,
    hasOpenAIKey: !!config.openaiApiKey
  });
}

// Create an axios instance
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    if (config.debug) {
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`, config.params || config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    if (config.debug) {
      console.log(`✅ API Response: ${response.status} from ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Format the error consistently
    const formattedError = {
      status: error.response?.status || 500,
      message: error.response?.data?.error?.message || error.message || 'Unknown error',
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      id: error.response?.data?.error?.id || null,
      originalError: error
    };
    
    console.error(`❌ API Response Error: ${formattedError.status} - ${formattedError.message}`, formattedError);
    return Promise.reject(formattedError);
  }
);

// Service configuration methods
const ApiService = {
  /**
   * Update the API client configuration
   * @param {Object} newConfig - New configuration options
   */
  setConfig: (newConfig) => {
    Object.assign(config, newConfig);
    
    // Update axios baseURL if it changed
    if (newConfig.baseURL) {
      apiClient.defaults.baseURL = newConfig.baseURL;
    }
    
    return config;
  },
  
  /**
   * Get the current configuration
   * @returns {Object} Current configuration
   */
  getConfig: () => ({ ...config }),
  
  /**
   * Set whether to use simulation (mock) mode
   * @param {boolean} useSimulation - Whether to use simulation
   */
  setSimulationMode: (useSimulation) => {
    config.useSimulation = useSimulation;
    return config;
  },
  
  /**
   * Set debug mode
   * @param {boolean} debug - Whether to enable debug logging
   */
  setDebugMode: (debug) => {
    config.debug = debug;
    return config;
  }
};

// OpenAI API endpoints
const OpenAIService = {
  /**
   * Recognize text intent from user input
   * @param {string} text - User input text
   * @returns {Promise<Object>} - Structured intent data
   */
  recognizeIntent: async (text) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated recognizeIntent response');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
      
      return {
        intent: {
          arrival: "New York",
          departure: "",
          arrival_date: "next weekend",
          departure_date: "",
          travel_duration: "3 days",
          entertainment_prefer: "museums, theater",
          transportation_prefer: "walking, subway",
          accommodation_prefer: "mid-range hotel",
          total_cost_prefer: "budget-friendly",
          user_time_zone: "EST",
          user_personal_need: ""
        },
        debug: { simulation: true }
      };
    }
    
    const response = await apiClient.post('/openai/recognize-intent', { text });
    return response.data;
  },
  
  /**
   * Generate a travel route based on user input and recognized intent
   * @param {string} text - User input text
   * @param {Object} intent - Recognized intent data
   * @returns {Promise<Object>} - Generated route data
   */
  generateRoute: async (text, intent = {}) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated generateRoute response');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency
      
      return {
        route: {
          route_name: "Big Apple Weekend",
          destination: "New York City",
          duration: 3,
          start_date: "Next Friday",
          end_date: "Next Sunday",
          overview: "Experience the best of NYC in a weekend getaway.",
          highlights: ["Central Park", "Times Square", "MoMA", "Broadway Show"],
          daily_itinerary: [
            {
              day: 1,
              activities: [
                { time: "9:00 AM", activity: "Breakfast at a local diner" },
                { time: "11:00 AM", activity: "Visit Times Square" },
                { time: "2:00 PM", activity: "MoMA" },
                { time: "7:00 PM", activity: "Broadway Show" }
              ]
            },
            {
              day: 2,
              activities: [
                { time: "10:00 AM", activity: "Central Park" },
                { time: "2:00 PM", activity: "Metropolitan Museum of Art" },
                { time: "7:00 PM", activity: "Dinner in Little Italy" }
              ]
            },
            {
              day: 3,
              activities: [
                { time: "9:00 AM", activity: "Brooklyn Bridge" },
                { time: "12:00 PM", activity: "Lunch in Brooklyn" },
                { time: "3:00 PM", activity: "Shopping in SoHo" }
              ]
            }
          ],
          estimated_costs: {
            accommodation: "$300-500",
            transportation: "$50-100",
            food: "$150-300",
            activities: "$100-200",
            total: "$600-1100"
          },
          recommended_transportation: ["Subway", "Walking", "Taxis for late nights"],
          accommodation_suggestions: [
            "Mid-range hotel in Manhattan",
            "Budget hotel near subway stations",
            "Airbnb in Brooklyn for a local experience"
          ],
          best_time_to_visit: "Spring or Fall for mild weather",
          travel_tips: [
            "Buy a MetroCard for the subway",
            "Comfortable walking shoes are essential",
            "Book Broadway shows in advance for better prices",
            "Many museums have 'pay what you wish' hours"
          ]
        },
        debug: { simulation: true }
      };
    }
    
    const response = await apiClient.post('/openai/generate-route', { text, intent });
    return response.data;
  },
  
  /**
   * Generate a random travel route
   * @returns {Promise<Object>} - Generated random route data
   */
  generateRandomRoute: async () => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated generateRandomRoute response');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency
      
      return {
        route: {
          route_name: "Tokyo Techno Adventure",
          destination: "Tokyo, Japan",
          duration: 5,
          overview: "Immerse yourself in the futuristic cityscape of Tokyo.",
          highlights: ["Tokyo Skytree", "Shibuya Crossing", "Akihabara", "Senso-ji Temple"],
          daily_itinerary: [
            {
              day: 1,
              activities: [
                { time: "9:00 AM", activity: "Breakfast at Tsukiji Outer Market" },
                { time: "11:00 AM", activity: "Explore Asakusa and Senso-ji Temple" },
                { time: "4:00 PM", activity: "Tokyo Skytree" },
                { time: "7:00 PM", activity: "Dinner at a traditional izakaya" }
              ]
            },
            {
              day: 2,
              activities: [
                { time: "10:00 AM", activity: "Shibuya Crossing and Shopping" },
                { time: "2:00 PM", activity: "Yoyogi Park and Meiji Shrine" },
                { time: "7:00 PM", activity: "Dinner and nightlife in Shinjuku" }
              ]
            }
          ],
          estimated_costs: {
            accommodation: "$500-800",
            transportation: "$100-150",
            food: "$300-500",
            activities: "$150-300",
            total: "$1050-1750"
          },
          recommended_transportation: ["Tokyo Metro", "JR Lines", "Walking"],
          accommodation_suggestions: [
            "Business hotel in Shinjuku",
            "Capsule hotel for the experience",
            "Ryokan for traditional Japanese accommodation"
          ],
          travel_tips: [
            "Get a Suica or Pasmo card for public transport",
            "Learn basic Japanese phrases",
            "Tokyo is extremely safe but still watch your belongings",
            "Many places are cash-only"
          ]
        },
        debug: { simulation: true }
      };
    }
    
    const response = await apiClient.post('/openai/generate-random-route');
    return response.data;
  },
  
  /**
   * Split a route into daily itineraries
   * @param {Object} route - Route data to split
   * @returns {Promise<Object>} - Daily itinerary data
   */
  splitRouteByDay: async (route) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated splitRouteByDay response');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate latency
      
      return {
        timeline: {
          days: [
            {
              travel_day: 1,
              current_date: "Friday",
              daily_routes: [
                {
                  time: "9:00 AM",
                  activity: "Breakfast at local diner",
                  location: "Manhattan",
                  duration: "1 hour",
                  transportation: "Walking",
                  cost: "$15-20",
                  notes: "Try the classic American breakfast"
                },
                {
                  time: "11:00 AM",
                  activity: "Times Square exploration",
                  location: "Times Square",
                  duration: "2 hours",
                  transportation: "Subway",
                  cost: "$0",
                  notes: "Great photo opportunities"
                },
                {
                  time: "2:00 PM",
                  activity: "MoMA visit",
                  location: "Museum of Modern Art",
                  duration: "3 hours",
                  transportation: "Walking",
                  cost: "$25",
                  notes: "Check for special exhibitions"
                },
                {
                  time: "7:00 PM",
                  activity: "Broadway Show",
                  location: "Theater District",
                  duration: "3 hours",
                  transportation: "Walking",
                  cost: "$80-150",
                  notes: "Book tickets in advance"
                }
              ]
            },
            {
              travel_day: 2,
              current_date: "Saturday",
              daily_routes: [
                {
                  time: "10:00 AM",
                  activity: "Central Park walk",
                  location: "Central Park",
                  duration: "3 hours",
                  transportation: "Subway",
                  cost: "$0",
                  notes: "Rent bikes for easier exploration"
                },
                {
                  time: "2:00 PM",
                  activity: "Metropolitan Museum of Art",
                  location: "The Met",
                  duration: "3 hours",
                  transportation: "Walking",
                  cost: "$25 (suggested donation)",
                  notes: "You can pay what you wish, but $25 is suggested"
                },
                {
                  time: "7:00 PM",
                  activity: "Dinner in Little Italy",
                  location: "Little Italy",
                  duration: "2 hours",
                  transportation: "Subway",
                  cost: "$30-50",
                  notes: "Try authentic Italian cuisine"
                }
              ]
            }
          ]
        },
        debug: { simulation: true }
      };
    }
    
    const response = await apiClient.post('/openai/split-route-by-day', { route });
    return response.data;
  }
};

// Google Maps API endpoints
const MapsService = {
  /**
   * Geocode an address to coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} - Geocoding result
   */
  geocode: async (address) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated geocode response');
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate latency
      
      return {
        result: {
          location: { lat: 40.7128, lng: -74.006 },
          formatted_address: "New York, NY, USA",
          place_id: "ChIJOwg_06VPwokRYv534QaPC8g",
          viewport: {
            northeast: { lat: 40.9175771, lng: -73.70027209999999 },
            southwest: { lat: 40.4773991, lng: -74.25908989999999 }
          }
        },
        status: "OK"
      };
    }
    
    const response = await apiClient.get('/maps/geocode', { params: { address } });
    return response.data;
  },
  
  /**
   * Get nearby places based on location and type
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters
   * @param {string} type - Place type (optional)
   * @param {string} keyword - Search keyword (optional)
   * @returns {Promise<Object>} - Nearby places results
   */
  getNearbyPlaces: async (lat, lng, radius = 1500, type = '', keyword = '') => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated getNearbyPlaces response');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
      
      return {
        places: [
          {
            place_id: "ChIJTWE_0BtawokRVJNGH5RS448",
            name: "Times Square",
            vicinity: "Manhattan",
            location: { lat: 40.7580, lng: -73.9855 },
            rating: 4.3,
            user_ratings_total: 5678,
            types: ["tourist_attraction", "point_of_interest"]
          },
          {
            place_id: "ChIJ8YWMWBJawokRzBdSJ6Em-js",
            name: "Museum of Modern Art",
            vicinity: "11 W 53rd St, New York",
            location: { lat: 40.7614, lng: -73.9776 },
            rating: 4.5,
            user_ratings_total: 12345,
            types: ["museum", "point_of_interest"]
          },
          {
            place_id: "ChIJ4zGFAZpYwokRGUGph3Mf37k",
            name: "Central Park",
            vicinity: "Central Park, New York",
            location: { lat: 40.7812, lng: -73.9665 },
            rating: 4.8,
            user_ratings_total: 98765,
            types: ["park", "tourist_attraction"]
          }
        ],
        status: "OK",
        result_count: 3
      };
    }
    
    const params = { lat, lng, radius };
    if (type) params.type = type;
    if (keyword) params.keyword = keyword;
    
    const response = await apiClient.get('/maps/nearby', { params });
    return response.data;
  },
  
  /**
   * Get directions between two points
   * @param {string} origin - Origin address or coordinates
   * @param {string} destination - Destination address or coordinates
   * @param {string} mode - Travel mode (driving, walking, transit, bicycling)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Directions results
   */
  getDirections: async (origin, destination, mode = 'driving', options = {}) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated getDirections response');
      await new Promise(resolve => setTimeout(resolve, 700)); // Simulate latency
      
      return {
        routes: [
          {
            summary: "Broadway and 7th Ave",
            distance: { text: "2.5 miles", value: 4023 },
            duration: { text: "15 mins", value: 900 },
            start_location: { lat: 40.7128, lng: -74.006 },
            end_location: { lat: 40.7812, lng: -73.9665 },
            start_address: "New York, NY, USA",
            end_address: "Central Park, New York, NY, USA",
            steps: [
              {
                distance: { text: "1.0 miles", value: 1609 },
                duration: { text: "5 mins", value: 300 },
                start_location: { lat: 40.7128, lng: -74.006 },
                end_location: { lat: 40.7290, lng: -73.9911 },
                travel_mode: "DRIVING",
                instructions: "Head <b>north</b> on <b>Broadway</b>",
                maneuver: null
              },
              {
                distance: { text: "1.5 miles", value: 2414 },
                duration: { text: "10 mins", value: 600 },
                start_location: { lat: 40.7290, lng: -73.9911 },
                end_location: { lat: 40.7812, lng: -73.9665 },
                travel_mode: "DRIVING",
                instructions: "Continue on <b>Broadway</b>",
                maneuver: "continue"
              }
            ],
            warnings: [],
            bounds: {
              northeast: { lat: 40.7812, lng: -73.9665 },
              southwest: { lat: 40.7128, lng: -74.006 }
            }
          }
        ],
        status: "OK"
      };
    }
    
    const params = {
      origin,
      destination,
      mode,
      ...options
    };
    
    const response = await apiClient.get('/maps/directions', { params });
    return response.data;
  },
  
  /**
   * Get place details
   * @param {string} placeId - Place ID
   * @param {string} fields - Comma-separated list of fields to return
   * @returns {Promise<Object>} - Place details
   */
  getPlaceDetails: async (placeId, fields) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated getPlaceDetails response');
      await new Promise(resolve => setTimeout(resolve, 400)); // Simulate latency
      
      return {
        place: {
          place_id: placeId,
          name: "Times Square",
          formatted_address: "Manhattan, NY 10036, USA",
          geometry: {
            location: { lat: 40.7580, lng: -73.9855 }
          },
          rating: 4.3,
          formatted_phone_number: "(212) 555-1234",
          website: "https://www.timessquarenyc.org/",
          opening_hours: {
            open_now: true,
            periods: [
              {
                open: { day: 0, time: "0000" },
                close: { day: 0, time: "2359" }
              }
            ],
            weekday_text: [
              "Monday: Open 24 hours",
              "Tuesday: Open 24 hours",
              "Wednesday: Open 24 hours",
              "Thursday: Open 24 hours",
              "Friday: Open 24 hours",
              "Saturday: Open 24 hours",
              "Sunday: Open 24 hours"
            ]
          },
          types: ["tourist_attraction", "point_of_interest"]
        },
        status: "OK"
      };
    }
    
    const params = { place_id: placeId };
    if (fields) params.fields = fields;
    
    const response = await apiClient.get('/maps/place', { params });
    return response.data;
  },
  
  /**
   * Get place autocomplete suggestions
   * @param {string} input - Input text
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Autocomplete suggestions
   */
  getPlaceAutocomplete: async (input, options = {}) => {
    if (config.useSimulation) {
      // Simulate response in development when API keys aren't available
      console.warn('Using simulated getPlaceAutocomplete response');
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate latency
      
      return {
        predictions: [
          {
            place_id: "ChIJTWE_0BtawokRVJNGH5RS448",
            description: "Times Square, Manhattan, NY, USA",
            structured_formatting: {
              main_text: "Times Square",
              secondary_text: "Manhattan, NY, USA"
            },
            types: ["tourist_attraction", "point_of_interest"]
          },
          {
            place_id: "ChIJ8YWMWBJawokRzBdSJ6Em-js",
            description: "Museum of Modern Art, West 53rd Street, New York, NY, USA",
            structured_formatting: {
              main_text: "Museum of Modern Art",
              secondary_text: "West 53rd Street, New York, NY, USA"
            },
            types: ["museum", "point_of_interest"]
          }
        ],
        status: "OK"
      };
    }
    
    const params = {
      input,
      ...options
    };
    
    const response = await apiClient.get('/maps/autocomplete', { params });
    return response.data;
  },
  
  /**
   * Get photo URL for a place
   * @param {string} photoReference - Photo reference
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height (optional)
   * @returns {string} - Photo URL
   */
  getPhotoUrl: (photoReference, maxWidth = 400, maxHeight = null) => {
    if (config.useSimulation) {
      // Return a placeholder image for simulation
      return `https://via.placeholder.com/${maxWidth}x${maxHeight || Math.round(maxWidth * 0.75)}/CCCCCC/808080?text=Maps+Photo`;
    }
    
    const params = new URLSearchParams();
    params.append('photo_reference', photoReference);
    params.append('maxwidth', maxWidth);
    if (maxHeight) params.append('maxheight', maxHeight);
    
    return `${config.baseURL}/maps/photo?${params.toString()}`;
  }
};

export {
  ApiService,
  OpenAIService,
  MapsService
}; 