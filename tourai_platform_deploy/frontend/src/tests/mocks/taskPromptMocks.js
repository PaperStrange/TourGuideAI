/**
 * Task Prompt System Mock Data
 * Contains realistic mock data for task prompt system tests
 */

// Mock task definitions
export const tasksMocks = [
  {
    id: 'task-123',
    title: 'Discover Popular Attractions',
    description: 'Follow the steps to find the most popular attractions in your destination',
    tags: ['beginner', 'discovery', 'attractions'],
    priority: 'high',
    estimatedTime: 5, // minutes
    steps: [
      {
        id: 'step-1',
        title: 'Open Attractions Page',
        instruction: 'Click on the "Attractions" tab in the main navigation menu',
        completionCriteria: 'page_load:/attractions',
        hint: 'The Attractions tab is usually at the top of the page'
      },
      {
        id: 'step-2',
        title: 'Filter by Popularity',
        instruction: 'Use the filter dropdown to select "Most Popular"',
        completionCriteria: 'click:#popularity-filter option[value="popular"]',
        hint: 'Look for a dropdown menu labeled "Sort by" or "Filter"'
      },
      {
        id: 'step-3',
        title: 'Browse Top Attractions',
        instruction: 'Scroll through the list to see the most popular attractions',
        completionCriteria: 'scroll:500',
        hint: 'Use your mouse wheel or trackpad to scroll down the page'
      },
      {
        id: 'step-4',
        title: 'Select an Attraction',
        instruction: 'Click on an attraction card to see more details',
        completionCriteria: 'click:.attraction-card',
        hint: 'Each attraction is displayed as a card with an image and title'
      }
    ],
    completionMessage: 'Great job! You\'ve discovered the most popular attractions. Would you like to save any to your itinerary?'
  },
  {
    id: 'task-456',
    title: 'Book a Tour Guide',
    description: 'Follow the steps to book a professional tour guide for your trip',
    tags: ['intermediate', 'booking', 'guide'],
    priority: 'medium',
    estimatedTime: 10, // minutes
    steps: [
      {
        id: 'step-1',
        title: 'Go to Tour Guides',
        instruction: 'Navigate to the "Tour Guides" section from the main menu',
        completionCriteria: 'page_load:/tour-guides',
        hint: 'Look for "Tour Guides" in the main navigation or under "Services"'
      },
      {
        id: 'step-2',
        title: 'Set Preferences',
        instruction: 'Fill out the preference form with your desired date, language, and group size',
        completionCriteria: 'form_filled:#guide-preferences-form',
        hint: 'All fields with an asterisk (*) are required'
      },
      {
        id: 'step-3',
        title: 'Browse Available Guides',
        instruction: 'Review the list of available guides matching your criteria',
        completionCriteria: 'scroll:300',
        hint: 'You can hover over each guide to see more information'
      },
      {
        id: 'step-4',
        title: 'Select a Guide',
        instruction: 'Click on a guide to view their full profile and availability',
        completionCriteria: 'click:.guide-card',
        hint: 'Look for guides with good ratings and availability on your preferred dates'
      },
      {
        id: 'step-5',
        title: 'Book the Guide',
        instruction: 'Click the "Book Now" button and complete the booking form',
        completionCriteria: 'click:#book-guide-btn',
        hint: 'You\'ll need to provide contact and payment information to complete your booking'
      }
    ],
    completionMessage: "Congratulations! You've successfully booked a tour guide. Check your email for confirmation details."
  }
];

// Mock task state
export const taskStateMocks = {
  activeTaskId: 'task-123',
  completedTasks: ['task-789'],
  taskProgress: {
    'task-123': {
      currentStepIndex: 2,
      startTime: new Date('2023-04-15T10:30:00Z').getTime(),
      stepCompletionTimes: {
        'step-1': new Date('2023-04-15T10:31:15Z').getTime(),
        'step-2': new Date('2023-04-15T10:32:45Z').getTime()
      }
    },
    'task-456': {
      currentStepIndex: 0,
      startTime: null,
      stepCompletionTimes: {}
    }
  }
};

// Mock user interactions for task prompts
export const taskInteractionsMocks = [
  {
    taskId: 'task-123',
    stepId: 'step-1',
    timestamp: new Date('2023-04-15T10:30:30Z').getTime(),
    action: 'prompt_shown',
    data: {
      timeShown: 5000 // ms
    }
  },
  {
    taskId: 'task-123',
    stepId: 'step-1',
    timestamp: new Date('2023-04-15T10:31:00Z').getTime(),
    action: 'hint_requested',
    data: {
      hintIndex: 0
    }
  },
  {
    taskId: 'task-123',
    stepId: 'step-1',
    timestamp: new Date('2023-04-15T10:31:15Z').getTime(),
    action: 'step_completed',
    data: {
      timeToComplete: 45000 // ms
    }
  },
  {
    taskId: 'task-123',
    stepId: 'step-2',
    timestamp: new Date('2023-04-15T10:31:30Z').getTime(),
    action: 'prompt_shown',
    data: {
      timeShown: 4500 // ms
    }
  },
  {
    taskId: 'task-123',
    stepId: 'step-2',
    timestamp: new Date('2023-04-15T10:32:45Z').getTime(),
    action: 'step_completed',
    data: {
      timeToComplete: 75000 // ms
    }
  }
];

// Mock session recording integration data
export const taskSessionMocks = {
  recordingId: 'rec-task-12345',
  taskId: 'task-123',
  startTime: new Date('2023-04-15T10:30:00Z').getTime(),
  endTime: new Date('2023-04-15T10:35:00Z').getTime(),
  events: [
    {
      type: 'task_step_started',
      timestamp: new Date('2023-04-15T10:30:00Z').getTime(),
      data: {
        taskId: 'task-123',
        stepId: 'step-1'
      }
    },
    {
      type: 'click',
      timestamp: new Date('2023-04-15T10:30:45Z').getTime(),
      target: '.navigation-menu .attractions-tab',
      position: { x: 250, y: 50 }
    },
    {
      type: 'page_load',
      timestamp: new Date('2023-04-15T10:31:15Z').getTime(),
      url: '/attractions'
    },
    {
      type: 'task_step_completed',
      timestamp: new Date('2023-04-15T10:31:15Z').getTime(),
      data: {
        taskId: 'task-123',
        stepId: 'step-1'
      }
    },
    {
      type: 'task_step_started',
      timestamp: new Date('2023-04-15T10:31:30Z').getTime(),
      data: {
        taskId: 'task-123',
        stepId: 'step-2'
      }
    },
    {
      type: 'click',
      timestamp: new Date('2023-04-15T10:32:15Z').getTime(),
      target: '#popularity-filter',
      position: { x: 500, y: 150 }
    },
    {
      type: 'click',
      timestamp: new Date('2023-04-15T10:32:30Z').getTime(),
      target: '#popularity-filter option[value="popular"]',
      position: { x: 520, y: 180 }
    },
    {
      type: 'task_step_completed',
      timestamp: new Date('2023-04-15T10:32:45Z').getTime(),
      data: {
        taskId: 'task-123',
        stepId: 'step-2'
      }
    }
  ]
}; 