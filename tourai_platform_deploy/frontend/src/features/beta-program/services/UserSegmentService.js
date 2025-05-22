/**
 * User Segment Service
 * Handles the creation, management, and application of user segments based on demographics and behaviors
 */

import authService from './AuthService';
import analyticsService from './analytics/AnalyticsService';

class UserSegmentService {
  constructor() {
    this.segments = [];
    this.demographicAttributes = [
      { id: 'age', name: 'Age', type: 'range', values: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] },
      { id: 'gender', name: 'Gender', type: 'select', values: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { id: 'education', name: 'Education', type: 'select', values: ['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'Other'] },
      { id: 'income', name: 'Annual Income', type: 'range', values: ['<$30k', '$30k-$60k', '$60k-$100k', '$100k-$150k', '>$150k'] },
      { id: 'location', name: 'Location', type: 'region', values: ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'] },
      { id: 'travelFrequency', name: 'Travel Frequency', type: 'select', values: ['Rarely', '1-2 trips/year', '3-5 trips/year', '6+ trips/year'] },
      { id: 'occupation', name: 'Occupation', type: 'select', values: ['Student', 'Professional', 'Self-employed', 'Retired', 'Other'] },
      { id: 'deviceUsage', name: 'Primary Device', type: 'select', values: ['Desktop', 'Mobile', 'Tablet', 'Multiple devices'] },
      { id: 'techSavviness', name: 'Tech Savviness', type: 'range', values: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] }
    ];
    
    this.behavioralAttributes = [
      { id: 'loginFrequency', name: 'Login Frequency', type: 'range', values: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
      { id: 'featureUsage', name: 'Feature Usage', type: 'select', values: ['Route Planning', 'Map Navigation', 'Location Search', 'Itinerary Sharing'] },
      { id: 'sessionDuration', name: 'Avg. Session Duration', type: 'range', values: ['<5 min', '5-15 min', '15-30 min', '>30 min'] },
      { id: 'completedTasks', name: 'Completed Tasks', type: 'range', values: ['0', '1-3', '4-10', '>10'] },
      { id: 'feedbackSubmitted', name: 'Feedback Submitted', type: 'boolean', values: ['Yes', 'No'] },
      { id: 'issuesReported', name: 'Issues Reported', type: 'range', values: ['0', '1-3', '4-10', '>10'] },
      { id: 'onboardingCompleted', name: 'Onboarding Completed', type: 'boolean', values: ['Yes', 'No'] }
    ];
    
    this.loadSegments();
  }

  /**
   * Load saved segments from storage
   * @private
   */
  async loadSegments() {
    try {
      const savedSegments = localStorage.getItem('userSegments');
      if (savedSegments) {
        this.segments = JSON.parse(savedSegments);
        console.log('Loaded user segments:', this.segments.length);
      } else {
        // Initialize with default segments
        this.segments = [
          {
            id: 'power-users',
            name: 'Power Users',
            description: 'Users who log in frequently and use multiple features',
            criteria: {
              demographic: [],
              behavioral: [
                { attribute: 'loginFrequency', values: ['Daily'] },
                { attribute: 'sessionDuration', values: ['>30 min'] }
              ]
            },
            color: '#4caf50',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'new-users',
            name: 'New Users',
            description: 'Recently registered users still going through onboarding',
            criteria: {
              demographic: [],
              behavioral: [
                { attribute: 'onboardingCompleted', values: ['No'] }
              ]
            },
            color: '#2196f3',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        this.saveSegments();
      }
    } catch (error) {
      console.error('Error loading user segments:', error);
      this.segments = [];
    }
  }

  /**
   * Save segments to storage
   * @private
   */
  saveSegments() {
    try {
      localStorage.setItem('userSegments', JSON.stringify(this.segments));
    } catch (error) {
      console.error('Error saving user segments:', error);
    }
  }

  /**
   * Get all available segments
   * @returns {Array} List of user segments
   */
  getSegments() {
    return [...this.segments];
  }

  /**
   * Get a specific segment by ID
   * @param {string} segmentId - ID of the segment to retrieve
   * @returns {Object|null} The segment or null if not found
   */
  getSegmentById(segmentId) {
    return this.segments.find(segment => segment.id === segmentId) || null;
  }

  /**
   * Create a new user segment
   * @param {Object} segmentData - Data for the new segment
   * @returns {Object} The created segment
   */
  createSegment(segmentData) {
    const newSegment = {
      id: `segment-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: this.getRandomColor(),
      ...segmentData
    };
    
    this.segments.push(newSegment);
    this.saveSegments();
    
    return newSegment;
  }

  /**
   * Update an existing segment
   * @param {string} segmentId - ID of the segment to update
   * @param {Object} updatedData - New segment data
   * @returns {Object|null} The updated segment or null if not found
   */
  updateSegment(segmentId, updatedData) {
    const index = this.segments.findIndex(segment => segment.id === segmentId);
    if (index === -1) return null;
    
    const updatedSegment = {
      ...this.segments[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    this.segments[index] = updatedSegment;
    this.saveSegments();
    
    return updatedSegment;
  }

  /**
   * Delete a segment by ID
   * @param {string} segmentId - ID of the segment to delete
   * @returns {boolean} Whether the deletion was successful
   */
  deleteSegment(segmentId) {
    const initialLength = this.segments.length;
    this.segments = this.segments.filter(segment => segment.id !== segmentId);
    
    if (initialLength !== this.segments.length) {
      this.saveSegments();
      return true;
    }
    
    return false;
  }

  /**
   * Get all available demographic attributes
   * @returns {Array} List of demographic attributes that can be used for segmentation
   */
  getDemographicAttributes() {
    return [...this.demographicAttributes];
  }

  /**
   * Get all available behavioral attributes
   * @returns {Array} List of behavioral attributes that can be used for segmentation
   */
  getBehavioralAttributes() {
    return [...this.behavioralAttributes];
  }

  /**
   * Check if a user matches a segment's criteria
   * @param {string} userId - User ID to check
   * @param {string} segmentId - Segment ID to check against
   * @returns {Promise<boolean>} Whether the user matches the segment
   */
  async isUserInSegment(userId, segmentId) {
    try {
      const segment = this.getSegmentById(segmentId);
      if (!segment) return false;
      
      const user = await this.getUserProfile(userId);
      if (!user) return false;
      
      return this.evaluateUserSegmentMatch(user, segment);
    } catch (error) {
      console.error(`Error checking if user ${userId} is in segment ${segmentId}:`, error);
      return false;
    }
  }

  /**
   * Get users that match a segment's criteria
   * @param {string} segmentId - Segment ID to find users for
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Object>} Matching users with pagination metadata
   */
  async getUsersInSegment(segmentId, options = {}) {
    try {
      const segment = this.getSegmentById(segmentId);
      if (!segment) throw new Error(`Segment ${segmentId} not found`);
      
      // In a real implementation, this would query a user database
      // Here we'll generate some mock users that match the segment
      
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      
      // Generate sample matching users
      const users = Array.from({ length: 17 + Math.floor(Math.random() * 30) }).map((_, index) => {
        const userId = `user-${1000 + index}`;
        const user = this.generateRandomUser(userId, segment);
        return user;
      });
      
      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedUsers = users.slice(start, end);
      
      return {
        users: paginatedUsers,
        pagination: {
          total: users.length,
          page,
          pageSize,
          totalPages: Math.ceil(users.length / pageSize)
        }
      };
    } catch (error) {
      console.error(`Error getting users in segment ${segmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get segments that a user belongs to
   * @param {string} userId - User ID to find segments for
   * @returns {Promise<Array>} List of segments the user belongs to
   */
  async getUserSegments(userId) {
    try {
      const matchingSegments = [];
      const user = await this.getUserProfile(userId);
      
      if (!user) return [];
      
      for (const segment of this.segments) {
        if (this.evaluateUserSegmentMatch(user, segment)) {
          matchingSegments.push(segment);
        }
      }
      
      return matchingSegments;
    } catch (error) {
      console.error(`Error getting segments for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Create a new user persona that can be used for targeting test users
   * @param {Object} personaData - Persona definition data
   * @returns {Object} The created persona
   */
  createPersona(personaData) {
    // In a real implementation, this would store to a database
    const newPersona = {
      id: `persona-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...personaData
    };
    
    console.log('Created new persona:', newPersona);
    return newPersona;
  }

  /**
   * Get user profile with demographic and behavioral data
   * @param {string} userId - User ID to get profile for
   * @returns {Promise<Object|null>} User profile or null if not found
   * @private
   */
  async getUserProfile(userId) {
    try {
      // In a real implementation, this would call an API
      // Here we'll generate a mock user profile
      
      return {
        id: userId,
        demographic: {
          age: ['25-34', '35-44'][Math.floor(Math.random() * 2)],
          gender: ['Male', 'Female'][Math.floor(Math.random() * 2)],
          education: ['Bachelor\'s', 'Master\'s'][Math.floor(Math.random() * 2)],
          income: ['$60k-$100k', '$100k-$150k'][Math.floor(Math.random() * 2)],
          location: ['North America', 'Europe', 'Asia'][Math.floor(Math.random() * 3)],
          travelFrequency: ['1-2 trips/year', '3-5 trips/year'][Math.floor(Math.random() * 2)],
          occupation: ['Professional', 'Self-employed'][Math.floor(Math.random() * 2)],
          deviceUsage: ['Desktop', 'Mobile', 'Multiple devices'][Math.floor(Math.random() * 3)],
          techSavviness: ['Intermediate', 'Advanced'][Math.floor(Math.random() * 2)]
        },
        behavioral: {
          loginFrequency: ['Daily', 'Weekly'][Math.floor(Math.random() * 2)],
          featureUsage: ['Route Planning', 'Map Navigation', 'Location Search'][Math.floor(Math.random() * 3)],
          sessionDuration: ['5-15 min', '15-30 min'][Math.floor(Math.random() * 2)],
          completedTasks: ['1-3', '4-10'][Math.floor(Math.random() * 2)],
          feedbackSubmitted: ['Yes', 'No'][Math.floor(Math.random() * 2)],
          issuesReported: ['0', '1-3'][Math.floor(Math.random() * 2)],
          onboardingCompleted: ['Yes', 'No'][Math.floor(Math.random() * 2)]
        }
      };
    } catch (error) {
      console.error(`Error getting user profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Generate a random user that matches a segment's criteria
   * @param {string} userId - User ID
   * @param {Object} segment - Segment to match
   * @returns {Object} Generated user
   * @private
   */
  generateRandomUser(userId, segment) {
    // This is a simplified example - in a real implementation
    // we'd generate users that strictly match the segment criteria
    
    const user = {
      id: userId,
      name: `Test User ${userId.split('-')[1]}`,
      email: `testuser${userId.split('-')[1]}@example.com`,
      joinDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      demographic: {
        age: ['25-34', '35-44'][Math.floor(Math.random() * 2)],
        gender: ['Male', 'Female'][Math.floor(Math.random() * 2)]
      },
      behavioral: {
        loginFrequency: segment.id === 'power-users' ? 'Daily' : 'Weekly',
        onboardingCompleted: segment.id === 'new-users' ? 'No' : 'Yes'
      }
    };
    
    return user;
  }

  /**
   * Evaluate if a user matches a segment's criteria
   * @param {Object} user - User profile
   * @param {Object} segment - Segment to check against
   * @returns {boolean} Whether the user matches the segment
   * @private
   */
  evaluateUserSegmentMatch(user, segment) {
    // Check demographic criteria
    for (const criterion of segment.criteria.demographic || []) {
      const userValue = user.demographic[criterion.attribute];
      if (!userValue) return false;
      
      // For multi-select attributes
      if (Array.isArray(userValue)) {
        if (!criterion.values.some(val => userValue.includes(val))) {
          return false;
        }
      } else {
        // For single-value attributes
        if (!criterion.values.includes(userValue)) {
          return false;
        }
      }
    }
    
    // Check behavioral criteria
    for (const criterion of segment.criteria.behavioral || []) {
      const userValue = user.behavioral[criterion.attribute];
      if (!userValue) return false;
      
      // For multi-select attributes
      if (Array.isArray(userValue)) {
        if (!criterion.values.some(val => userValue.includes(val))) {
          return false;
        }
      } else {
        // For single-value attributes
        if (!criterion.values.includes(userValue)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Generate a random color for segment visualization
   * @returns {string} Hex color code
   * @private
   */
  getRandomColor() {
    const colors = [
      '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', 
      '#673ab7', '#3f51b5', '#00bcd4', '#009688', '#8bc34a',
      '#cddc39', '#ffeb3b', '#ffc107', '#795548', '#607d8b'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Create and export singleton instance
const userSegmentService = new UserSegmentService();
export default userSegmentService; 