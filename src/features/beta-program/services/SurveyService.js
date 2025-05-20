/**
 * Survey Service for Beta Program
 * Handles survey creation, management, and response collection with conditional logic
 */

import { apiHelpers } from '../../../core/services/apiClient';

class SurveyService {
  /**
   * Get all surveys available to the user
   * @param {Object} filters Optional filters (status, category, etc.)
   * @returns {Promise<Array>} List of available surveys
   */
  async getSurveys(filters = {}) {
    try {
      const response = await apiHelpers.get('/beta/surveys', { params: filters });
      return response.surveys || [];
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  }

  /**
   * Get a specific survey by ID with all questions and logic
   * @param {string} surveyId Survey identifier
   * @returns {Promise<Object>} Survey data with questions
   */
  async getSurveyById(surveyId) {
    try {
      const response = await apiHelpers.get(`/beta/surveys/${surveyId}`);
      return response.survey;
    } catch (error) {
      console.error('Error fetching survey %s:', surveyId, error);
      throw error;
    }
  }

  /**
   * Submit responses for a survey
   * @param {string} surveyId Survey identifier
   * @param {Array} responses Array of question responses
   * @returns {Promise<Object>} Submission result
   */
  async submitSurveyResponses(surveyId, responses) {
    try {
      const response = await apiHelpers.post(`/beta/surveys/${surveyId}/responses`, {
        responses
      });
      return response;
    } catch (error) {
      console.error('Error submitting survey %s responses:', surveyId, error);
      throw error;
    }
  }

  /**
   * Get response statistics for a survey (admin only)
   * @param {string} surveyId Survey identifier
   * @returns {Promise<Object>} Survey statistics
   */
  async getSurveyStatistics(surveyId) {
    try {
      const response = await apiHelpers.get(`/beta/admin/surveys/${surveyId}/statistics`);
      return response.statistics;
    } catch (error) {
      console.error(`Error fetching survey statistics for ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new survey (admin only)
   * @param {Object} surveyData Survey configuration
   * @returns {Promise<Object>} Created survey
   */
  async createSurvey(surveyData) {
    try {
      const response = await apiHelpers.post('/beta/admin/surveys', surveyData);
      return response.survey;
    } catch (error) {
      console.error('Error creating survey:', error);
      throw error;
    }
  }

  /**
   * Update an existing survey (admin only)
   * @param {string} surveyId Survey identifier
   * @param {Object} surveyData Updated survey data
   * @returns {Promise<Object>} Updated survey
   */
  async updateSurvey(surveyId, surveyData) {
    try {
      const response = await apiHelpers.put(`/beta/admin/surveys/${surveyId}`, surveyData);
      return response.survey;
    } catch (error) {
      console.error(`Error updating survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a survey (admin only)
   * @param {string} surveyId Survey identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSurvey(surveyId) {
    try {
      const response = await apiHelpers.delete(`/beta/admin/surveys/${surveyId}`);
      return response;
    } catch (error) {
      console.error(`Error deleting survey ${surveyId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate conditional logic for a question
   * @param {Object} question Question with conditional logic
   * @param {Object} allResponses Current responses to all questions
   * @returns {boolean} Whether the question should be shown
   */
  evaluateConditionalLogic(question, allResponses) {
    // If no conditions, always show the question
    if (!question.conditions || question.conditions.length === 0) {
      return true;
    }

    const { conditions, logicOperator = 'AND' } = question;
    
    // Evaluate each condition
    const results = conditions.map(condition => {
      const { questionId, operator, value } = condition;
      const response = allResponses[questionId];
      
      // If the question hasn't been answered yet, the condition is not met
      if (response === undefined || response === null) {
        return false;
      }
      
      // Evaluate based on operator
      switch (operator) {
        case 'equals':
          return response === value;
        case 'notEquals':
          return response !== value;
        case 'contains':
          return Array.isArray(response) ? response.includes(value) : String(response).includes(value);
        case 'notContains':
          return Array.isArray(response) ? !response.includes(value) : !String(response).includes(value);
        case 'greaterThan':
          return Number(response) > Number(value);
        case 'lessThan':
          return Number(response) < Number(value);
        case 'isTrue':
          return !!response;
        case 'isFalse':
          return !response;
        default:
          return false;
      }
    });
    
    // Apply logic operator to results
    if (logicOperator === 'AND') {
      return results.every(result => result);
    } else if (logicOperator === 'OR') {
      return results.some(result => result);
    }
    
    return false;
  }

  /**
   * Generate the next question based on current responses
   * @param {Array} questions All questions in the survey
   * @param {Object} currentResponses Current responses
   * @returns {Object|null} The next question to show or null if survey is complete
   */
  getNextQuestion(questions, currentResponses) {
    // Find the first question that should be shown and hasn't been answered
    return questions.find(question => {
      // Skip already answered questions
      if (currentResponses[question.id] !== undefined) {
        return false;
      }
      
      // Evaluate conditional logic
      return this.evaluateConditionalLogic(question, currentResponses);
    }) || null;
  }

  /**
   * Check if a survey is complete based on responses and conditional logic
   * @param {Array} questions All questions in the survey
   * @param {Object} currentResponses Current responses
   * @returns {boolean} Whether all required questions have been answered
   */
  isSurveyComplete(questions, currentResponses) {
    // A survey is complete when all required questions that should be shown have been answered
    return !questions.some(question => {
      // Skip non-required questions
      if (!question.required) {
        return false;
      }
      
      // If the question should be shown based on conditional logic
      if (this.evaluateConditionalLogic(question, currentResponses)) {
        // Check if it's been answered
        return currentResponses[question.id] === undefined;
      }
      
      // Question is not shown due to conditional logic, so it doesn't affect completion
      return false;
    });
  }

  /**
   * Generate survey report with insights
   * (Admin only in real implementation)
   * 
   * @param {string} surveyId Survey ID
   * @param {Object} options Report options (format, sections to include)
   * @returns {Promise<Object>} Survey report with insights
   */
  async generateSurveyReport(surveyId, options = {}) {
    try {
      // Get survey statistics first
      const stats = await this.getSurveyStatistics(surveyId);
      const survey = await this.getSurveyById(surveyId);
      
      // Mock implementation - would be replaced with API call
      // Generate insights based on statistics
      const insights = [
        {
          type: 'highlight',
          text: `${stats.totalResponses} users responded with an average rating of ${stats.questionStats.q1.averageRating}/5`,
          sentimentScore: 0.8
        },
        {
          type: 'trend',
          text: 'Response rate has increased by 15% compared to previous surveys',
          sentimentScore: 0.9
        },
        {
          type: 'improvement',
          text: 'Users who rated below 3 commonly mentioned performance issues',
          sentimentScore: -0.3,
          relatedQuestions: ['q3']
        },
        {
          type: 'positive',
          text: '76% of users would recommend this feature to others',
          sentimentScore: 0.7,
          relatedQuestions: ['q4']
        }
      ];
      
      // Generate word cloud data from text responses
      const wordCloudData = [
        { text: 'intuitive', weight: 15 },
        { text: 'fast', weight: 12 },
        { text: 'useful', weight: 10 },
        { text: 'responsive', weight: 8 },
        { text: 'buggy', weight: 7 },
        { text: 'slow', weight: 6 },
        { text: 'confusing', weight: 5 },
        { text: 'innovative', weight: 4 }
      ];
      
      // Return complete report
      return {
        surveyTitle: survey.title,
        surveyId,
        generatedAt: new Date().toISOString(),
        format: options.format || 'json',
        stats,
        insights,
        wordCloudData,
        segments: {
          highRaters: 29,  // Users who rated 4-5
          mediumRaters: 8, // Users who rated 3
          lowRaters: 5     // Users who rated 1-2
        },
        keyTakeaways: [
          'Feature generally well-received with 76% recommendation rate',
          'Performance improvements should be prioritized',
          'UI is considered intuitive by most users'
        ]
      };
    } catch (error) {
      console.error(`Error generating report for survey ${surveyId}:`, error);
      throw new Error('Failed to generate survey report');
    }
  }

  /**
   * Export survey responses to CSV
   * (Admin only in real implementation)
   * 
   * @param {string} surveyId Survey ID
   * @returns {Promise<string>} CSV data as string
   */
  async exportResponsesToCSV(surveyId) {
    try {
      // This would be an API call in a real implementation
      // For demo purposes, we'll generate a simple CSV
      
      // Get the survey questions for headers
      const survey = await this.getSurveyById(surveyId);
      
      // Mock responses for demo
      const mockResponses = Array(20).fill().map((_, i) => {
        const response = {
          submissionId: `sub_${i + 1}`,
          submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          completionTimeSeconds: Math.floor(120 + Math.random() * 180)
        };
        
        // Add responses for each question
        survey.questions.forEach(question => {
          if (this.evaluateConditionalLogic(question, response)) {
            switch (question.type) {
              case 'rating':
                response[question.id] = Math.floor(1 + Math.random() * 5);
                break;
              case 'boolean':
                response[question.id] = Math.random() > 0.3 ? 'Yes' : 'No';
                break;
              case 'text':
                response[question.id] = `Feedback from user ${i + 1}`;
                break;
              case 'singleChoice':
                response[question.id] = question.options[Math.floor(Math.random() * question.options.length)].text;
                break;
              case 'multipleChoice':
                // Random selection of 1-3 options
                const numOptions = Math.floor(1 + Math.random() * Math.min(3, question.options.length));
                const shuffled = [...question.options].sort(() => 0.5 - Math.random());
                response[question.id] = shuffled.slice(0, numOptions).map(opt => opt.text).join(', ');
                break;
              default:
                response[question.id] = 'Response data';
            }
          }
        });
        
        return response;
      });
      
      // Generate CSV headers
      const headers = [
        'Submission ID',
        'Submitted At',
        'Completion Time (seconds)',
        ...survey.questions.map(q => q.text)
      ];
      
      // Generate CSV rows
      const rows = mockResponses.map(response => [
        response.submissionId,
        response.submittedAt,
        response.completionTimeSeconds,
        ...survey.questions.map(q => response[q.id] !== undefined ? response[q.id] : '')
      ]);
      
      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      return csvContent;
    } catch (error) {
      console.error(`Error exporting survey ${surveyId} to CSV:`, error);
      throw new Error('Failed to export survey responses');
    }
  }

  /**
   * Analyze sentiment in text responses
   * 
   * @param {string} surveyId Survey ID
   * @returns {Promise<Object>} Sentiment analysis results
   */
  async analyzeSentiment(surveyId) {
    try {
      // This would be an API call in a real implementation
      // For demo purposes, we'll return mock sentiment analysis
      
      return {
        overallSentiment: 0.65, // Range from -1 (negative) to 1 (positive)
        questionSentiments: {
          'q3': {
            score: 0.2,
            keywords: [
              { text: 'slow', score: -0.8, count: 6 },
              { text: 'confusing', score: -0.7, count: 5 },
              { text: 'improve', score: 0.3, count: 8 },
              { text: 'useful', score: 0.9, count: 10 }
            ]
          }
        },
        topPositiveThemes: ['user interface', 'ease of use', 'functionality'],
        topNegativeThemes: ['performance', 'loading times', 'error messages']
      };
    } catch (error) {
      console.error(`Error analyzing sentiment for survey ${surveyId}:`, error);
      throw new Error('Failed to analyze sentiment');
    }
  }
}

// Create singleton instance
const surveyService = new SurveyService();

export default surveyService; 