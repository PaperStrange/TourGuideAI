import { v4 as uuidv4 } from 'uuid';

/**
 * Service for generating travel routes and analyzing user queries
 */
class RouteGenerationService {
  constructor() {
    this.baseUrl = '/api/routes';
    this.openaiApiEndpoint = '/api/ai/generate';
  }
  
  /**
   * Analyze a user query to extract travel intent
   * @param {string} query - The user's natural language query
   * @returns {Promise<Object>} The extracted travel intent
   */
  async analyzeUserQuery(query) {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze query');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error analyzing query:', error);
      throw new Error(`Failed to analyze query: ${error.message}`);
    }
  }
  
  /**
   * Generate a travel route based on a user query
   * @param {string} query - The user's natural language query
   * @returns {Promise<Object>} The generated route
   */
  async generateRouteFromQuery(query) {
    try {
      // First analyze the query to extract intent
      const intent = await this.analyzeUserQuery(query);
      
      // Use the intent to generate a more accurate route
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, intent })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate route');
      }
      
      const route = await response.json();
      
      // Assign a unique ID if one doesn't exist
      if (!route.id) {
        route.id = `route_${uuidv4()}`;
      }
      
      return route;
    } catch (error) {
      console.error('Error generating route:', error);
      throw new Error(`Error generating route: ${error.message}`);
    }
  }
  
  /**
   * Generate a random route to a surprise destination
   * @returns {Promise<Object>} The generated surprise route
   */
  async generateRandomRoute() {
    try {
      const response = await fetch(`${this.baseUrl}/surprise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate surprise route');
      }
      
      const route = await response.json();
      
      // Assign a unique ID if one doesn't exist
      if (!route.id) {
        route.id = `route_${uuidv4()}`;
      }
      
      return route;
    } catch (error) {
      console.error('Error generating surprise route:', error);
      throw new Error(`Error generating surprise route: ${error.message}`);
    }
  }
  
  /**
   * Generate a route with specific constraints
   * @param {string} destination - The destination location
   * @param {number} duration - Trip duration in days
   * @param {Object} constraints - Additional constraints (budget, interests, etc.)
   * @returns {Promise<Object>} The generated route
   */
  async generateRouteWithConstraints(destination, duration, constraints = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-constrained`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination,
          duration,
          constraints
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate route with constraints');
      }
      
      const route = await response.json();
      
      // Assign a unique ID if one doesn't exist
      if (!route.id) {
        route.id = `route_${uuidv4()}`;
      }
      
      return route;
    } catch (error) {
      console.error('Error generating route with constraints:', error);
      throw new Error(`Error generating route with constraints: ${error.message}`);
    }
  }
  
  /**
   * Optimize an existing itinerary for better flow and timing
   * @param {Object} route - The existing route to optimize
   * @returns {Promise<Object>} The optimized route
   */
  async optimizeItinerary(route) {
    try {
      const response = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ route })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to optimize itinerary');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error optimizing itinerary:', error);
      throw new Error(`Error optimizing itinerary: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const routeGenerationService = new RouteGenerationService(); 