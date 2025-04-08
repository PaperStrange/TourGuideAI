/**
 * Task Prompt Service
 * Manages in-app testing prompts, task tracking, and user completion statistics
 */

import authService from './AuthService';
import analyticsService from './analytics/AnalyticsService';
import userSegmentService from './UserSegmentService';
import { apiClient } from '../../../utils/api';
import { localStorageKeys } from '../../../utils/constants';
import api from '../../../utils/api';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/constants';
import { getAuthToken } from '../../../utils/auth';

class TaskPromptService {
  constructor() {
    this.tasks = [];
    this.userTasks = {};
    this.contextRules = [];
    this.taskDefinitions = [];
    this.userTaskProgress = {};
    
    // Load task definitions on initialization
    this.loadTaskDefinitions();
    this.loadTasks();
  }

  /**
   * Load saved tasks from storage
   * @private
   */
  async loadTasks() {
    try {
      const savedTasks = localStorage.getItem('testingTasks');
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
        console.log('Loaded testing tasks:', this.tasks.length);
      } else {
        // Initialize with example tasks
        this.tasks = [
          {
            id: 'task-1',
            title: 'Create a new route in Route Planner',
            description: 'Try creating a new route from your current location to a destination of your choice',
            userSegmentId: 'new-users',
            steps: [
              'Navigate to the Route Planner tab',
              'Click "Create New Route"',
              'Select your current location as the starting point',
              'Search for and select a destination',
              'Review and save the route'
            ],
            expectedDuration: 300, // seconds
            priority: 'high',
            status: 'active',
            successCriteria: [
              { key: 'route_saved', description: 'Route was successfully saved', required: true },
              { key: 'under_time', description: 'Completed within expected duration', required: false }
            ],
            contextTriggers: [
              { page: 'dashboard', visitCount: 2 },
              { feature: 'route-planner', action: 'view' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'task-2',
            title: 'Share an itinerary with a friend',
            description: 'Create and share an itinerary with a friend via email or link',
            userSegmentId: 'power-users',
            steps: [
              'Navigate to your saved routes',
              'Select a route to convert to an itinerary',
              'Click "Create Itinerary"',
              'Add activities and descriptions',
              'Click "Share" and choose sharing method'
            ],
            expectedDuration: 420, // seconds
            priority: 'medium',
            status: 'active',
            successCriteria: [
              { key: 'itinerary_created', description: 'Itinerary was created from route', required: true },
              { key: 'shared', description: 'Itinerary was shared', required: true }
            ],
            contextTriggers: [
              { page: 'routes', routeCount: 1 },
              { feature: 'itinerary', action: 'view' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        this.saveTasks();
      }

      const savedUserTasks = localStorage.getItem('userTestingTasks');
      if (savedUserTasks) {
        this.userTasks = JSON.parse(savedUserTasks);
      }
    } catch (error) {
      console.error('Error loading testing tasks:', error);
      this.tasks = [];
      this.userTasks = {};
    }
  }

  /**
   * Save tasks to storage
   * @private
   */
  saveTasks() {
    try {
      localStorage.setItem('testingTasks', JSON.stringify(this.tasks));
    } catch (error) {
      console.error('Error saving testing tasks:', error);
    }
  }

  /**
   * Save user tasks to storage
   * @private
   */
  saveUserTasks() {
    try {
      localStorage.setItem('userTestingTasks', JSON.stringify(this.userTasks));
    } catch (error) {
      console.error('Error saving user testing tasks:', error);
    }
  }

  /**
   * Get all available tasks
   * @returns {Array} List of testing tasks
   */
  getTasks() {
    return [...this.tasks];
  }

  /**
   * Get active tasks for a specific user
   * @param {string} userId - User ID to get tasks for
   * @returns {Promise<Array>} List of active tasks for the user
   */
  async getTasksForUser(userId) {
    try {
      // Get user's segments
      const userSegments = await userSegmentService.getUserSegments(userId);
      const segmentIds = userSegments.map(segment => segment.id);
      
      // Find tasks that match user's segments
      const matchingTasks = this.tasks.filter(task => 
        task.status === 'active' && 
        (task.userSegmentId === null || segmentIds.includes(task.userSegmentId))
      );
      
      // Get user progress for these tasks
      const userProgress = this.getUserTaskProgress(userId);
      
      // Combine task details with user progress
      return matchingTasks.map(task => ({
        ...task,
        progress: userProgress[task.id] || {
          started: false,
          completed: false,
          currentStep: 0,
          startedAt: null,
          completedAt: null,
          stepProgress: []
        }
      }));
    } catch (error) {
      console.error(`Error getting tasks for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get a specific task by ID
   * @param {string} taskId - ID of the task to retrieve
   * @returns {Object|null} The task or null if not found
   */
  getTaskById(taskId) {
    return this.tasks.find(task => task.id === taskId) || null;
  }

  /**
   * Create a new testing task
   * @param {Object} taskData - Data for the new task
   * @returns {Object} The created task
   */
  createTask(taskData) {
    const newTask = {
      id: `task-${Date.now()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...taskData
    };
    
    this.tasks.push(newTask);
    this.saveTasks();
    
    return newTask;
  }

  /**
   * Update an existing task
   * @param {string} taskId - ID of the task to update
   * @param {Object} updatedData - New task data
   * @returns {Object|null} The updated task or null if not found
   */
  updateTask(taskId, updatedData) {
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index === -1) return null;
    
    const updatedTask = {
      ...this.tasks[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    this.tasks[index] = updatedTask;
    this.saveTasks();
    
    return updatedTask;
  }

  /**
   * Delete a task by ID
   * @param {string} taskId - ID of the task to delete
   * @returns {boolean} Whether the deletion was successful
   */
  deleteTask(taskId) {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    
    if (initialLength !== this.tasks.length) {
      this.saveTasks();
      return true;
    }
    
    return false;
  }

  /**
   * Create a context rule for when to show tasks
   * @param {Object} ruleData - Rule configuration
   * @returns {Object} The created rule
   */
  createContextRule(ruleData) {
    const newRule = {
      id: `rule-${Date.now()}`,
      ...ruleData,
      createdAt: new Date().toISOString()
    };
    
    this.contextRules.push(newRule);
    return newRule;
  }

  /**
   * Get available tasks for a specific context
   * @param {string} context - The current app context (e.g., 'map_view', 'itinerary_editor', etc.)
   * @returns {Promise<Array>} - Promise resolving to an array of task objects
   */
  async getTasksForContext(context) {
    try {
      const response = await api.get(`/beta/tasks?context=${context}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tasks for context:', error);
      
      // Fallback to local storage for offline support
      const localTasks = this._getLocalTasks();
      return localTasks.filter(task => task.context === context && !this._isTaskCompleted(task.id));
    }
  }

  /**
   * Get all available tasks for the current user
   * @param {object} filters - Optional filters like status, category, etc.
   * @returns {Promise<Array>} - Promise resolving to an array of task objects
   */
  async getAllTasks(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/beta/tasks?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all tasks:', error);
      return this._getLocalTasks();
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId - The task ID
   * @returns {Promise<object>} - Promise resolving to a task object
   */
  async getTaskById(taskId) {
    try {
      const response = await api.get(`/beta/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch task ${taskId}:`, error);
      
      // Fallback to local storage
      const localTasks = this._getLocalTasks();
      return localTasks.find(task => task.id === taskId);
    }
  }

  /**
   * Start a task for a user
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @returns {object} - Object with task progress info
   */
  startTask(userId, taskId) {
    try {
      // Attempt to send to API
      api.post(`/beta/tasks/${taskId}/start`, { userId });
      
      // Update local progress tracking
      const progress = {
        userId,
        taskId,
        started: true,
        startTime: new Date().toISOString(),
        currentStep: 0,
        completed: false
      };
      
      this._saveTaskProgress(taskId, progress);
      return progress;
    } catch (error) {
      console.error(`Failed to start task ${taskId}:`, error);
      
      // If API call fails, still update local tracking
      const progress = {
        userId,
        taskId,
        started: true,
        startTime: new Date().toISOString(),
        currentStep: 0,
        completed: false
      };
      
      this._saveTaskProgress(taskId, progress);
      return progress;
    }
  }

  /**
   * Complete a step in a task
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @param {number} stepIndex - The index of the completed step
   * @returns {object} - Updated progress object
   */
  completeStep(userId, taskId, stepIndex) {
    try {
      // Get the task to check total steps
      const task = this._getLocalTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Calculate if this completes the entire task
      const nextStep = stepIndex + 1;
      const isCompleted = nextStep >= task.steps.length;
      
      // Create progress object
      const progress = {
        userId,
        taskId,
        started: true,
        currentStep: nextStep,
        completed: isCompleted,
        completedSteps: [...Array(nextStep).keys()],
        lastUpdated: new Date().toISOString()
      };
      
      if (isCompleted) {
        progress.completionTime = new Date().toISOString();
      }
      
      // Save progress locally
      this._saveTaskProgress(taskId, progress);
      
      // Send to API
      api.post(`/beta/tasks/${taskId}/progress`, progress)
        .catch(err => console.error('Failed to sync task progress:', err));
        
      return progress;
    } catch (error) {
      console.error(`Failed to complete step for task ${taskId}:`, error);
      
      // Return existing progress
      return this._getTaskProgress(taskId) || {
        userId,
        taskId,
        started: true,
        currentStep: stepIndex,
        completed: false
      };
    }
  }

  /**
   * Abandon a task
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @param {string} reason - Reason for abandoning
   * @returns {boolean} - Success status
   */
  abandonTask(userId, taskId, reason = '') {
    try {
      // Get current progress
      const progress = this._getTaskProgress(taskId) || {
        userId,
        taskId,
        started: true,
        currentStep: 0
      };
      
      // Update with abandonment info
      const updatedProgress = {
        ...progress,
        abandoned: true,
        abandonReason: reason,
        abandonTime: new Date().toISOString()
      };
      
      // Save locally
      this._saveTaskProgress(taskId, updatedProgress);
      
      // Send to API
      api.post(`/beta/tasks/${taskId}/abandon`, {
        userId,
        reason,
        progress: updatedProgress
      }).catch(err => console.error('Failed to sync task abandonment:', err));
      
      return true;
    } catch (error) {
      console.error(`Failed to abandon task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Get user progress statistics
   * @param {string} userId - The user ID
   * @returns {Promise<object>} - User task statistics
   */
  async getUserTaskStats(userId) {
    try {
      const response = await api.get(`/beta/users/${userId}/task-stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user task stats:', error);
      
      // Calculate from local data
      const allProgress = this._getAllTaskProgress();
      const completed = Object.values(allProgress).filter(p => p.completed).length;
      const abandoned = Object.values(allProgress).filter(p => p.abandoned).length;
      const inProgress = Object.values(allProgress).filter(p => p.started && !p.completed && !p.abandoned).length;
      
      return {
        completed,
        abandoned,
        inProgress,
        total: completed + abandoned + inProgress
      };
    }
  }

  // Private helper methods
  
  /**
   * Get all task progress from local storage
   * @returns {object} - Object with task IDs as keys and progress objects as values
   * @private
   */
  _getAllTaskProgress() {
    try {
      const progressJson = localStorage.getItem(localStorageKeys.TASK_PROGRESS);
      return progressJson ? JSON.parse(progressJson) : {};
    } catch (error) {
      console.error('Failed to get task progress from local storage:', error);
      return {};
    }
  }

  /**
   * Get progress for a specific task
   * @param {string} taskId - The task ID
   * @returns {object|null} - Task progress object or null
   * @private
   */
  _getTaskProgress(taskId) {
    const allProgress = this._getAllTaskProgress();
    return allProgress[taskId] || null;
  }

  /**
   * Save task progress to local storage
   * @param {string} taskId - The task ID
   * @param {object} progress - Task progress object
   * @private
   */
  _saveTaskProgress(taskId, progress) {
    try {
      const allProgress = this._getAllTaskProgress();
      allProgress[taskId] = progress;
      localStorage.setItem(localStorageKeys.TASK_PROGRESS, JSON.stringify(allProgress));
    } catch (error) {
      console.error('Failed to save task progress to local storage:', error);
    }
  }

  /**
   * Check if a task is completed
   * @param {string} taskId - The task ID
   * @returns {boolean} - Whether the task is completed
   * @private
   */
  _isTaskCompleted(taskId) {
    const progress = this._getTaskProgress(taskId);
    return progress && progress.completed;
  }

  /**
   * Get tasks from local storage (fallback for offline mode)
   * @returns {Array} - Array of task objects
   * @private
   */
  _getLocalTasks() {
    try {
      const tasksJson = localStorage.getItem(localStorageKeys.TASKS);
      return tasksJson ? JSON.parse(tasksJson) : [];
    } catch (error) {
      console.error('Failed to get tasks from local storage:', error);
      return [];
    }
  }

  /**
   * Get a specific task from local storage
   * @param {string} taskId - The task ID
   * @returns {object|null} - Task object or null
   * @private
   */
  _getLocalTask(taskId) {
    const localTasks = this._getLocalTasks();
    return localTasks.find(task => task.id === taskId) || null;
  }

  /**
   * Loads task definitions from the backend
   * In a real app, this would fetch from an API
   */
  async loadTaskDefinitions() {
    try {
      // Mocked task definitions - in a real app, would fetch from API
      this.taskDefinitions = [
        {
          id: 'task-profile-setup',
          title: 'Complete Your Profile',
          description: 'Update your profile information to enhance your TourGuideAI experience.',
          requiredRole: 'beta_tester',
          priority: 'high',
          context: ['dashboard', 'account_settings'],
          steps: [
            'Navigate to your profile settings',
            'Upload a profile picture',
            'Add your travel preferences',
            'Set your notification preferences'
          ],
          estimatedTime: '5 minutes',
          createdAt: new Date().toISOString(),
          version: '1.0'
        },
        {
          id: 'task-map-feature',
          title: 'Try the Interactive Map Feature',
          description: 'Explore nearby attractions using our interactive map.',
          requiredRole: 'beta_tester',
          priority: 'medium',
          context: ['dashboard', 'map_view'],
          steps: [
            'Open the map view',
            'Search for a location',
            'Filter attractions by category',
            'Save at least one location to your favorites'
          ],
          estimatedTime: '10 minutes',
          createdAt: new Date().toISOString(),
          version: '1.0'
        },
        {
          id: 'task-feature-request',
          title: 'Submit Your First Feature Request',
          description: 'Help us improve by suggesting new features.',
          requiredRole: 'beta_tester',
          priority: 'medium',
          context: ['feature_list', 'beta_program'],
          steps: [
            'Go to Feature Requests section',
            'Click on "New Request" button',
            'Fill in the feature description',
            'Submit your request'
          ],
          estimatedTime: '7 minutes',
          createdAt: new Date().toISOString(),
          version: '1.0'
        },
        {
          id: 'task-survey-completion',
          title: 'Complete Onboarding Survey',
          description: 'Share your initial impressions of TourGuideAI.',
          requiredRole: 'beta_tester',
          priority: 'high',
          context: ['dashboard', 'survey_list'],
          steps: [
            'Navigate to Surveys section',
            'Find the "Onboarding Survey"',
            'Complete all survey questions',
            'Submit your responses'
          ],
          estimatedTime: '8 minutes',
          createdAt: new Date().toISOString(),
          version: '1.0'
        },
        {
          id: 'task-create-itinerary',
          title: 'Create Your First Travel Itinerary',
          description: 'Plan a day trip using our itinerary builder.',
          requiredRole: 'beta_tester',
          priority: 'low',
          context: ['dashboard', 'itinerary_planner'],
          steps: [
            'Navigate to Itinerary Planner',
            'Set a destination and date',
            'Add at least 3 attractions to your itinerary',
            'Save your itinerary'
          ],
          estimatedTime: '15 minutes',
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
      ];
      
      console.log(`Loaded ${this.taskDefinitions.length} task definitions`);
      return this.taskDefinitions;
    } catch (error) {
      console.error('Failed to load task definitions:', error);
      return [];
    }
  }
  
  /**
   * Gets tasks for a specific user context
   * @param {string} userId - The user's ID
   * @param {string} context - The current context/location in the app
   * @returns {Array} - Tasks relevant to the context
   */
  async getTasksForContext(userId, context) {
    if (!userId || !context) {
      return [];
    }
    
    try {
      // Filter tasks by context
      const contextTasks = this.taskDefinitions.filter(task => 
        task.context.some(c => context.includes(c))
      );
      
      // Filter out tasks that the user has already completed
      const userCompletedTasks = this.getUserCompletedTasks(userId);
      const availableTasks = contextTasks.filter(task => 
        !userCompletedTasks.includes(task.id)
      );
      
      // Sort by priority
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      availableTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      return availableTasks;
    } catch (error) {
      console.error('Error getting tasks for context:', error);
      return [];
    }
  }
  
  /**
   * Get a user's completed tasks
   * @param {string} userId - The user's ID
   * @returns {Array} - IDs of completed tasks
   */
  getUserCompletedTasks(userId) {
    if (!userId) return [];
    
    try {
      // In a real app, this would be from local storage or API
      const completedTasks = localStorage.getItem(`${userId}_completed_tasks`);
      return completedTasks ? JSON.parse(completedTasks) : [];
    } catch (error) {
      console.error('Error getting completed tasks:', error);
      return [];
    }
  }
  
  /**
   * Get a user's progress on a specific task
   * @param {string} userId - The user's ID
   * @param {string} taskId - The task's ID
   * @returns {Object|null} - Task progress object or null
   */
  getTaskProgress(userId, taskId) {
    if (!userId || !taskId) return null;
    
    try {
      // In a real app, this would be from local storage or API
      const progressKey = `${userId}_task_${taskId}`;
      const progressData = localStorage.getItem(progressKey);
      return progressData ? JSON.parse(progressData) : null;
    } catch (error) {
      console.error('Error getting task progress:', error);
      return null;
    }
  }
  
  /**
   * Start a task for a user
   * @param {string} userId - The user's ID
   * @param {string} taskId - The task's ID
   * @returns {Object} - Initial task progress
   */
  startTask(userId, taskId) {
    if (!userId || !taskId) {
      throw new Error('User ID and Task ID are required');
    }
    
    const task = this.taskDefinitions.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const progress = {
      taskId,
      userId,
      currentStep: 0,
      completed: false,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      completedSteps: []
    };
    
    // Save to local storage (in a real app, this would be API)
    localStorage.setItem(`${userId}_task_${taskId}`, JSON.stringify(progress));
    
    return progress;
  }
  
  /**
   * Mark a step as completed
   * @param {string} userId - The user's ID
   * @param {string} taskId - The task's ID
   * @param {number} stepIndex - The index of the completed step
   * @returns {Object} - Updated task progress
   */
  completeStep(userId, taskId, stepIndex) {
    if (!userId || !taskId) {
      throw new Error('User ID and Task ID are required');
    }
    
    // Get current progress
    const progress = this.getTaskProgress(userId, taskId);
    if (!progress) {
      throw new Error(`No progress found for task ${taskId}`);
    }
    
    const task = this.taskDefinitions.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Mark step as completed
    if (!progress.completedSteps.includes(stepIndex)) {
      progress.completedSteps.push(stepIndex);
    }
    
    // Update current step
    if (stepIndex === progress.currentStep) {
      progress.currentStep = stepIndex + 1;
    }
    
    // Check if all steps are completed
    const totalSteps = task.steps.length;
    progress.completed = progress.currentStep >= totalSteps;
    progress.lastUpdated = new Date().toISOString();
    
    if (progress.completed) {
      progress.completedAt = new Date().toISOString();
      
      // Add to completed tasks
      const completedTasks = this.getUserCompletedTasks(userId);
      completedTasks.push(taskId);
      localStorage.setItem(`${userId}_completed_tasks`, JSON.stringify(completedTasks));
    }
    
    // Save updated progress
    localStorage.setItem(`${userId}_task_${taskId}`, JSON.stringify(progress));
    
    return progress;
  }
  
  /**
   * Abandon a task
   * @param {string} userId - The user's ID
   * @param {string} taskId - The task's ID
   * @param {string} reason - The reason for abandoning
   * @returns {boolean} - Success status
   */
  abandonTask(userId, taskId, reason = '') {
    if (!userId || !taskId) {
      throw new Error('User ID and Task ID are required');
    }
    
    try {
      // Record the abandonment
      const abandonData = {
        taskId,
        userId,
        abandonedAt: new Date().toISOString(),
        reason: reason || 'No reason provided',
        progress: this.getTaskProgress(userId, taskId)
      };
      
      // In a real app, send to analytics or API
      console.log('Task abandoned:', abandonData);
      
      // Remove from active tasks
      localStorage.removeItem(`${userId}_task_${taskId}`);
      
      return true;
    } catch (error) {
      console.error('Error abandoning task:', error);
      return false;
    }
  }
  
  /**
   * Submit feedback for a task
   * @param {string} userId - The user's ID
   * @param {string} taskId - The task's ID
   * @param {Object} feedbackData - The feedback data
   * @returns {boolean} - Success status
   */
  submitTaskFeedback(userId, taskId, feedbackData) {
    if (!userId || !taskId) {
      throw new Error('User ID and Task ID are required');
    }
    
    try {
      const feedback = {
        taskId,
        userId,
        submittedAt: new Date().toISOString(),
        ...feedbackData
      };
      
      // In a real app, send to API
      console.log('Task feedback submitted:', feedback);
      
      // Store feedback
      const feedbackKey = `${userId}_feedback_${taskId}`;
      localStorage.setItem(feedbackKey, JSON.stringify(feedback));
      
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }
  
  /**
   * Create a new task definition
   * @param {Object} taskData - The task definition data
   * @returns {Object} - The created task
   */
  createTask(taskData) {
    if (!taskData.id || !taskData.title || !taskData.steps) {
      throw new Error('Task must have an ID, title, and steps');
    }
    
    const newTask = {
      ...taskData,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };
    
    this.taskDefinitions.push(newTask);
    
    // In a real app, send to API
    console.log('New task created:', newTask);
    
    return newTask;
  }
  
  /**
   * Update a task definition
   * @param {string} taskId - The task's ID
   * @param {Object} taskData - The updated task data
   * @returns {Object} - The updated task
   */
  updateTask(taskId, taskData) {
    const taskIndex = this.taskDefinitions.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const updatedTask = {
      ...this.taskDefinitions[taskIndex],
      ...taskData,
      lastUpdated: new Date().toISOString(),
      version: (parseFloat(this.taskDefinitions[taskIndex].version) + 0.1).toFixed(1)
    };
    
    this.taskDefinitions[taskIndex] = updatedTask;
    
    // In a real app, send to API
    console.log('Task updated:', updatedTask);
    
    return updatedTask;
  }
  
  /**
   * Delete a task definition
   * @param {string} taskId - The task's ID
   * @returns {boolean} - Success status
   */
  deleteTask(taskId) {
    const taskIndex = this.taskDefinitions.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    this.taskDefinitions.splice(taskIndex, 1);
    
    // In a real app, send to API
    console.log('Task deleted:', taskId);
    
    return true;
  }

  /**
   * Fetch task prompts for a user based on their context
   * @param {string} userId - The user ID
   * @param {Object} context - The user's current application context
   * @returns {Promise<Array>} - List of task prompts
   */
  async getTaskPrompts(options = {}) {
    try {
      const response = await api.get('/beta-program/tasks', { params: options });
      return response.data;
    } catch (error) {
      console.error('Error fetching task prompts:', error);
      // Return mock data for development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTasks();
      }
      throw error;
    }
  }

  /**
   * Get a specific task prompt by ID
   * @param {string} taskId - The ID of the task to retrieve
   * @returns {Promise<Object>} - Task prompt details
   */
  async getTaskPromptById(taskId) {
    try {
      const response = await api.get(`/beta-program/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task prompt ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a task as complete for a user
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID to mark as complete
   * @returns {Promise<Object>} - Updated task data
   */
  async completeTask(userId, taskId) {
    try {
      const response = await api.post(`/beta-program/users/${userId}/tasks/${taskId}/complete`);
      return response.data;
    } catch (error) {
      console.error(`Error completing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a specific step in a task as complete
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @param {number} stepIndex - The index of the step to mark as complete
   * @returns {Promise<Object>} - Updated task data
   */
  async completeTaskStep(userId, taskId, stepIndex) {
    try {
      const response = await api.post(
        `/beta-program/users/${userId}/tasks/${taskId}/steps/${stepIndex}/complete`
      );
      return response.data;
    } catch (error) {
      console.error(`Error completing step ${stepIndex} for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Dismiss a task for a user
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID to dismiss
   * @returns {Promise<Object>} - Updated task data
   */
  async dismissTask(userId, taskId) {
    try {
      const response = await api.post(`/beta-program/users/${userId}/tasks/${taskId}/dismiss`);
      return response.data;
    } catch (error) {
      console.error(`Error dismissing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Submit feedback for a completed task
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @param {Object} feedbackData - The feedback data
   * @param {number} feedbackData.rating - User rating (1-5)
   * @param {string} feedbackData.comments - User comments
   * @param {Object} feedbackData.metadata - Additional metadata about the feedback
   * @returns {Promise<Object>} - Confirmation of feedback submission
   */
  async submitTaskFeedback(userId, taskId, feedbackData) {
    try {
      const response = await api.post(
        `/beta-program/users/${userId}/tasks/${taskId}/feedback`,
        feedbackData
      );
      return response.data;
    } catch (error) {
      console.error(`Error submitting feedback for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new task prompt (admin only)
   * @param {Object} taskData - The task data
   * @returns {Promise<Object>} - Created task data
   */
  async createTaskPrompt(taskData) {
    try {
      const response = await api.post('/beta-program/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task prompt:', error);
      throw error;
    }
  }

  /**
   * Update an existing task prompt (admin only)
   * @param {string} taskId - The task ID to update
   * @param {Object} taskData - The updated task data
   * @returns {Promise<Object>} - Updated task data
   */
  async updateTaskPrompt(taskId, taskData) {
    try {
      const response = await api.put(`/beta-program/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task prompt ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a task prompt (admin only)
   * @param {string} taskId - The task ID to delete
   * @returns {Promise<Object>} - Confirmation of deletion
   */
  async deleteTaskPrompt(taskId) {
    try {
      const response = await api.delete(`/beta-program/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting task prompt ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get analytics for task completion rates
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} - Task analytics data
   */
  async getTaskAnalytics(options = {}) {
    try {
      const response = await api.get('/beta-program/tasks/analytics', { params: options });
      return response.data;
    } catch (error) {
      console.error('Error fetching task analytics:', error);
      throw error;
    }
  }

  /**
   * Get mock tasks for development and testing
   * @returns {Array} - Array of mock task prompts
   */
  getMockTasks() {
    return [
      {
        id: 'task-1',
        title: 'Test the tour planning feature',
        description: 'Walk through creating a new tour and test the planning features',
        priority: 'high',
        category: 'core-features',
        completed: false,
        dismissed: false,
        steps: [
          {
            title: 'Create a new tour',
            description: 'Click on the "New Tour" button on the dashboard',
            completed: false
          },
          {
            title: 'Add three destinations',
            description: 'Add at least three destinations to your tour using the search function',
            completed: false
          },
          {
            title: 'Rearrange the destinations',
            description: 'Drag and drop the destinations to change their order',
            completed: false
          },
          {
            title: 'Save the tour',
            description: 'Click the "Save Tour" button to save your progress',
            completed: false
          }
        ]
      },
      {
        id: 'task-2',
        title: 'Explore the AI recommendations feature',
        description: 'Test the AI-powered attraction recommendations and provide feedback',
        priority: 'medium',
        category: 'ai-features',
        completed: false,
        dismissed: false,
        steps: [
          {
            title: 'Open an existing tour',
            description: 'Open any tour from your saved tours list',
            completed: false
          },
          {
            title: 'Navigate to recommendations',
            description: 'Click on the "Get Recommendations" button',
            completed: false
          },
          {
            title: 'Apply filters',
            description: 'Try filtering recommendations by at least two categories',
            completed: false
          },
          {
            title: 'Add a recommendation',
            description: 'Add at least one recommended attraction to your tour',
            completed: false
          }
        ]
      },
      {
        id: 'task-3',
        title: 'Test the feedback submission form',
        description: 'Complete and submit the feedback form with your thoughts on the application',
        priority: 'low',
        category: 'feedback',
        completed: false,
        dismissed: false,
        steps: [
          {
            title: 'Navigate to feedback',
            description: 'Click on the "Feedback" button in the profile menu',
            completed: false
          },
          {
            title: 'Complete all fields',
            description: 'Fill out all required fields in the feedback form',
            completed: false
          },
          {
            title: 'Add a screenshot',
            description: 'Attach a screenshot using the upload button (optional)',
            completed: false
          },
          {
            title: 'Submit the form',
            description: 'Submit the completed feedback form',
            completed: false
          }
        ]
      },
      {
        id: 'task-4',
        title: 'Evaluate the mobile responsiveness',
        description: 'Test the application on a mobile device or using browser responsive mode',
        priority: 'high',
        category: 'ux-testing',
        completed: false,
        dismissed: false,
        steps: [
          {
            title: 'Access on mobile',
            description: 'Open the application on a mobile device or resize your browser window',
            completed: false
          },
          {
            title: 'Test navigation menu',
            description: 'Try opening and using the navigation menu on mobile',
            completed: false
          },
          {
            title: 'Create a simple tour',
            description: 'Create a tour with two destinations',
            completed: false
          },
          {
            title: 'Test interactive elements',
            description: 'Verify that buttons and interactive elements are usable on small screens',
            completed: false
          }
        ]
      },
      {
        id: 'task-5',
        title: 'Explore the itinerary sharing options',
        description: 'Test the functionality for sharing itineraries with others',
        priority: 'medium',
        category: 'sharing',
        completed: false,
        dismissed: false,
        steps: [
          {
            title: 'Open sharing menu',
            description: 'Open any tour and click the "Share" button',
            completed: false
          },
          {
            title: 'Generate a share link',
            description: 'Click on "Create share link" and copy the URL',
            completed: false
          },
          {
            title: 'Test email sharing',
            description: 'Enter an email address and send a test share (use your own email)',
            completed: false
          },
          {
            title: 'Preview shared view',
            description: 'Click "Preview shared view" to see how others will view your shared tour',
            completed: false
          }
        ]
      }
    ];
  }

  /**
   * Fetch task details by task ID
   * @param {string} taskId - ID of the task prompt
   * @returns {Promise<Object>} - Task prompt data
   */
  static async getTaskById(taskId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/task-prompts/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task prompt ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch task details by context ID (page/feature)
   * @param {string} contextId - Context ID where the task should appear
   * @returns {Promise<Object>} - Task prompt data for the context
   */
  static async getTaskByContext(contextId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/task-prompts/context/${contextId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task prompt for context ${contextId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a task step as completed
   * @param {string} taskId - ID of the task prompt
   * @param {string} stepId - ID of the step to mark as completed
   * @returns {Promise<Object>} - Updated task data
   */
  static async completeStep(taskId, stepId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts/${taskId}/steps/${stepId}/complete`);
      return response.data;
    } catch (error) {
      console.error(`Error completing task step ${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Mark an entire task as completed
   * @param {string} taskId - ID of the task prompt to complete
   * @returns {Promise<Object>} - Completed task data
   */
  static async completeTask(taskId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts/${taskId}/complete`);
      return response.data;
    } catch (error) {
      console.error(`Error completing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Dismiss a task prompt (user chooses not to do it)
   * @param {string} taskId - ID of the task prompt to dismiss
   * @param {Object} feedback - Optional feedback about why it was dismissed
   * @returns {Promise<Object>} - Response data
   */
  static async dismissTask(taskId, feedback = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts/${taskId}/dismiss`, feedback);
      return response.data;
    } catch (error) {
      console.error(`Error dismissing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Submit feedback about a task
   * @param {string} taskId - ID of the task prompt
   * @param {Object} feedback - Feedback data (rating, comments, etc)
   * @returns {Promise<Object>} - Response data
   */
  static async submitFeedback(taskId, feedback) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts/${taskId}/feedback`, feedback);
      return response.data;
    } catch (error) {
      console.error(`Error submitting feedback for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all available tasks for the current user
   * @param {Object} filters - Optional filters (status, category)
   * @returns {Promise<Array>} - List of available tasks
   */
  static async getAllTasks(filters = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/task-prompts`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      throw error;
    }
  }

  /**
   * Reset a task to start over
   * @param {string} taskId - ID of the task prompt to reset
   * @returns {Promise<Object>} - Reset task data
   */
  static async resetTask(taskId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts/${taskId}/reset`);
      return response.data;
    } catch (error) {
      console.error(`Error resetting task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get task completion statistics
   * @returns {Promise<Object>} - Task completion statistics
   */
  static async getTaskStatistics() {
    try {
      const response = await axios.get(`${API_BASE_URL}/task-prompts/statistics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      throw error;
    }
  }

  /**
   * Create a custom task (admin only)
   * @param {Object} taskData - Task data to create
   * @returns {Promise<Object>} - Created task data
   */
  static async createTask(taskData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/task-prompts`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task (admin only)
   * @param {string} taskId - ID of the task to update
   * @param {Object} taskData - Updated task data
   * @returns {Promise<Object>} - Updated task data
   */
  static async updateTask(taskId, taskData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/task-prompts/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a task (admin only)
   * @param {string} taskId - ID of the task to delete
   * @returns {Promise<Object>} - Response data
   */
  static async deleteTask(taskId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/task-prompts/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const taskPromptService = new TaskPromptService();
export default taskPromptService; 