/**
 * RouteService
 * Provides functions for route management and manipulation
 */

import { localStorageService } from './storage/LocalStorageService';

class RouteService {
  /**
   * Rank and sort routes based on specified criteria
   * @param {Array} routes - Array of route objects
   * @param {string} sortBy - Sorting criterion (created_date, upvotes, views, sites, cost)
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted routes
   */
  rankRoutes(routes, sortBy = 'upvotes', sortOrder = 'desc') {
    // Make a copy to avoid mutating the original
    const sortedRoutes = [...routes];
    
    // Convert string dates to actual Date objects for proper comparison
    if (sortBy === 'created_date') {
      sortedRoutes.sort((a, b) => {
        const dateA = new Date(a.created_date);
        const dateB = new Date(b.created_date);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      return sortedRoutes;
    }
    
    // Default numerical sort for other criteria
    sortedRoutes.sort((a, b) => {
      const valueA = a[sortBy] || 0;
      const valueB = b[sortBy] || 0;
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    return sortedRoutes;
  }
  
  /**
   * Get all routes and rank them according to specified criteria
   * @param {string} sortBy - Sorting criterion
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted routes
   */
  getRankedRoutes(sortBy = 'upvotes', sortOrder = 'desc') {
    const routes = localStorageService.getAllRoutes() || [];
    return this.rankRoutes(routes, sortBy, sortOrder);
  }
  
  /**
   * Calculate route statistics (total sites, duration, cost estimate)
   * @param {Object} route - Route object
   * @returns {Object} Route statistics
   */
  calculateRouteStatistics(route) {
    const sites = route.sites_included_in_routes || [];
    const totalSites = sites.length;
    
    // Parse duration (e.g., "3 days" -> 3)
    let duration = 0;
    if (route.route_duration) {
      const match = route.route_duration.match(/(\d+)/);
      if (match) {
        duration = parseInt(match[1], 10);
      }
    }
    
    // Estimate cost (very basic estimation)
    // In a real app, this would use more sophisticated methods
    const baseCostPerDay = 100; // Base cost per day
    const siteCost = 20; // Average cost per site
    const estimatedCost = (duration * baseCostPerDay) + (totalSites * siteCost);
    
    return {
      total_sites: totalSites,
      duration_days: duration,
      estimated_cost: estimatedCost
    };
  }
}

// Create a singleton instance
const routeService = new RouteService();

export { routeService }; 