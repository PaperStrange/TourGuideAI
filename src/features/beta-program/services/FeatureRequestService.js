import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';

/**
 * Feature Request Service
 * Manages feature requests including submission, voting, categorization, and analysis
 */
class FeatureRequestService {
  /**
   * Get all feature requests with filters
   * 
   * @param {Object} filters Optional filters for status, category, sort order
   * @returns {Promise<Array>} List of feature requests
   */
  async getFeatureRequests(filters = {}) {
    try {
      // For demo, this would call the API
      // In a real implementation, this would make an API request with filters
      
      // Mock data for development
      return [
        {
          id: 'feature_1',
          title: 'Multi-language support',
          description: 'Add support for French, Spanish, and German languages',
          status: 'under_review',
          category: 'Localization',
          votes: 42,
          userId: 'user_123',
          userName: 'Alex Johnson',
          createdAt: '2023-07-15T10:00:00Z',
          updatedAt: '2023-07-18T14:30:00Z',
          comments: 8,
          tags: ['internationalization', 'language'],
          implementationDifficulty: 'medium',
          businessValue: 'high'
        },
        {
          id: 'feature_2',
          title: 'Dark mode theme',
          description: 'Add a dark mode option to reduce eye strain in low-light conditions',
          status: 'planned',
          category: 'User Interface',
          votes: 78,
          userId: 'user_456',
          userName: 'Sam Wilson',
          createdAt: '2023-07-10T09:15:00Z',
          updatedAt: '2023-07-19T11:45:00Z',
          comments: 12,
          tags: ['ui', 'accessibility', 'theme'],
          implementationDifficulty: 'low',
          businessValue: 'medium',
          plannedReleaseVersion: '2.4.0'
        },
        {
          id: 'feature_3',
          title: 'Offline mode',
          description: 'Allow users to access core functionality when offline and sync when connection is restored',
          status: 'in_progress',
          category: 'Functionality',
          votes: 56,
          userId: 'user_789',
          userName: 'Jamie Taylor',
          createdAt: '2023-07-05T14:20:00Z',
          updatedAt: '2023-07-20T09:30:00Z',
          comments: 5,
          tags: ['offline', 'sync', 'connectivity'],
          implementationDifficulty: 'high',
          businessValue: 'high',
          assignedDeveloper: 'Dev Team Alpha',
          estimatedCompletion: '2023-08-15'
        },
        {
          id: 'feature_4',
          title: 'Export data to CSV',
          description: 'Allow users to export their data in CSV format for analysis in spreadsheet tools',
          status: 'implemented',
          category: 'Data Management',
          votes: 35,
          userId: 'user_101',
          userName: 'Morgan Lee',
          createdAt: '2023-06-28T11:10:00Z',
          updatedAt: '2023-07-10T16:20:00Z',
          comments: 3,
          tags: ['export', 'data', 'csv'],
          implementationDifficulty: 'low',
          businessValue: 'medium',
          implementedVersion: '2.3.0',
          releaseDate: '2023-07-10'
        },
        {
          id: 'feature_5',
          title: 'Image annotation tools',
          description: 'Add tools for annotating images with notes and markers',
          status: 'new',
          category: 'Content Creation',
          votes: 12,
          userId: 'user_202',
          userName: 'Riley Garcia',
          createdAt: '2023-07-19T08:45:00Z',
          updatedAt: '2023-07-19T08:45:00Z',
          comments: 1,
          tags: ['images', 'annotation', 'content'],
          implementationDifficulty: 'medium',
          businessValue: 'medium'
        }
      ].filter(request => {
        // Apply filters if provided
        if (filters.status && request.status !== filters.status) return false;
        if (filters.category && request.category !== filters.category) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return (
            request.title.toLowerCase().includes(search) ||
            request.description.toLowerCase().includes(search) ||
            request.tags.some(tag => tag.toLowerCase().includes(search))
          );
        }
        return true;
      }).sort((a, b) => {
        // Apply sorting
        if (filters.sortBy === 'votes') return b.votes - a.votes;
        if (filters.sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
        if (filters.sortBy === 'updated') return new Date(b.updatedAt) - new Date(a.updatedAt);
        // Default sort by votes
        return b.votes - a.votes;
      });
    } catch (error) {
      console.error('Error fetching feature requests:', error);
      throw new Error('Failed to fetch feature requests');
    }
  }

  /**
   * Get feature request by ID
   * 
   * @param {string} requestId Feature request ID
   * @returns {Promise<Object>} Feature request data
   */
  async getFeatureRequestById(requestId) {
    try {
      // This would be an API call in a real implementation
      const mockComments = [
        {
          id: 'comment_1',
          requestId: 'feature_1',
          userId: 'user_456',
          userName: 'Sam Wilson',
          content: 'I would specifically like to see Japanese added as well.',
          createdAt: '2023-07-16T11:30:00Z',
          likes: 3
        },
        {
          id: 'comment_2',
          requestId: 'feature_1',
          userId: 'user_789',
          userName: 'Jamie Taylor',
          content: 'This would be great for our international users.',
          createdAt: '2023-07-17T09:45:00Z',
          likes: 5
        },
        {
          id: 'comment_3',
          requestId: 'feature_1',
          userId: 'user_202',
          userName: 'Riley Garcia',
          content: 'I can help with Spanish translations if needed.',
          createdAt: '2023-07-18T14:20:00Z',
          likes: 2
        }
      ];
      
      // Get all requests and find the one matching the ID
      const requests = await this.getFeatureRequests();
      const request = requests.find(r => r.id === requestId);
      
      if (!request) {
        throw new Error('Feature request not found');
      }
      
      // Add comments to the request
      return {
        ...request,
        comments: mockComments.filter(c => c.requestId === requestId)
      };
    } catch (error) {
      console.error(`Error fetching feature request ${requestId}:`, error);
      throw new Error('Failed to fetch feature request');
    }
  }

  /**
   * Submit a new feature request
   * 
   * @param {Object} requestData Feature request data
   * @returns {Promise<Object>} Created feature request
   */
  async submitFeatureRequest(requestData) {
    try {
      // In a real implementation, this would make an API request
      console.log('Submitting feature request:', requestData);
      
      // Validate required fields
      if (!requestData.title) {
        throw new Error('Title is required');
      }
      if (!requestData.description) {
        throw new Error('Description is required');
      }
      
      // Mock user data for the demo
      const userData = {
        userId: 'current_user_123',
        userName: 'Current User'
      };
      
      // Create new feature request
      const newRequest = {
        id: `feature_${Date.now()}`,
        title: requestData.title,
        description: requestData.description,
        status: 'new',
        category: requestData.category || 'General',
        votes: 1, // Creator's vote
        userId: userData.userId,
        userName: userData.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: 0,
        tags: requestData.tags || [],
        implementationDifficulty: 'undetermined',
        businessValue: 'undetermined'
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return newRequest;
    } catch (error) {
      console.error('Error submitting feature request:', error);
      throw new Error(`Failed to submit feature request: ${error.message}`);
    }
  }

  /**
   * Vote on a feature request
   * 
   * @param {string} requestId Feature request ID
   * @param {boolean} isUpvote True for upvote, false for remove vote
   * @returns {Promise<Object>} Updated vote count
   */
  async voteOnFeatureRequest(requestId, isUpvote) {
    try {
      // In a real implementation, this would make an API request
      console.log(`${isUpvote ? 'Upvoting' : 'Removing vote for'} feature request ${requestId}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock updated vote count
      return {
        requestId,
        votes: isUpvote ? 43 : 41 // Mock value based on initial count of 42
      };
    } catch (error) {
      console.error('Error voting on feature request:', error);
      throw new Error('Failed to vote on feature request');
    }
  }

  /**
   * Add a comment to a feature request
   * 
   * @param {string} requestId Feature request ID
   * @param {string} content Comment content
   * @returns {Promise<Object>} Created comment
   */
  async addComment(requestId, content) {
    try {
      // In a real implementation, this would make an API request
      console.log(`Adding comment to feature request ${requestId}:`, content);
      
      // Validate content
      if (!content) {
        throw new Error('Comment content is required');
      }
      
      // Mock user data for the demo
      const userData = {
        userId: 'current_user_123',
        userName: 'Current User'
      };
      
      // Create new comment
      const newComment = {
        id: `comment_${Date.now()}`,
        requestId,
        userId: userData.userId,
        userName: userData.userName,
        content,
        createdAt: new Date().toISOString(),
        likes: 0
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get feature request categories
   * 
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    try {
      // This would be an API call in a real implementation
      return [
        { id: 'general', name: 'General' },
        { id: 'ui', name: 'User Interface' },
        { id: 'functionality', name: 'Functionality' },
        { id: 'performance', name: 'Performance' },
        { id: 'accessibility', name: 'Accessibility' },
        { id: 'localization', name: 'Localization' },
        { id: 'integration', name: 'Integration' },
        { id: 'data_management', name: 'Data Management' },
        { id: 'content_creation', name: 'Content Creation' },
        { id: 'security', name: 'Security' }
      ];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Update feature request status (admin only)
   * 
   * @param {string} requestId Feature request ID
   * @param {string} status New status
   * @param {Object} statusData Additional status data
   * @returns {Promise<Object>} Updated feature request
   */
  async updateFeatureRequestStatus(requestId, status, statusData = {}) {
    try {
      // In a real implementation, this would make an API request with admin auth
      console.log(`Updating feature request ${requestId} status to ${status}`, statusData);
      
      // Validate status
      const validStatuses = ['new', 'under_review', 'planned', 'in_progress', 'implemented', 'declined'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock updated feature request
      return {
        id: requestId,
        status,
        updatedAt: new Date().toISOString(),
        ...statusData
      };
    } catch (error) {
      console.error('Error updating feature request status:', error);
      throw new Error('Failed to update feature request status');
    }
  }

  /**
   * Get feature request analytics (admin only)
   * 
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    try {
      // This would be an API call in a real implementation
      return {
        totalRequests: 28,
        requestsByStatus: {
          new: 8,
          under_review: 5,
          planned: 4,
          in_progress: 3,
          implemented: 6,
          declined: 2
        },
        requestsByCategory: {
          'User Interface': 7,
          'Functionality': 5,
          'Performance': 3,
          'Data Management': 4,
          'Localization': 3,
          'Content Creation': 2,
          'General': 4
        },
        topVotedRequests: [
          { id: 'feature_2', title: 'Dark mode theme', votes: 78 },
          { id: 'feature_6', title: 'Mobile app version', votes: 67 },
          { id: 'feature_3', title: 'Offline mode', votes: 56 },
          { id: 'feature_1', title: 'Multi-language support', votes: 42 },
          { id: 'feature_4', title: 'Export data to CSV', votes: 35 }
        ],
        implementationTimeline: [
          { month: 'July', count: 2 },
          { month: 'August', count: 3 },
          { month: 'September', planned: 4 }
        ]
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch analytics');
    }
  }
}

// Create and export a singleton instance
const featureRequestService = new FeatureRequestService();
export default featureRequestService; 