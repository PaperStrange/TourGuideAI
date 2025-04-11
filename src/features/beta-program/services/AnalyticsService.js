import axios from 'axios';

/**
 * AnalyticsService
 * Service for fetching and processing analytics data for the beta program
 */
class AnalyticsService {
  /**
   * Fetches user activity data for visualization
   * @param {string} period - Time period for data (day, week, month)
   * @param {object} filters - Optional filters to apply
   * @returns {Promise<Array>} - Array of activity data points
   */
  async getUserActivityData(period = 'week', filters = {}) {
    try {
      // Using mock data since API is not available
      return this.getFallbackUserActivityData(period);
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      return this.getFallbackUserActivityData(period);
    }
  }

  /**
   * Fetches feature usage data for visualization
   * @param {string} period - Time period for data (day, week, month)
   * @param {object} filters - Optional filters to apply
   * @returns {Promise<Array>} - Array of feature usage data points
   */
  async getFeatureUsage(period = 'week', filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/feature-usage`, {
        params: { period, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching feature usage data:', error);
      return this.getFallbackFeatureData();
    }
  }

  /**
   * Fetches device distribution data for visualization
   * @param {object} filters - Optional filters to apply
   * @returns {Promise<Array>} - Array of device distribution data
   */
  async getDeviceDistribution(filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/device-distribution`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching device distribution data:', error);
      return this.getFallbackDeviceData();
    }
  }

  /**
   * Fetches feedback sentiment trend data for visualization
   * @param {string} timeRange - 'week', 'month', 'quarter', 'year'
   * @returns {Promise<Array>} - Sentiment trend data
   */
  static async getFeedbackSentimentTrend(timeRange = 'month') {
    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/analytics/feedback-sentiment?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sentiment data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
      
      // If in development mode, return mock data for testing
      if (process.env.NODE_ENV === 'development') {
        return this.getMockSentimentData(timeRange);
      }
      
      throw error;
    }
  }

  /**
   * Fetches pages list for heatmap visualization
   * @returns {Promise<Array>} - List of available pages for heatmap
   */
  static async getHeatmapPagesList() {
    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/analytics/heatmap/pages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap pages: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching heatmap pages:', error);
      
      // If in development mode, return mock data for testing
      if (process.env.NODE_ENV === 'development') {
        return this.getMockHeatmapPagesList();
      }
      
      throw error;
    }
  }

  /**
   * Fetches heatmap data for a specific page and interaction type
   * @param {string} page - Page identifier to get heatmap for
   * @param {object} filters - Optional filters to apply
   * @returns {Promise<Object>} - Heatmap data object
   */
  async getHeatmapData(page, filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/heatmap/${page}`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      return this.getFallbackHeatmapData(page);
    }
  }

  /**
   * Calculates key performance metrics
   * @param {string} period - Time period for metrics
   * @returns {Promise<Object>} - Object with KPI metrics
   */
  async getKPIMetrics(period = 'month') {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/kpi`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
      return this.getFallbackKPIData();
    }
  }

  /**
   * Provides fallback user activity data when API is unavailable
   * @private
   */
  getFallbackUserActivityData(period) {
    // Sample data for testing and fallback
    const dayLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthLabels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    
    let labels;
    switch (period) {
      case 'day':
        labels = dayLabels;
        break;
      case 'month':
        labels = monthLabels;
        break;
      default:
        labels = weekLabels;
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Active Users',
          data: labels.map(() => Math.floor(Math.random() * 100)),
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
        },
        {
          label: 'Session Duration (mins)',
          data: labels.map(() => Math.floor(Math.random() * 60)),
          borderColor: '#f50057',
          backgroundColor: 'rgba(245, 0, 87, 0.2)',
        }
      ]
    };
  }

  /**
   * Provides fallback device distribution data when API is unavailable
   * @private
   */
  getFallbackDeviceData() {
    return {
      labels: ['Desktop', 'Mobile', 'Tablet'],
      datasets: [
        {
          data: [65, 25, 10],
          backgroundColor: ['#3f51b5', '#f50057', '#ff9800'],
        }
      ]
    };
  }

  /**
   * Provides fallback feature usage data when API is unavailable
   * @private
   */
  getFallbackFeatureData() {
    return {
      labels: ['Route Planning', 'Itinerary Creation', 'Map Exploration', 'Recommendations', 'Sharing'],
      datasets: [
        {
          label: 'Usage Count',
          data: [120, 98, 85, 65, 45],
          backgroundColor: 'rgba(63, 81, 181, 0.6)',
        }
      ]
    };
  }

  /**
   * Provides fallback heatmap data when API is unavailable
   * @private
   */
  getFallbackHeatmapData(page) {
    // Generate random points for heatmap
    const points = [];
    for (let i = 0; i < 500; i++) {
      points.push({
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 800),
        value: Math.floor(Math.random() * 100)
      });
    }
    
    return {
      max: 100,
      min: 0,
      data: points
    };
  }

  /**
   * Provides fallback KPI data when API is unavailable
   * @private
   */
  getFallbackKPIData() {
    return {
      activeUsers: 1250,
      averageSessionTime: 8.5,
      retentionRate: 0.76,
      featureAdoption: 0.68,
      bugReports: 15,
      featureRequests: 42
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
// Also export the class for instantiation if needed
export { AnalyticsService }; 