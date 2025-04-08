/**
 * SessionRecordingService
 * Handles session recording playback, events, and interactions
 */
import axios from 'axios';
import { API_ENDPOINTS } from '../../../config/api-endpoints';

class SessionRecordingService {
  /**
   * Get a list of session recordings with optional filters
   * @param {Object} filters - Optional filters for the request
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.dateFrom - Filter by start date
   * @param {string} filters.dateTo - Filter by end date
   * @param {string} filters.deviceType - Filter by device type
   * @param {string} filters.browserType - Filter by browser type
   * @param {number} filters.minDuration - Filter by minimum duration in ms
   * @param {number} filters.page - Page number for pagination
   * @param {number} filters.limit - Number of items per page
   * @returns {Promise<Object>} - Session recordings list with pagination info
   */
  static async getSessions(filters = {}) {
    try {
      const response = await axios.get(API_ENDPOINTS.SESSIONS.LIST, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching session recordings:', error);
      throw error;
    }
  }

  /**
   * Get a specific session recording by ID
   * @param {string} sessionId - The ID of the session to retrieve
   * @returns {Promise<Object>} - The session recording data
   */
  static async getSessionById(sessionId) {
    try {
      const response = await axios.get(API_ENDPOINTS.SESSIONS.GET_BY_ID.replace(':sessionId', sessionId));
      return response.data;
    } catch (error) {
      console.error('Error fetching session recording by ID:', error);
      throw error;
    }
  }

  /**
   * Initialize the canvas player for session playback
   * @param {HTMLCanvasElement} canvas - The canvas element to draw on
   * @param {Object} sessionData - The session recording data
   * @returns {Promise<void>}
   */
  static async initializeCanvasPlayer(canvas, sessionData) {
    if (!canvas || !sessionData) {
      throw new Error('Canvas or session data not provided');
    }

    // Set the canvas dimensions based on the recorded viewport
    const viewport = sessionData.metadata?.viewport || { width: 1280, height: 720 };
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Preload necessary assets (like DOM snapshots and resources)
    await this.preloadSessionAssets(sessionData);

    // Draw the initial frame
    const context = canvas.getContext('2d');
    this.drawInitialFrame(context, sessionData);

    return true;
  }

  /**
   * Preload necessary assets for playback
   * @param {Object} sessionData - The session recording data
   * @returns {Promise<void>}
   */
  static async preloadSessionAssets(sessionData) {
    // This would typically preload DOM snapshots, CSS, and images
    // This is a simplified implementation
    return new Promise((resolve) => {
      // Simulate asset loading with a timeout
      setTimeout(resolve, 500);
    });
  }

  /**
   * Draw the initial frame of the session
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {Object} sessionData - Session recording data
   */
  static drawInitialFrame(context, sessionData) {
    const { width, height } = context.canvas;
    
    // Clear canvas
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    
    // Draw page background
    if (sessionData.initialState && sessionData.initialState.screenshot) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, width, height);
      };
      img.src = sessionData.initialState.screenshot;
    } else {
      // Draw a placeholder if no screenshot
      context.fillStyle = '#F8F9FA';
      context.fillRect(0, 0, width, height);
      
      context.font = '20px Arial';
      context.fillStyle = '#6c757d';
      context.textAlign = 'center';
      context.fillText('Session recording preview', width / 2, height / 2);
    }
  }

  /**
   * Draw a frame at a specific time in the session
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {Object} sessionData - Session recording data
   * @param {number} timeMs - Time in milliseconds to draw
   */
  static drawFrameAtTime(canvas, sessionData, timeMs) {
    if (!canvas || !sessionData) return;
    
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Start with the initial frame
    this.drawInitialFrame(context, sessionData);
    
    // Find all events that occurred before or at the given time
    const events = (sessionData.events || [])
      .filter(event => event.time <= timeMs)
      .sort((a, b) => a.time - b.time);
    
    // Apply each event to build the current state
    events.forEach(event => {
      this.applyEventToCanvas(context, event, sessionData);
    });
    
    // Draw cursor at current position
    const lastMouseEvent = this.findLastMouseEvent(events);
    if (lastMouseEvent) {
      this.drawCursor(context, lastMouseEvent.x, lastMouseEvent.y);
    }
    
    // Draw any active interactions
    const activeInteractions = this.getInteractionsAtTime(sessionData, timeMs);
    activeInteractions.forEach(interaction => {
      this.highlightInteraction(context, interaction);
    });
  }
  
  /**
   * Apply a specific event to the canvas
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {Object} event - Event data
   * @param {Object} sessionData - Session recording data
   */
  static applyEventToCanvas(context, event, sessionData) {
    // In a real implementation, this would update the DOM-like structure
    // and re-render it on the canvas. This is a simplified version.
    
    switch (event.type) {
      case 'click':
        // Draw a click effect
        this.drawClickEffect(context, event.x, event.y);
        break;
        
      case 'scroll':
        // Apply scroll position
        // In a real implementation this would offset the rendered content
        break;
        
      case 'input':
        // Update an input field's value
        // In a real implementation this would update the DOM state
        break;
        
      case 'dom_mutation':
        // Apply DOM changes
        // In a real implementation this would update the DOM structure
        break;
        
      case 'navigation':
        // Handle page navigation
        // In a real implementation this might load a different DOM snapshot
        break;
        
      case 'snapshot':
        // Replace current DOM with a full snapshot
        if (event.screenshot) {
          const img = new Image();
          img.onload = () => {
            context.drawImage(img, 0, 0, context.canvas.width, context.canvas.height);
          };
          img.src = event.screenshot;
        }
        break;
    }
  }
  
  /**
   * Draw a click effect on the canvas
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  static drawClickEffect(context, x, y) {
    // Draw a circle that fades out
    context.beginPath();
    context.arc(x, y, 10, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(66, 133, 244, 0.4)';
    context.fill();
    
    // Draw a smaller inner circle
    context.beginPath();
    context.arc(x, y, 5, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(66, 133, 244, 0.8)';
    context.fill();
  }
  
  /**
   * Draw the cursor on the canvas
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  static drawCursor(context, x, y) {
    // Draw a simple cursor
    const cursorPath = new Path2D();
    cursorPath.moveTo(x, y);
    cursorPath.lineTo(x + 10, y + 10);
    cursorPath.lineTo(x + 5, y + 12);
    cursorPath.lineTo(x + 8, y + 18);
    cursorPath.lineTo(x + 3, y + 16);
    cursorPath.lineTo(x, y + 23);
    cursorPath.lineTo(x, y);
    
    context.fillStyle = '#000000';
    context.fill(cursorPath);
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 1;
    context.stroke(cursorPath);
  }
  
  /**
   * Highlight an interaction on the canvas
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {Object} interaction - Interaction data
   */
  static highlightInteraction(context, interaction) {
    // This would use the interaction's target element selector and position
    // to highlight the relevant part of the interface
    // This is a simplified implementation
    
    if (interaction.bounds) {
      const { x, y, width, height } = interaction.bounds;
      
      context.strokeStyle = interaction.type === 'click' ? '#FF4081' : '#2196F3';
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);
      
      // Add a label
      context.font = '12px Arial';
      context.fillStyle = '#FFFFFF';
      context.fillRect(x, y - 20, interaction.type.length * 7 + 10, 20);
      context.fillStyle = '#000000';
      context.fillText(interaction.type, x + 5, y - 5);
    }
  }
  
  /**
   * Find the last mouse event in a list of events
   * @param {Array} events - List of events
   * @returns {Object|null} - The last mouse event or null
   */
  static findLastMouseEvent(events) {
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === 'mousemove' || event.type === 'click') {
        return event;
      }
    }
    return null;
  }
  
  /**
   * Get interactions active at a specific time
   * @param {Object} sessionData - Session recording data
   * @param {number} timeMs - Time in milliseconds
   * @returns {Array} - List of active interactions
   */
  static getInteractionsAtTime(sessionData, timeMs) {
    // This is a simplified implementation
    // A real implementation would identify all active interactions based on timestamps
    
    const interactions = [];
    const events = (sessionData.events || [])
      .filter(event => event.time <= timeMs && event.time > timeMs - 1000) // Last second
      .sort((a, b) => b.time - a.time); // Most recent first
    
    // Get unique event types from recent events
    const uniqueEvents = [];
    const addedTypes = new Set();
    
    for (const event of events) {
      if (!addedTypes.has(event.type) && (event.type === 'click' || event.type === 'input' || event.type === 'scroll')) {
        addedTypes.add(event.type);
        uniqueEvents.push(event);
      }
      
      // Limit to a reasonable number
      if (uniqueEvents.length >= 5) break;
    }
    
    // Convert events to interactions
    for (const event of uniqueEvents) {
      interactions.push({
        type: event.type,
        element: event.target || '',
        bounds: event.bounds || null,
        time: event.time
      });
    }
    
    return interactions;
  }
  
  /**
   * Add a bookmark to a session recording
   * @param {string} sessionId - Session ID
   * @param {Object} bookmark - Bookmark data
   * @returns {Promise<Object>} - Created bookmark
   */
  static async addBookmark(sessionId, bookmark) {
    try {
      const response = await axios.post(
        API_ENDPOINTS.SESSIONS.ADD_BOOKMARK.replace(':sessionId', sessionId),
        bookmark
      );
      return response.data;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }
  
  /**
   * Report an issue related to a session recording
   * @param {string} sessionId - Session ID
   * @param {Object} issue - Issue data
   * @returns {Promise<Object>} - Created issue
   */
  static async reportIssue(sessionId, issue) {
    try {
      const response = await axios.post(
        API_ENDPOINTS.SESSIONS.REPORT_ISSUE.replace(':sessionId', sessionId),
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
   * @param {string} sessionId - Session ID
   * @returns {Promise<Blob>} - Exported data blob
   */
  static async exportSessionData(sessionId) {
    try {
      const response = await axios.get(
        API_ENDPOINTS.SESSIONS.EXPORT.replace(':sessionId', sessionId),
        { responseType: 'blob' }
      );
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(response.data);
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
   * Get analysis of a session recording
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Session analysis
   */
  static async getSessionAnalysis(sessionId) {
    try {
      const response = await axios.get(
        API_ENDPOINTS.SESSIONS.ANALYSIS.replace(':sessionId', sessionId)
      );
      return response.data;
    } catch (error) {
      console.error('Error getting session analysis:', error);
      throw error;
    }
  }
  
  /**
   * Start a new session recording
   * @param {Object} options - Recording options
   * @returns {Promise<string>} - New session ID
   */
  static async startRecording(options = {}) {
    try {
      const response = await axios.post(API_ENDPOINTS.SESSIONS.START, options);
      return response.data.sessionId;
    } catch (error) {
      console.error('Error starting session recording:', error);
      throw error;
    }
  }
  
  /**
   * Stop an ongoing session recording
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Completed session data
   */
  static async stopRecording(sessionId) {
    try {
      const response = await axios.post(
        API_ENDPOINTS.SESSIONS.STOP.replace(':sessionId', sessionId)
      );
      return response.data;
    } catch (error) {
      console.error('Error stopping session recording:', error);
      throw error;
    }
  }
}

export default SessionRecordingService; 