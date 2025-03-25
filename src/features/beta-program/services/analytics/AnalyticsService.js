/**
 * Analytics Service for Beta Program
 * Handles data collection, processing, and reporting for beta program analytics.
 */

import authService from '../../services/AuthService';

// Mock data for different metrics - would be replaced with real API calls in production
const mockData = {
  // User activity data (daily active users)
  userActivity: [
    { date: '2025-03-20', count: 45 },
    { date: '2025-03-21', count: 62 },
    { date: '2025-03-22', count: 78 },
    { date: '2025-03-23', count: 84 },
    { date: '2025-03-24', count: 103 },
    { date: '2025-03-25', count: 125 },
    { date: '2025-03-26', count: 152 },
    { date: '2025-03-27', count: 187 }
  ],
  
  // Feature usage data
  featureUsage: [
    { feature: 'Route Planning', usage: 427, growth: 15 },
    { feature: 'Map Navigation', usage: 316, growth: 8 },
    { feature: 'Location Search', usage: 254, growth: 12 },
    { feature: 'Itinerary Sharing', usage: 193, growth: 23 },
    { feature: 'Travel Recommendations', usage: 176, growth: 18 }
  ],
  
  // Feedback sentiment data
  feedbackSentiment: [
    { category: 'UI/UX', positive: 67, neutral: 22, negative: 11 },
    { category: 'Performance', positive: 58, neutral: 31, negative: 11 },
    { category: 'Features', positive: 72, neutral: 18, negative: 10 },
    { category: 'Content', positive: 81, neutral: 14, negative: 5 }
  ],
  
  // User retention data
  retentionData: [
    { week: 'Week 1', rate: 89 },
    { week: 'Week 2', rate: 76 },
    { week: 'Week 3', rate: 68 },
    { week: 'Week 4', rate: 62 }
  ],
  
  // Geographic distribution data
  geographicData: [
    { region: 'North America', users: 245 },
    { region: 'Europe', users: 187 },
    { region: 'Asia', users: 134 },
    { region: 'South America', users: 76 },
    { region: 'Africa', users: 53 },
    { region: 'Oceania', users: 38 }
  ],
  
  // Device distribution data
  deviceData: [
    { type: 'Desktop', percentage: 42 },
    { type: 'Mobile', percentage: 48 },
    { type: 'Tablet', percentage: 10 }
  ],
  
  // Browser distribution data
  browserData: [
    { name: 'Chrome', percentage: 64 },
    { name: 'Firefox', percentage: 12 },
    { name: 'Safari', percentage: 16 },
    { name: 'Edge', percentage: 7 },
    { name: 'Other', percentage: 1 }
  ],
  
  // Issue resolution data
  issueData: [
    { type: 'Bug Reports', count: 37, resolved: 31 },
    { type: 'Feature Requests', count: 56, resolved: 22 },
    { type: 'UI/UX Issues', count: 28, resolved: 19 },
    { type: 'Performance Issues', count: 15, resolved: 12 }
  ]
};

// Anomaly thresholds (for detecting unusual patterns)
const anomalyThresholds = {
  userActivityChange: 30, // 30% change day-to-day is unusual
  featureUsageSpike: 50,  // 50% increase in a day is unusual
  errorRateThreshold: 5,  // 5% error rate is unusual
  feedbackNegativeThreshold: 25, // 25% negative feedback is unusual
};

class AnalyticsService {
  /**
   * Initialize Google Analytics 4 tracking
   * This would integrate with the real GA4 in a production environment
   */
  initGA4() {
    // Mock implementation - would be replaced with actual GA4 initialization
    console.log('Google Analytics 4 initialized');
    
    // Set up custom event listeners
    this.setupEventListeners();
    
    return true;
  }
  
  /**
   * Set up custom event listeners for tracking
   */
  setupEventListeners() {
    // Track page views
    if (typeof window !== 'undefined') {
      // Page view tracking
      window.addEventListener('load', () => {
        this.trackEvent('page_view', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname
        });
      });
      
      // Track user interactions (clicks on important elements)
      document.addEventListener('click', (event) => {
        const target = event.target;
        
        // Track button clicks
        if (target.tagName === 'BUTTON' || 
            (target.tagName === 'A' && target.getAttribute('role') === 'button')) {
          this.trackEvent('button_click', {
            button_id: target.id || 'unknown',
            button_text: target.innerText || 'unknown',
            page_path: window.location.pathname
          });
        }
      });
    }
  }
  
  /**
   * Track custom events
   * @param {string} eventName - Name of the event
   * @param {Object} eventParams - Event parameters
   */
  trackEvent(eventName, eventParams = {}) {
    // In a real implementation, this would call GA4 API
    console.log(`Analytics event tracked: ${eventName}`, eventParams);
    
    // Mock GA4 event tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
    
    return true;
  }
  
  /**
   * Get user activity data
   * @param {number} days - Number of days to retrieve (default: 7)
   * @returns {Promise<Array>} - User activity data
   */
  async getUserActivity(days = 7) {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      const data = mockData.userActivity.slice(-days);
      
      return data;
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      throw error;
    }
  }
  
  /**
   * Get feature usage data
   * @param {number} limit - Number of top features to retrieve
   * @returns {Promise<Array>} - Feature usage data
   */
  async getFeatureUsage(limit = 5) {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      const data = mockData.featureUsage.slice(0, limit);
      
      return data;
    } catch (error) {
      console.error('Error fetching feature usage data:', error);
      throw error;
    }
  }
  
  /**
   * Get feedback sentiment data
   * @returns {Promise<Array>} - Feedback sentiment data
   */
  async getFeedbackSentiment() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.feedbackSentiment;
    } catch (error) {
      console.error('Error fetching feedback sentiment data:', error);
      throw error;
    }
  }
  
  /**
   * Get user retention data
   * @returns {Promise<Array>} - User retention data
   */
  async getRetentionData() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.retentionData;
    } catch (error) {
      console.error('Error fetching retention data:', error);
      throw error;
    }
  }
  
  /**
   * Get geographic distribution data
   * @returns {Promise<Array>} - Geographic distribution data
   */
  async getGeographicData() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.geographicData;
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      throw error;
    }
  }
  
  /**
   * Get device distribution data
   * @returns {Promise<Array>} - Device distribution data
   */
  async getDeviceData() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.deviceData;
    } catch (error) {
      console.error('Error fetching device data:', error);
      throw error;
    }
  }
  
  /**
   * Get browser distribution data
   * @returns {Promise<Array>} - Browser distribution data
   */
  async getBrowserData() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.browserData;
    } catch (error) {
      console.error('Error fetching browser data:', error);
      throw error;
    }
  }
  
  /**
   * Get issue resolution data
   * @returns {Promise<Array>} - Issue resolution data
   */
  async getIssueData() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll return mock data
      return mockData.issueData;
    } catch (error) {
      console.error('Error fetching issue data:', error);
      throw error;
    }
  }
  
  /**
   * Check for anomalies in the data
   * @returns {Promise<Array>} - List of detected anomalies
   */
  async detectAnomalies() {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // In a real implementation, this would use actual data and ML algorithms
      // For now, we'll simulate anomaly detection
      const anomalies = [];
      
      // Check for user activity anomalies
      const userActivity = mockData.userActivity;
      for (let i = 1; i < userActivity.length; i++) {
        const prevCount = userActivity[i-1].count;
        const currCount = userActivity[i].count;
        const percentChange = ((currCount - prevCount) / prevCount) * 100;
        
        if (Math.abs(percentChange) > anomalyThresholds.userActivityChange) {
          anomalies.push({
            type: 'user_activity',
            date: userActivity[i].date,
            message: `Unusual ${percentChange > 0 ? 'increase' : 'decrease'} in user activity (${Math.abs(percentChange.toFixed(2))}%)`,
            severity: percentChange > 0 ? 'info' : 'warning'
          });
        }
      }
      
      // Check for high negative feedback
      const feedbackData = mockData.feedbackSentiment;
      for (const category of feedbackData) {
        const total = category.positive + category.neutral + category.negative;
        const negativePercentage = (category.negative / total) * 100;
        
        if (negativePercentage > anomalyThresholds.feedbackNegativeThreshold) {
          anomalies.push({
            type: 'feedback',
            category: category.category,
            message: `High negative feedback in ${category.category} category (${negativePercentage.toFixed(2)}%)`,
            severity: 'warning'
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }
  
  /**
   * Export analytics data
   * @param {string} format - Export format (csv, json)
   * @returns {Promise<Object>} - Export data and metadata
   */
  async exportData(format = 'json') {
    try {
      // Verify admin access
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      // Collect all data
      const allData = {
        userActivity: mockData.userActivity,
        featureUsage: mockData.featureUsage,
        feedbackSentiment: mockData.feedbackSentiment,
        retentionData: mockData.retentionData,
        geographicData: mockData.geographicData,
        deviceData: mockData.deviceData,
        browserData: mockData.browserData,
        issueData: mockData.issueData,
        exportDate: new Date().toISOString(),
        exportFormat: format
      };
      
      if (format === 'csv') {
        // In a real implementation, this would convert data to CSV
        return {
          data: 'CSV data would be generated here',
          filename: `beta-analytics-export-${new Date().toISOString()}.csv`,
          contentType: 'text/csv'
        };
      }
      
      return {
        data: allData,
        filename: `beta-analytics-export-${new Date().toISOString()}.json`,
        contentType: 'application/json'
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService; 