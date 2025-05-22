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
      // Using mock data since API is not available
      return this.getFallbackFeatureData();
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
      // Using mock data since API is not available
      return this.getFallbackDeviceData();
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
  async getFeedbackSentimentTrend(timeRange = 'month') {
    try {
      // Mock implementation - would connect to real API in production
      return this.getMockSentimentData(timeRange);
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
      return this.getMockSentimentData(timeRange);
    }
  }

  /**
   * Fetches pages list for heatmap visualization
   * @returns {Promise<Array>} - List of available pages for heatmap
   */
  async getHeatmapPagesList() {
    try {
      // Mock implementation - would connect to real API in production
      return this.getMockHeatmapPagesList();
    } catch (error) {
      console.error('Error fetching heatmap pages:', error);
      return this.getMockHeatmapPagesList();
    }
  }

  /**
   * Mock sentiment data for testing
   * @private
   */
  getMockSentimentData(timeRange) {
    // Generate mock sentiment data based on time range
    const dataPoints = timeRange === 'week' ? 7 : 
                      timeRange === 'month' ? 30 : 
                      timeRange === 'quarter' ? 12 : 
                      timeRange === 'year' ? 12 : 30;
    
    const result = [];
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (dataPoints - i));
      
      // Generate realistic-looking sentiment data
      const positive = 55 + Math.floor(Math.random() * 20);
      const negative = Math.floor(Math.random() * 15);
      const neutral = 100 - positive - negative;
      
      result.push({
        date: date.toISOString().split('T')[0],
        positive,
        neutral,
        negative,
        total: Math.floor(Math.random() * 50) + 50
      });
    }
    
    return result;
  }

  /**
   * Mock heatmap pages list for testing
   * @private
   */
  getMockHeatmapPagesList() {
    return [
      { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
      { id: 'map', name: 'Map View', path: '/map' },
      { id: 'itinerary', name: 'Itinerary', path: '/itinerary' },
      { id: 'profile', name: 'User Profile', path: '/profile' },
      { id: 'settings', name: 'Settings', path: '/settings' }
    ];
  }

  /**
   * Fetches heatmap data for a specific page and interaction type
   * @param {string} page - Page identifier to get heatmap for
   * @param {object} filters - Optional filters to apply
   * @returns {Promise<Object>} - Heatmap data object
   */
  async getHeatmapData(page, filters = {}) {
    try {
      // Using mock data since API is not available
      return this.getFallbackHeatmapData(page);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      return this.getFallbackHeatmapData(page);
    }
  }

  /**
   * Get feature usage data for visualization
   * @param {string} timeRange - 'week', 'month', 'quarter', 'year'
   * @param {string} viewType - 'count', 'duration', 'engagement'
   * @returns {Promise<Array>} - Feature usage data
   */
  async getFeatureUsageData(timeRange = 'month', viewType = 'count') {
    try {
      // Mock implementation
      const features = [
        { feature: 'Route Planning', category: 'Planning', uniqueUsers: 758 },
        { feature: 'POI Search', category: 'Discovery', uniqueUsers: 683 },
        { feature: 'Timeline Creation', category: 'Planning', uniqueUsers: 521 },
        { feature: 'Image Upload', category: 'Content', uniqueUsers: 420 },
        { feature: 'Tour Generation', category: 'AI', uniqueUsers: 380 },
        { feature: 'Itinerary Export', category: 'Export', uniqueUsers: 310 },
        { feature: 'Map Navigation', category: 'Discovery', uniqueUsers: 452 },
        { feature: 'Reviews Reading', category: 'Content', uniqueUsers: 286 },
        { feature: 'Travel Tips', category: 'Content', uniqueUsers: 215 },
        { feature: 'Weather Check', category: 'Planning', uniqueUsers: 390 }
      ];
      
      // Generate appropriate value based on view type
      return features.map(item => {
        let value;
        if (viewType === 'count') {
          value = item.uniqueUsers * (1 + Math.random() * 4); // usage count
        } else if (viewType === 'duration') {
          value = Math.floor(Math.random() * 20) + 5; // minutes
        } else { // engagement
          value = Math.floor(Math.random() * 60) + 40; // percentage
        }
        
        return {
          ...item,
          value: Math.floor(value),
          trend: Math.floor(Math.random() * 30) - 10 // trend -10% to +20%
        };
      });
    } catch (error) {
      console.error('Error fetching feature usage data:', error);
      throw error;
    }
  }

  /**
   * Get device distribution data
   * @param {string} view - 'device', 'os', 'browser', 'screen'
   * @returns {Promise<Array>} - Device distribution data
   */
  async getDeviceDistributionData(view = 'device') {
    try {
      let data;
      
      switch (view) {
        case 'device':
          data = [
            { name: 'Mobile', value: 1250, crashRate: 2.8, retentionRate: 68, avgSessionDuration: 8.3 },
            { name: 'Desktop', value: 820, crashRate: 1.4, retentionRate: 76, avgSessionDuration: 15.7 },
            { name: 'Tablet', value: 340, crashRate: 3.1, retentionRate: 65, avgSessionDuration: 12.1 }
          ];
          break;
        case 'os':
          data = [
            { name: 'Android', value: 750, crashRate: 3.5, retentionRate: 65, avgSessionDuration: 7.2 },
            { name: 'iOS', value: 650, crashRate: 1.8, retentionRate: 78, avgSessionDuration: 9.1 },
            { name: 'Windows', value: 580, crashRate: 2.3, retentionRate: 72, avgSessionDuration: 16.4 },
            { name: 'MacOS', value: 240, crashRate: 1.2, retentionRate: 80, avgSessionDuration: 14.9 },
            { name: 'Linux', value: 120, crashRate: 1.5, retentionRate: 75, avgSessionDuration: 18.3 }
          ];
          break;
        case 'browser':
          data = [
            { name: 'Chrome', value: 1120, crashRate: 1.9, retentionRate: 72, avgSessionDuration: 12.5 },
            { name: 'Safari', value: 680, crashRate: 2.1, retentionRate: 75, avgSessionDuration: 11.8 },
            { name: 'Firefox', value: 250, crashRate: 2.3, retentionRate: 70, avgSessionDuration: 13.2 },
            { name: 'Edge', value: 220, crashRate: 2.5, retentionRate: 68, avgSessionDuration: 10.9 },
            { name: 'Samsung Browser', value: 110, crashRate: 3.2, retentionRate: 65, avgSessionDuration: 8.7 },
            { name: 'Other', value: 30, crashRate: 4.1, retentionRate: 60, avgSessionDuration: 7.5 }
          ];
          break;
        case 'screen':
          data = [
            { name: '≤ 5 inches', value: 620, crashRate: 3.1, retentionRate: 64, avgSessionDuration: 6.8 },
            { name: '5-6 inches', value: 780, crashRate: 2.7, retentionRate: 70, avgSessionDuration: 8.9 },
            { name: '7-10 inches', value: 340, crashRate: 2.4, retentionRate: 72, avgSessionDuration: 12.3 },
            { name: '11-15 inches', value: 380, crashRate: 1.6, retentionRate: 78, avgSessionDuration: 14.7 },
            { name: '≥ 16 inches', value: 290, crashRate: 1.2, retentionRate: 82, avgSessionDuration: 17.2 }
          ];
          break;
        default:
          data = [
            { name: 'Mobile', value: 1250, crashRate: 2.8, retentionRate: 68, avgSessionDuration: 8.3 },
            { name: 'Desktop', value: 820, crashRate: 1.4, retentionRate: 76, avgSessionDuration: 15.7 },
            { name: 'Tablet', value: 340, crashRate: 3.1, retentionRate: 65, avgSessionDuration: 12.1 }
          ];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching device distribution data:', error);
      throw error;
    }
  }

  /**
   * Get UX metrics for evaluation
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @param {string} benchmark - Benchmark to compare against
   * @returns {Promise<Object>} UX metrics data
   */
  async getUXMetrics(startDate, endDate, benchmark = 'industry') {
    console.log(`Fetching UX metrics from ${startDate} to ${endDate} with benchmark ${benchmark}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock metrics
    return {
      timeOnTask: { 
        value: Math.floor(Math.random() * 60) + 20, 
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
        loading: false, 
        error: null 
      },
      successRate: { 
        value: Math.floor(Math.random() * 30) + 70, 
        trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)],
        loading: false, 
        error: null 
      },
      errorRate: { 
        value: Math.floor(Math.random() * 10) + 1, 
        trend: ['down', 'stable', 'up'][Math.floor(Math.random() * 3)],
        loading: false, 
        error: null 
      }, 
      satisfactionScore: { 
        value: Math.floor(Math.random() * 3) + 7, 
        trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)],
        loading: false, 
        error: null 
      },
      taskCompletionTime: { 
        value: Math.floor(Math.random() * 50) + 20, 
        trend: ['down', 'stable', 'up'][Math.floor(Math.random() * 3)],
        loading: false, 
        error: null 
      }
    };
  }

  /**
   * Calculates key performance metrics
   * @param {string} period - Time period for metrics
   * @returns {Promise<Object>} - Object with KPI metrics
   */
  async getKPIMetrics(period = 'month') {
    try {
      // Using mock data since API is not available
      return this.getFallbackKPIData();
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