import { api } from '../../../utils/api';

/**
 * Service for interacting with Figma API and managing integrations
 * between our application and Figma projects
 */
class FigmaService {
  /**
   * Check if the current user has a connected Figma account
   * @returns {Promise<Object>} Connection status object
   */
  static async checkConnectionStatus() {
    try {
      const response = await api.get('/integrations/figma/status');
      return response.data;
    } catch (error) {
      console.error('Error checking Figma connection status:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Connect a user's Figma account via OAuth
   * @returns {Promise<Object>} Connection result
   */
  static async connectAccount() {
    try {
      const response = await api.post('/integrations/figma/connect');
      return response.data;
    } catch (error) {
      console.error('Error connecting Figma account:', error);
      throw error;
    }
  }

  /**
   * Disconnect a user's Figma account
   * @returns {Promise<Object>} Disconnection result
   */
  static async disconnectAccount() {
    try {
      const response = await api.post('/integrations/figma/disconnect');
      return response.data;
    } catch (error) {
      console.error('Error disconnecting Figma account:', error);
      throw error;
    }
  }

  /**
   * Get a list of the user's Figma projects
   * @returns {Promise<Array>} List of projects
   */
  static async getProjects() {
    try {
      const response = await api.get('/integrations/figma/projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma projects:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific Figma project
   * @param {string} projectId - The Figma project ID
   * @returns {Promise<Object>} Project details
   */
  static async getProjectDetails(projectId) {
    try {
      const response = await api.get(`/integrations/figma/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Figma project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Link a user journey to a Figma project
   * @param {string} journeyId - The journey ID
   * @param {string} figmaProjectId - The Figma project ID
   * @returns {Promise<Object>} Link result
   */
  static async linkJourneyToFigma(journeyId, figmaProjectId) {
    try {
      const response = await api.post('/integrations/figma/link', {
        journeyId,
        figmaProjectId
      });
      return response.data;
    } catch (error) {
      console.error('Error linking journey to Figma:', error);
      throw error;
    }
  }

  /**
   * Sync journey data with a linked Figma project
   * This updates the journey in our system with any changes from Figma
   * @param {string} journeyId - The journey ID
   * @returns {Promise<Object>} Sync result
   */
  static async syncJourneyWithFigma(journeyId) {
    try {
      const response = await api.post(`/integrations/figma/sync/${journeyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error syncing journey ${journeyId} with Figma:`, error);
      throw error;
    }
  }

  /**
   * Export a journey to Figma as a new file or to an existing file
   * @param {string} journeyId - The journey ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  static async exportJourneyToFigma(journeyId, options = {}) {
    try {
      const response = await api.post(`/integrations/figma/export/${journeyId}`, options);
      return response.data;
    } catch (error) {
      console.error(`Error exporting journey ${journeyId} to Figma:`, error);
      throw error;
    }
  }

  /**
   * Get comments from a Figma file linked to a journey
   * @param {string} journeyId - The journey ID
   * @returns {Promise<Array>} List of comments
   */
  static async getComments(journeyId) {
    try {
      const response = await api.get(`/integrations/figma/comments/${journeyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Figma comments for journey ${journeyId}:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to a Figma file linked to a journey
   * @param {string} journeyId - The journey ID
   * @param {Object} commentData - The comment data
   * @returns {Promise<Object>} Comment result
   */
  static async addComment(journeyId, commentData) {
    try {
      const response = await api.post(`/integrations/figma/comments/${journeyId}`, commentData);
      return response.data;
    } catch (error) {
      console.error(`Error adding Figma comment to journey ${journeyId}:`, error);
      throw error;
    }
  }

  /**
   * Get journey components that can be exported to Figma
   * @param {string} journeyId - The journey ID
   * @returns {Promise<Array>} List of exportable components
   */
  static async getExportableComponents(journeyId) {
    try {
      const response = await api.get(`/integrations/figma/components/${journeyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching exportable components for journey ${journeyId}:`, error);
      throw error;
    }
  }

  /**
   * Import design elements from Figma to a journey
   * @param {string} journeyId - The journey ID
   * @param {Array} elementIds - IDs of Figma elements to import
   * @returns {Promise<Object>} Import result
   */
  static async importDesignElements(journeyId, elementIds) {
    try {
      const response = await api.post(`/integrations/figma/import/${journeyId}`, { elementIds });
      return response.data;
    } catch (error) {
      console.error(`Error importing design elements for journey ${journeyId}:`, error);
      throw error;
    }
  }

  /**
   * Get a thumbnail image for a Figma file
   * @param {string} fileKey - The Figma file key
   * @returns {Promise<string>} Thumbnail URL
   */
  static async getThumbnail(fileKey) {
    try {
      const response = await api.get(`/integrations/figma/thumbnail/${fileKey}`);
      return response.data.thumbnailUrl;
    } catch (error) {
      console.error(`Error fetching thumbnail for Figma file ${fileKey}:`, error);
      throw error;
    }
  }
}

export default FigmaService; 