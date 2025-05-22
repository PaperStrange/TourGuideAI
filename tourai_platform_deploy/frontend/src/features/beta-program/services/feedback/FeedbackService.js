/**
 * Feedback Service for Beta Program
 * Handles feedback collection, categorization, and management.
 */

import authService from '../../services/AuthService';

// In-memory storage for feedback items (would use API in production)
const feedbackItems = [];
const feedbackCategories = [
  'bug', 
  'feature-request', 
  'ux-improvement', 
  'performance-issue', 
  'documentation',
  'general'
];

/**
 * Simple ML-based categorization using keyword matching
 * In a real implementation, this would use a proper ML model or API
 */
const categoryKeywords = {
  'bug': ['bug', 'error', 'broken', 'not working', 'issue', 'problem', 'crash', 'exception'],
  'feature-request': ['feature', 'add', 'new', 'would like', 'wish', 'missing', 'enhance'],
  'ux-improvement': ['ui', 'ux', 'interface', 'design', 'layout', 'confusing', 'unclear', 'difficult'],
  'performance-issue': ['slow', 'performance', 'lag', 'fast', 'loading', 'response time', 'timeout'],
  'documentation': ['docs', 'documentation', 'instructions', 'help', 'tutorial', 'explain', 'guide'],
  'general': ['feedback', 'comment', 'suggestion', 'opinion', 'thought']
};

class FeedbackService {
  /**
   * Submit new feedback
   * @param {Object} feedbackData - Feedback data from user
   * @returns {Promise<Object>} - The saved feedback item
   */
  async submitFeedback(feedbackData) {
    try {
      // Verify user is authenticated
      const user = await authService.checkAuthStatus();
      if (!user) {
        throw new Error('User must be authenticated to submit feedback');
      }
      
      // Generate a unique ID for the feedback
      const feedbackId = `feedback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Auto-categorize the feedback
      const category = this.categorizeFeedback(feedbackData.content);
      
      // Create the feedback item
      const feedbackItem = {
        id: feedbackId,
        userId: user.id,
        userEmail: user.email,
        type: feedbackData.type || 'general',
        category: category,
        content: feedbackData.content,
        sentiment: this.analyzeSentiment(feedbackData.content),
        screenshot: feedbackData.screenshot || null,
        metadata: {
          browser: this.getBrowserInfo(),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          appVersion: process.env.REACT_APP_VERSION || '0.0.0'
        },
        status: 'new'
      };
      
      // In a real implementation, this would be an API call
      // For now, we'll store it in memory
      feedbackItems.push(feedbackItem);
      
      // Log feedback submission
      console.log('Feedback submitted:', feedbackItem);
      
      return feedbackItem;
    } catch (error) {
      console.error('Feedback submission error:', error);
      throw error;
    }
  }
  
  /**
   * Get feedback items for the current user
   * @returns {Promise<Array>} - List of feedback items
   */
  async getUserFeedback() {
    try {
      const user = await authService.checkAuthStatus();
      if (!user) {
        return [];
      }
      
      // Filter feedback by user ID
      return feedbackItems.filter(item => item.userId === user.id);
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }
  }
  
  /**
   * Get all feedback items (admin only)
   * @returns {Promise<Array>} - List of all feedback items
   */
  async getAllFeedback() {
    try {
      const user = await authService.checkAuthStatus();
      const isAdmin = await authService.isAdmin();
      
      if (!user || !isAdmin) {
        throw new Error('Admin access required');
      }
      
      return feedbackItems;
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      throw error;
    }
  }
  
  /**
   * Categorize feedback using keyword matching
   * @param {string} content - Feedback content
   * @returns {string} - Category
   */
  categorizeFeedback(content) {
    if (!content) return 'general';
    
    const contentLower = content.toLowerCase();
    
    // Calculate score for each category based on keyword matches
    const scores = {};
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      scores[category] = 0;
      
      for (const keyword of keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          scores[category] += 1;
        }
      }
    }
    
    // Find category with the highest score
    let maxScore = 0;
    let maxCategory = 'general';
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category;
      }
    }
    
    return maxCategory;
  }
  
  /**
   * Simple sentiment analysis (positive, negative, neutral)
   * In a real implementation, this would use a proper sentiment analysis API
   * @param {string} content - Feedback content
   * @returns {string} - Sentiment
   */
  analyzeSentiment(content) {
    if (!content) return 'neutral';
    
    const contentLower = content.toLowerCase();
    
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'like', 'love', 'best'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'worst', 'hate', 'difficult', 'not working'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const word of positiveWords) {
      if (contentLower.includes(word)) positiveScore++;
    }
    
    for (const word of negativeWords) {
      if (contentLower.includes(word)) negativeScore++;
    }
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }
  
  /**
   * Get browser information
   * @returns {Object} - Browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    // Extract browser information from user agent
    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = 'Chrome';
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = 'Firefox';
    } else if (userAgent.match(/safari/i)) {
      browserName = 'Safari';
    } else if (userAgent.match(/opr\//i)) {
      browserName = 'Opera';
    } else if (userAgent.match(/edg/i)) {
      browserName = 'Edge';
    }
    
    return {
      name: browserName,
      userAgent: userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };
  }
  
  /**
   * Get available feedback categories
   * @returns {Array} - List of categories
   */
  getCategories() {
    return feedbackCategories;
  }
  
  /**
   * Update feedback status (admin only)
   * @param {string} feedbackId - Feedback ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated feedback
   */
  async updateFeedbackStatus(feedbackId, status) {
    try {
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
      
      const feedbackIndex = feedbackItems.findIndex(item => item.id === feedbackId);
      if (feedbackIndex === -1) {
        throw new Error('Feedback not found');
      }
      
      feedbackItems[feedbackIndex].status = status;
      
      return feedbackItems[feedbackIndex];
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw error;
    }
  }
}

// Create singleton instance
const feedbackService = new FeedbackService();

export default feedbackService; 