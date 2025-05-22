import { localStorageService } from '../../../core/services/storage/LocalStorageService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing travel routes (saving, updating, retrieving)
 */
class RouteManagementService {
  constructor() {
    this.baseUrl = '/api/routes';
    this.storageKey = 'tourguide_routes';
    this.favoritesKey = 'tourguide_favorite_routes';
  }
  
  /**
   * Get a route by its ID
   * @param {string} routeId - The ID of the route to retrieve
   * @returns {Promise<Object>} The retrieved route
   */
  async getRouteById(routeId) {
    try {
      // Try to get from API first
      const response = await fetch(`${this.baseUrl}/${routeId}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fall back to local storage if API fails
      const routes = localStorageService.getItem(this.storageKey) || {};
      const route = routes[routeId];
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      return route;
    } catch (error) {
      console.error('Error getting route:', error);
      
      // Last resort: check local storage
      const routes = localStorageService.getItem(this.storageKey) || {};
      const route = routes[routeId];
      
      if (!route) {
        throw new Error('Route not found');
      }
      
      return route;
    }
  }
  
  /**
   * Save a new route
   * @param {Object} route - The route to save
   * @param {string} userId - The ID of the user saving the route
   * @returns {Promise<Object>} The saved route with its new ID
   */
  async saveRoute(route, userId) {
    try {
      // Assign a unique ID if one doesn't exist
      if (!route.id) {
        route.id = `route_${uuidv4()}`;
      }
      
      // Add metadata
      const enhancedRoute = {
        ...route,
        user_id: userId,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString()
      };
      
      // Try to save to API first
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancedRoute)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fall back to local storage if API fails
      const routes = localStorageService.getItem(this.storageKey) || {};
      routes[enhancedRoute.id] = enhancedRoute;
      localStorageService.setItem(this.storageKey, routes);
      
      return enhancedRoute;
    } catch (error) {
      console.error('Error saving route:', error);
      
      // Last resort: save to local storage
      const routes = localStorageService.getItem(this.storageKey) || {};
      const enhancedRoute = {
        ...route,
        user_id: userId,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString()
      };
      
      routes[enhancedRoute.id] = enhancedRoute;
      localStorageService.setItem(this.storageKey, routes);
      
      return enhancedRoute;
    }
  }
  
  /**
   * Update an existing route
   * @param {string} routeId - The ID of the route to update
   * @param {Object} updatedRoute - The updated route data
   * @param {string} userId - The ID of the user making the update (for verification)
   * @returns {Promise<Object>} The updated route
   */
  async updateRoute(routeId, updatedRoute, userId) {
    try {
      // First get the existing route to verify ownership
      const existingRoute = await this.getRouteById(routeId);
      
      // Verify ownership if userId is provided
      if (userId && existingRoute.user_id && existingRoute.user_id !== userId) {
        throw new Error('User does not have permission to update this route');
      }
      
      // Update metadata
      const enhancedRoute = {
        ...existingRoute,
        ...updatedRoute,
        last_modified: new Date().toISOString()
      };
      
      // Preserve the ID
      enhancedRoute.id = routeId;
      
      // Try to update via API first
      const response = await fetch(`${this.baseUrl}/${routeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancedRoute)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fall back to local storage if API fails
      const routes = localStorageService.getItem(this.storageKey) || {};
      routes[routeId] = enhancedRoute;
      localStorageService.setItem(this.storageKey, routes);
      
      return enhancedRoute;
    } catch (error) {
      console.error('Error updating route:', error);
      
      // Check if it's a permission error
      if (error.message.includes('permission')) {
        throw error;
      }
      
      // Last resort: update in local storage
      const routes = localStorageService.getItem(this.storageKey) || {};
      const existingRoute = routes[routeId];
      
      if (!existingRoute) {
        throw new Error('Route not found');
      }
      
      // Verify ownership if userId is provided
      if (userId && existingRoute.user_id && existingRoute.user_id !== userId) {
        throw new Error('User does not have permission to update this route');
      }
      
      const enhancedRoute = {
        ...existingRoute,
        ...updatedRoute,
        last_modified: new Date().toISOString()
      };
      
      routes[routeId] = enhancedRoute;
      localStorageService.setItem(this.storageKey, routes);
      
      return enhancedRoute;
    }
  }
  
  /**
   * Delete a route
   * @param {string} routeId - The ID of the route to delete
   * @param {string} userId - The ID of the user making the deletion (for verification)
   * @returns {Promise<Object>} Confirmation of deletion
   */
  async deleteRoute(routeId, userId) {
    try {
      // First get the existing route to verify ownership
      const existingRoute = await this.getRouteById(routeId);
      
      // Verify ownership if userId is provided
      if (userId && existingRoute.user_id && existingRoute.user_id !== userId) {
        throw new Error('User does not have permission to delete this route');
      }
      
      // Try to delete via API first
      const response = await fetch(`${this.baseUrl}/${routeId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Also remove from local storage for consistency
        const routes = localStorageService.getItem(this.storageKey) || {};
        delete routes[routeId];
        localStorageService.setItem(this.storageKey, routes);
        
        // Remove from favorites if present
        this.removeFromFavorites(routeId, userId);
        
        return { success: true, message: 'Route deleted successfully' };
      }
      
      // Fall back to local storage if API fails
      const routes = localStorageService.getItem(this.storageKey) || {};
      delete routes[routeId];
      localStorageService.setItem(this.storageKey, routes);
      
      // Remove from favorites if present
      this.removeFromFavorites(routeId, userId);
      
      return { success: true, message: 'Route deleted successfully (local only)' };
    } catch (error) {
      console.error('Error deleting route:', error);
      
      // Check if it's a permission error
      if (error.message.includes('permission')) {
        throw error;
      }
      
      // Last resort: delete from local storage
      const routes = localStorageService.getItem(this.storageKey) || {};
      const existingRoute = routes[routeId];
      
      if (!existingRoute) {
        throw new Error('Route not found');
      }
      
      // Verify ownership if userId is provided
      if (userId && existingRoute.user_id && existingRoute.user_id !== userId) {
        throw new Error('User does not have permission to delete this route');
      }
      
      delete routes[routeId];
      localStorageService.setItem(this.storageKey, routes);
      
      // Remove from favorites if present
      this.removeFromFavorites(routeId, userId);
      
      return { success: true, message: 'Route deleted successfully (local only)' };
    }
  }
  
  /**
   * Get all routes for a user
   * @param {string} userId - The ID of the user
   * @returns {Promise<Array>} Array of routes for the user
   */
  async getUserRoutes(userId) {
    try {
      // Try to get from API first
      const response = await fetch(`${this.baseUrl}/user/${userId}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fall back to local storage if API fails
      const routes = localStorageService.getItem(this.storageKey) || {};
      return Object.values(routes).filter(route => route.user_id === userId);
    } catch (error) {
      console.error('Error getting user routes:', error);
      
      // Last resort: get from local storage
      const routes = localStorageService.getItem(this.storageKey) || {};
      return Object.values(routes).filter(route => route.user_id === userId);
    }
  }
  
  /**
   * Add a route to favorites
   * @param {string} routeId - The ID of the route to favorite
   * @param {string} userId - The ID of the user
   * @returns {Promise<Object>} The updated route
   */
  async addToFavorites(routeId, userId) {
    try {
      // Update the route with favorite flag
      const updatedRoute = await this.updateRoute(routeId, { is_favorite: true }, userId);
      
      // Also maintain a list of favorite route IDs for quick access
      let favorites = localStorageService.getItem(this.favoritesKey) || {};
      if (!favorites[userId]) {
        favorites[userId] = [];
      }
      
      if (!favorites[userId].includes(routeId)) {
        favorites[userId].push(routeId);
        localStorageService.setItem(this.favoritesKey, favorites);
      }
      
      return updatedRoute;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw new Error(`Failed to add route to favorites: ${error.message}`);
    }
  }
  
  /**
   * Remove a route from favorites
   * @param {string} routeId - The ID of the route to unfavorite
   * @param {string} userId - The ID of the user
   * @returns {Promise<Object>} The updated route
   */
  async removeFromFavorites(routeId, userId) {
    try {
      // Update the route with favorite flag
      const updatedRoute = await this.updateRoute(routeId, { is_favorite: false }, userId);
      
      // Also update the list of favorite route IDs
      let favorites = localStorageService.getItem(this.favoritesKey) || {};
      if (favorites[userId]) {
        favorites[userId] = favorites[userId].filter(id => id !== routeId);
        localStorageService.setItem(this.favoritesKey, favorites);
      }
      
      return updatedRoute;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      
      // Update the favorites list even if the route update fails
      let favorites = localStorageService.getItem(this.favoritesKey) || {};
      if (favorites[userId]) {
        favorites[userId] = favorites[userId].filter(id => id !== routeId);
        localStorageService.setItem(this.favoritesKey, favorites);
      }
      
      throw new Error(`Failed to remove route from favorites: ${error.message}`);
    }
  }
  
  /**
   * Get all favorite routes for a user
   * @param {string} userId - The ID of the user
   * @returns {Array} Array of favorite routes for the user
   */
  getFavoriteRoutes(userId) {
    try {
      // Get all routes
      const routes = localStorageService.getItem(this.storageKey) || {};
      
      // Get favorite IDs for the user
      const favorites = localStorageService.getItem(this.favoritesKey) || {};
      const favoriteIds = favorites[userId] || [];
      
      // Filter routes by favorite status
      return Object.values(routes).filter(route => {
        return route.is_favorite === true || favoriteIds.includes(route.id);
      });
    } catch (error) {
      console.error('Error getting favorite routes:', error);
      return [];
    }
  }
  
  /**
   * Search for routes matching a keyword
   * @param {string} userId - The ID of the user
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} Array of matching routes
   */
  async searchRoutes(userId, searchTerm) {
    try {
      // Normalize search term
      const normalizedTerm = searchTerm.toLowerCase();
      
      // Get user routes
      const userRoutes = await this.getUserRoutes(userId);
      
      // Filter routes by search term
      return userRoutes.filter(route => {
        const routeName = (route.route_name || '').toLowerCase();
        const destination = (route.destination || '').toLowerCase();
        const overview = (route.overview || '').toLowerCase();
        
        return routeName.includes(normalizedTerm) ||
               destination.includes(normalizedTerm) ||
               overview.includes(normalizedTerm);
      });
    } catch (error) {
      console.error('Error searching routes:', error);
      return [];
    }
  }
}

// Create a singleton instance
export const routeManagementService = new RouteManagementService(); 