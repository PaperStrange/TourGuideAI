/**
 * Service for user management
 */
const userService = {
  /**
   * Get a user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object
   */
  async getUser(userId) {
    // Mock implementation for testing
    return {
      _id: userId,
      email: 'test@example.com',
      routes: ['route123', 'route456'],
      favorite_routes: ['route456']
    };
  },

  /**
   * Get all routes for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of route objects
   */
  async getUserRoutes(userId) {
    // Mock implementation for testing
    return [
      {
        _id: 'route123',
        route_name: 'Tokyo Adventure',
        destination: 'Tokyo, Japan',
        duration: '5',
        start_date: '2023-10-15',
        end_date: '2023-10-20',
        overview: 'Exploring Tokyo\'s modern and traditional sides',
        user_id: userId,
        is_favorite: false,
        last_modified: new Date(),
        created_at: new Date(),
        daily_itinerary: [
          {
            day_title: 'Tokyo Highlights',
            description: 'Visiting the most famous spots',
            day_number: 1,
            activities: [
              { name: 'Shibuya Crossing', description: 'Famous intersection', time: '10:00 AM' }
            ]
          }
        ]
      },
      {
        _id: 'route456',
        route_name: 'Kyoto Temples',
        destination: 'Kyoto, Japan',
        duration: '3',
        user_id: userId,
        is_favorite: true
      }
    ];
  },

  /**
   * Add a route to a user's routes
   * @param {string} userId - User ID
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Success status
   */
  async addRouteToUser(userId, routeId) {
    // Mock implementation for testing
    return { success: true };
  },

  /**
   * Remove a route from a user's routes
   * @param {string} userId - User ID
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Success status
   */
  async removeRouteFromUser(userId, routeId) {
    // Mock implementation for testing
    return { success: true };
  }
};

module.exports = userService; 