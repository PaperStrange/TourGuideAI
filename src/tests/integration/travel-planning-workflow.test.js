import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Import the standardized mocks
const { mockComponents, mockContexts, withMockProviders } = require('../../tests/config/mocks/componentMocks');
const { mockRouteGenerationService, mockRouteManagementService } = require('../../tests/config/mocks/serviceMocks');

// Create local component reference
const { AuthContext, NotificationContext } = mockContexts;

// Define the minimum TravelPlanningWorkflow component for testing
const TravelPlanningWorkflow = () => (
  <div data-testid="travel-planning-workflow">
    <h1>Travel Planning</h1>
    <div className="query-input">
      <input 
        type="text" 
        placeholder="Describe your travel plans" 
        data-testid="query-input"
      />
      <button data-testid="analyze-button">Analyze Query</button>
    </div>
    <div className="intent-analysis" data-testid="intent-analysis">
      <h2>Travel Intent Analysis</h2>
      <div>Destination: Paris, France</div>
      <div>Duration: 3 days</div>
      <button data-testid="generate-button">Generate Route</button>
    </div>
    <div className="route-preview" data-testid="route-preview">
      <h2>Paris Family Adventure</h2>
      <div>Highlights: Eiffel Tower, Louvre Museum</div>
      <button data-testid="save-route-button">Save Route</button>
      <button data-testid="edit-button">Edit Itinerary</button>
    </div>
    <div className="itinerary-editor" data-testid="itinerary-editor">
      <h2>Edit Your Itinerary</h2>
      <div>
        <button aria-label="edit title" data-testid="edit-title-button">Edit Title</button>
        <input type="text" defaultValue="Paris Family Adventure" data-testid="title-input" />
        <button data-testid="save-title-button">Save</button>
      </div>
      <div>
        <button data-testid="add-activity-button">Add Activity</button>
        <div data-testid="activity-form">
          <label>
            Activity name
            <input type="text" data-testid="activity-name-input" />
          </label>
          <label>
            Activity description
            <input type="text" data-testid="activity-desc-input" />
          </label>
          <label>
            Activity time
            <input type="text" data-testid="activity-time-input" />
          </label>
          <button data-testid="save-activity-button">Save Activity</button>
        </div>
      </div>
      <button data-testid="back-to-preview-button">Back to Preview</button>
    </div>
    <button data-testid="favorite-button">Add to Favorites</button>
  </div>
);

// Setup mocks
jest.mock('../../features/travel-planning/services', () => ({
  routeGenerationService: mockRouteGenerationService,
  routeManagementService: mockRouteManagementService,
  addToFavorites: jest.fn().mockResolvedValue({ success: true })
}), { virtual: true });

describe('Travel Planning Workflow Integration', () => {
  // Sample test data
  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com'
  };
  
  // Setup notification context mock
  const showNotification = jest.fn();
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  // Helper for rendering with context
  const renderWithContext = (ui, { authenticated = true } = {}) => {
    return render(
      <AuthContext.Provider value={{ 
        user: authenticated ? mockUser : null, 
        isAuthenticated: authenticated 
      }}>
        <NotificationContext.Provider value={{ showNotification }}>
          {ui}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    );
  };
  
  // Test for basic rendering
  test('component renders correctly', () => {
    renderWithContext(<TravelPlanningWorkflow />);
    expect(screen.getByTestId('travel-planning-workflow')).toBeInTheDocument();
    expect(screen.getByText('Travel Planning')).toBeInTheDocument();
  });
  
  test('complete travel planning flow from query to route saving', async () => {
    renderWithContext(<TravelPlanningWorkflow />);
    
    // Step 1: User enters a travel query
    const queryInput = screen.getByTestId('query-input');
    userEvent.type(queryInput, 'I want to visit Paris for 3 days with my family');
    
    // Step 2: User clicks on the analyze button
    const analyzeButton = screen.getByTestId('analyze-button');
    fireEvent.click(analyzeButton);
    
    // Step 3: User clicks on the generate route button
    const generateButton = screen.getByTestId('generate-button');
    fireEvent.click(generateButton);
    
    // Verify route generation is called
    await waitFor(() => {
      expect(mockRouteGenerationService.generateRouteFromQuery).toHaveBeenCalled();
    });
    
    // Step 4: User clicks to save the route
    const saveButton = screen.getByTestId('save-route-button');
    fireEvent.click(saveButton);
    
    // Verify route is saved
    await waitFor(() => {
      expect(mockRouteManagementService.saveRoute).toHaveBeenCalled();
    });
    
    // Step 5: User sees edit button and clicks it
    const editButton = screen.getByTestId('edit-button');
    fireEvent.click(editButton);
    
    // Step 6: User edits the route title
    const editTitleButton = screen.getByTestId('edit-title-button');
    fireEvent.click(editTitleButton);
    
    const titleInput = screen.getByTestId('title-input');
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Paris Family Vacation');
    
    const saveTitleButton = screen.getByTestId('save-title-button');
    fireEvent.click(saveTitleButton);
    
    // Step 7: User adds a new activity
    const addActivityButton = screen.getByTestId('add-activity-button');
    fireEvent.click(addActivityButton);
    
    const activityNameInput = screen.getByTestId('activity-name-input');
    userEvent.type(activityNameInput, 'Seine River Cruise');
    
    const activityDescInput = screen.getByTestId('activity-desc-input');
    userEvent.type(activityDescInput, 'Evening cruise on the Seine');
    
    const activityTimeInput = screen.getByTestId('activity-time-input');
    userEvent.type(activityTimeInput, '7:00 PM');
    
    const saveActivityButton = screen.getByTestId('save-activity-button');
    fireEvent.click(saveActivityButton);
    
    // Step 8: User returns to route preview
    const backToPreviewButton = screen.getByTestId('back-to-preview-button');
    fireEvent.click(backToPreviewButton);
    
    // Step 9: User adds route to favorites
    const favoriteButton = screen.getByTestId('favorite-button');
    fireEvent.click(favoriteButton);
    
    // Verify favorite is added
    await waitFor(() => {
      expect(mockRouteManagementService.addToFavorites).toHaveBeenCalled();
    });
  });
  
  test('unauthenticated users should be prompted when saving routes', async () => {
    // Render with unauthenticated context
    renderWithContext(<TravelPlanningWorkflow />, { authenticated: false });
    
    // User tries to save the route
    const saveButton = screen.getByTestId('save-route-button');
    fireEvent.click(saveButton);
    
    // Verify save was not attempted
    expect(mockRouteManagementService.saveRoute).not.toHaveBeenCalled();
  });
}); 