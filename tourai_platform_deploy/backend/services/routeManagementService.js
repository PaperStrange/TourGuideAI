const { v4: uuidv4 } = require('uuid');
const { RouteModel } = require('../models/RouteModel');
const userService = require('./userService');

/**
 * Service for managing travel routes
 */
const routeManagementService = {
  /**
   * Get a route by ID
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Route object
   */
  async getRouteById(routeId) {
    const route = await RouteModel.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }
    return route;
  },

  /**
   * Get all routes for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of route objects
   */
  async getUserRoutes(userId) {
    return await userService.getUserRoutes(userId);
  },

  /**
   * Get favorite routes for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of favorite route objects
   */
  async getFavoriteRoutes(userId) {
    const routes = await this.getUserRoutes(userId);
    return routes.filter(route => route.is_favorite);
  },

  /**
   * Create a new route
   * @param {string} userId - User ID
   * @param {Object} routeData - Route data
   * @returns {Promise<Object>} - Created route
   */
  async createRoute(userId, routeData) {
    const newRoute = await RouteModel.create({
      ...routeData,
      user_id: userId,
      created_at: new Date(),
      last_modified: new Date()
    });

    await userService.addRouteToUser(userId, newRoute._id);
    return newRoute;
  },

  /**
   * Update an existing route
   * @param {string} routeId - Route ID
   * @param {Object} updateData - Data to update
   * @param {string} [userId] - Optional user ID for permission check
   * @returns {Promise<Object>} - Updated route
   */
  async updateRoute(routeId, updateData, userId) {
    // Check if user has permission if userId is provided
    if (userId) {
      const route = await this.getRouteById(routeId);
      if (route.user_id !== userId) {
        throw new Error('User does not have permission to update this route');
      }
    }

    return await RouteModel.findByIdAndUpdate(
      routeId,
      {
        ...updateData,
        last_modified: new Date()
      },
      { new: true }
    );
  },

  /**
   * Delete a route
   * @param {string} routeId - Route ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteRoute(routeId, userId) {
    const route = await this.getRouteById(routeId);
    
    // Check if user has permission
    if (route.user_id !== userId) {
      throw new Error('User does not have permission to delete this route');
    }

    const result = await RouteModel.findByIdAndDelete(routeId);
    await userService.removeRouteFromUser(userId, routeId);
    
    return result;
  },

  /**
   * Add a route to user's favorites
   * @param {string} routeId - Route ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated route
   */
  async addToFavorites(routeId, userId) {
    return await RouteModel.findByIdAndUpdate(
      routeId,
      { is_favorite: true },
      { new: true }
    );
  },

  /**
   * Remove a route from user's favorites
   * @param {string} routeId - Route ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated route
   */
  async removeFromFavorites(routeId, userId) {
    return await RouteModel.findByIdAndUpdate(
      routeId,
      { is_favorite: false },
      { new: true }
    );
  },

  /**
   * Search routes by keyword
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of matching routes
   */
  async searchRoutes(userId, searchTerm) {
    const regex = { $regex: searchTerm, $options: 'i' };
    
    return await RouteModel.find({
      user_id: userId,
      $or: [
        { route_name: regex },
        { destination: regex },
        { overview: regex }
      ]
    });
  },

  /**
   * Duplicate an existing route
   * @param {string} routeId - Route ID to duplicate
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Duplicated route
   */
  async duplicateRoute(routeId, userId) {
    const sourceRoute = await this.getRouteById(routeId);
    
    // Create a new object with the properties we want
    const newRouteData = {
      ...sourceRoute,
      route_name: `Copy of ${sourceRoute.route_name}`,
      _id: undefined,
      id: undefined,
      created_at: new Date(),
      last_modified: new Date()
    };
    
    const newRoute = await RouteModel.create(newRouteData);
    await userService.addRouteToUser(userId, newRoute._id);
    return newRoute;
  },

  /**
   * Generate a sharing token for a route
   * @param {string} routeId - Route ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated route with sharing info
   */
  async shareRoute(routeId, userId) {
    const shareToken = uuidv4();
    const baseUrl = process.env.APP_URL || 'https://tourguideai.com';
    const shareUrl = `${baseUrl}/routes/shared/${routeId}?token=${shareToken}`;
    
    const updatedRoute = await RouteModel.findByIdAndUpdate(
      routeId,
      {
        share_token: shareToken,
        is_shared: true
      },
      { new: true }
    );
    
    return {
      ...updatedRoute,
      shareUrl
    };
  },
  
  /**
   * Get a route by its share token
   * @param {string} shareToken - Share token
   * @returns {Promise<Object>} - Shared route
   */
  async getRouteByShareToken(shareToken) {
    const routes = await RouteModel.find({ share_token: shareToken });
    
    if (!routes || routes.length === 0) {
      throw new Error('Shared route not found');
    }
    
    return routes[0];
  },
  
  /**
   * Get analytics for a user's routes
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getRouteAnalytics(userId) {
    const routes = await this.getUserRoutes(userId);
    
    // Calculate statistics
    const totalRoutes = routes.length;
    const favoriteRoutes = routes.filter(route => route.is_favorite).length;
    const sharedRoutes = routes.filter(route => route.is_shared).length;
    
    // Get destinations and extract country
    const destinations = {};
    const countries = {};
    
    routes.forEach(route => {
      if (route.destination) {
        // Add full destination
        if (!destinations[route.destination]) {
          destinations[route.destination] = 0;
        }
        destinations[route.destination]++;
        
        // Extract country - assuming format is "City, Country"
        const parts = route.destination.split(',');
        if (parts.length > 1) {
          const country = parts[parts.length - 1].trim();
          if (!countries[country]) {
            countries[country] = 0;
          }
          countries[country]++;
        }
      }
    });
    
    // Calculate average trip duration
    const totalDuration = routes.reduce((sum, route) => {
      return sum + (parseInt(route.duration) || 0);
    }, 0);
    const averageDuration = totalRoutes > 0 ? totalDuration / totalRoutes : 0;
    
    // Find most common country
    const mostCommonDestination = Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)[0] || null;
    
    return {
      totalRoutes,
      favoriteRoutes,
      sharedRoutes,
      destinations,
      averageDuration,
      mostCommonDestination
    };
  }
};

module.exports = { routeManagementService }; 