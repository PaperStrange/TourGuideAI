/**
 * SessionRecordingService
 * Handles session recording playback, events, and interactions
 */
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';

class SessionRecordingService {
  /**
   * Fetch all session recordings with optional filtering
   * @param {Object} filters - Optional filters (userId, dateRange, deviceType)
   * @returns {Promise<Array>} - List of session recordings
   */
  static async getSessionRecordings(filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/session-recordings`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching session recordings:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific session recording by ID
   * @param {string} sessionId - The ID of the session recording
   * @returns {Promise<Object>} - Session recording data including events
   */
  static async getSessionRecording(sessionId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/session-recordings/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching session recording ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add a bookmark to a session recording
   * @param {string} sessionId - The ID of the session recording
   * @param {Object} bookmark - Bookmark data (time, label)
   * @returns {Promise<Object>} - Created bookmark
   */
  static async addBookmark(sessionId, bookmark) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/session-recordings/${sessionId}/bookmarks`, 
        bookmark
      );
      return response.data;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  /**
   * Report an issue at a specific point in a session recording
   * @param {string} sessionId - The ID of the session recording
   * @param {Object} issue - Issue data (time, description, screenshot)
   * @returns {Promise<Object>} - Created issue
   */
  static async reportIssue(sessionId, issue) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/session-recordings/${sessionId}/issues`, 
        issue
      );
      return response.data;
    } catch (error) {
      console.error('Error reporting issue:', error);
      throw error;
    }
  }

  /**
   * Export session data for download
   * @param {string} sessionId - The ID of the session recording
   * @returns {Promise<Blob>} - Binary data of the export file
   */
  static async exportSessionData(sessionId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/session-recordings/${sessionId}/export`,
        { responseType: 'blob' }
      );
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-${sessionId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return response.data;
    } catch (error) {
      console.error('Error exporting session data:', error);
      throw error;
    }
  }

  /**
   * Start recording a user session
   * @param {Object} options - Recording options (captureEvents, captureScreen, etc)
   * @returns {Promise<Object>} - Created session data with ID
   */
  static async startRecording(options = {}) {
    try {
      const metadata = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        device: this.detectDevice(),
        browser: this.detectBrowser(),
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...options
      };
      
      const response = await axios.post(`${API_BASE_URL}/session-recordings`, {
        metadata,
        events: []
      });
      
      return response.data;
    } catch (error) {
      console.error('Error starting session recording:', error);
      throw error;
    }
  }

  /**
   * Add an event to the current recording session
   * @param {string} sessionId - The ID of the session recording
   * @param {Object} event - Event data (type, time, payload)
   * @returns {Promise<Object>} - Updated session data
   */
  static async recordEvent(sessionId, event) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/session-recordings/${sessionId}/events`,
        event
      );
      return response.data;
    } catch (error) {
      console.error('Error recording event:', error);
      throw error;
    }
  }

  /**
   * Stop the current recording session
   * @param {string} sessionId - The ID of the session recording
   * @returns {Promise<Object>} - Updated session data
   */
  static async stopRecording(sessionId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/session-recordings/${sessionId}/stop`
      );
      return response.data;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Helper method to detect device type
   * @returns {string} - Device type
   */
  static detectDevice() {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Windows Phone/i.test(userAgent)) return 'Windows Phone';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  /**
   * Helper method to detect browser
   * @returns {string} - Browser name and version
   */
  static detectBrowser() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('SamsungBrowser') > -1) {
      browser = 'Samsung';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
      browser = 'Opera';
    } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
      browser = 'Edge';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
      browser = 'Internet Explorer';
    }
    
    return browser;
  }
}

export default SessionRecordingService; 