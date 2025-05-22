/**
 * Hotjar Service
 * Handles integration with Hotjar for session recording and heatmap visualization
 */
class HotjarService {
  constructor() {
    this.isInitialized = false;
    this.hotjarSiteId = process.env.REACT_APP_HOTJAR_SITE_ID || '3000000'; // Replace with actual Hotjar Site ID
    this.hotjarVersion = 6; // Hotjar script version
  }

  /**
   * Initialize Hotjar tracking script
   * @returns {boolean} Whether initialization was successful
   */
  init() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Initialize Hotjar script
      (function(h, o, t, j, a, r) {
        h.hj = h.hj || function() {
          (h.hj.q = h.hj.q || []).push(arguments);
        };
        h._hjSettings = {
          hjid: this.hotjarSiteId,
          hjsv: this.hotjarVersion
        };
        a = o.getElementsByTagName('head')[0];
        r = o.createElement('script');
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

      this.isInitialized = true;
      console.log('Hotjar initialized with site ID:', this.hotjarSiteId);
      return true;
    } catch (error) {
      console.error('Failed to initialize Hotjar:', error);
      return false;
    }
  }

  /**
   * Manually trigger Hotjar recording for specific user action
   * @param {string} action - Description of the user action
   */
  triggerRecording(action) {
    if (!this.isInitialized) {
      this.init();
    }

    if (window.hj) {
      window.hj('trigger', action);
      console.log('Hotjar recording triggered for action:', action);
    }
  }

  /**
   * Identify user for Hotjar recordings
   * @param {string} userId - User ID to identify the user in recordings
   * @param {Object} attributes - Additional user attributes
   */
  identifyUser(userId, attributes = {}) {
    if (!this.isInitialized) {
      this.init();
    }

    if (window.hj) {
      window.hj('identify', userId, attributes);
      console.log('Hotjar user identified:', userId);
    }
  }

  /**
   * Add a custom Hotjar event tag for segmentation
   * @param {string} tagName - Name of the tag
   */
  addTag(tagName) {
    if (!this.isInitialized) {
      this.init();
    }

    if (window.hj) {
      window.hj('event', tagName);
      console.log('Hotjar tag added:', tagName);
    }
  }

  /**
   * Get the URL to view recordings for a specific time period
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @returns {string} URL to Hotjar recordings dashboard
   */
  getRecordingsUrl(startDate, endDate) {
    return `https://insights.hotjar.com/sites/${this.hotjarSiteId}/recordings?date=${startDate}~${endDate}`;
  }

  /**
   * Get the URL to view heatmaps for a specific page
   * @param {string} pageUrl - URL of the page to view heatmaps for
   * @returns {string} URL to Hotjar heatmaps dashboard
   */
  getHeatmapsUrl(pageUrl) {
    const encodedUrl = encodeURIComponent(pageUrl);
    return `https://insights.hotjar.com/sites/${this.hotjarSiteId}/heatmaps?page=${encodedUrl}`;
  }
  
  /**
   * Opt out of Hotjar tracking for privacy purposes
   * This can be called based on user preferences or GDPR requirements
   */
  optOut() {
    if (window._hjSettings) {
      window._hjSettings.sendHotjarData = false;
      console.log('User opted out of Hotjar tracking');
    }
  }
  
  /**
   * Opt in to Hotjar tracking after previously opting out
   */
  optIn() {
    if (window._hjSettings) {
      window._hjSettings.sendHotjarData = true;
      console.log('User opted in to Hotjar tracking');
    }
  }
}

// Create and export a singleton instance
const hotjarService = new HotjarService();
export default hotjarService; 