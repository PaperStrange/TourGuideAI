import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TravelPlanningWorkflow } from '../../features/travel-planning/components/TravelPlanningWorkflow';
import { routeGenerationService, routeManagementService } from '../../features/travel-planning/services';
import { AuthContext } from '../../contexts/AuthContext';
import { NotificationContext } from '../../contexts/NotificationContext';

// Mock the services
jest.mock('../../features/travel-planning/services', () => ({
  routeGenerationService: {
    analyzeUserQuery: jest.fn(),
    generateRouteFromQuery: jest.fn(),
    generateRandomRoute: jest.fn()
  },
  routeManagementService: {
    saveRoute: jest.fn(),
    updateRoute: jest.fn(),
    getFavoriteRoutes: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn()
  }
}));

// Mock any third-party components we aren't testing
jest.mock('../../components/Map/MapComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="map-component">Map Component</div>
}));

describe('Travel Planning Workflow Integration', () => {
  // Sample test data
  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com'
  };
  
  const mockRoute = {
    id: 'route_123',
    route_name: 'Paris Family Adventure',
    destination: 'Paris, France',
    duration: '3',
    overview: 'A wonderful trip to Paris',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre Dame Cathedral'],
    daily_itinerary: [
      {
        day_title: 'Exploring Iconic Landmarks',
        description: 'Visit the most famous sites in Paris',
        day_number: 1,
        activities: [
          { id: 'act1', name: 'Eiffel Tower', description: 'Visit early to avoid crowds', time: '9:00 AM' },
          { id: 'act2', name: 'Louvre Museum', description: 'Home to the Mona Lisa', time: '2:00 PM' }
        ]
      }
    ]
  };
  
  const mockIntent = {
    arrival: 'Paris, France',
    departure: null,
    arrival_date: null,
    departure_date: null,
    travel_duration: '3 days',
    entertainment_prefer: 'family-friendly',
    transportation_prefer: null,
    accommodation_prefer: null,
    total_cost_prefer: null,
    user_personal_need: 'family'
  };
  
  // Setup notification context mock
  const showNotification = jest.fn();
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful service responses
    routeGenerationService.analyzeUserQuery.mockResolvedValue(mockIntent);
    routeGenerationService.generateRouteFromQuery.mockResolvedValue(mockRoute);
    routeManagementService.saveRoute.mockResolvedValue({ ...mockRoute, id: 'saved_route_123' });
    routeManagementService.updateRoute.mockResolvedValue({ success: true });
    routeManagementService.getFavoriteRoutes.mockResolvedValue([]);
  });
  
  const renderWithContext = (component) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <NotificationContext.Provider value={{ showNotification }}>
          {component}
        </NotificationContext.Provider>
      </AuthContext.Provider>
    );
  };
  
  test('complete travel planning flow from query to route saving', async () => {
    renderWithContext(<TravelPlanningWorkflow />);
    
    // Step 1: User enters a travel query
    const queryInput = screen.getByPlaceholderText(/Describe your travel plans/i);
    userEvent.type(queryInput, 'I want to visit Paris for 3 days with my family');
    
    // Step 2: User clicks on the analyze button
    const analyzeButton = screen.getByText(/Analyze Query/i);
    userEvent.click(analyzeButton);
    
    // Verify intent analysis is displayed
    await waitFor(() => {
      expect(routeGenerationService.analyzeUserQuery).toHaveBeenCalledWith(
        'I want to visit Paris for 3 days with my family'
      );
      expect(screen.getByText(/Travel Intent Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Paris, France/i)).toBeInTheDocument();
      expect(screen.getByText(/3 days/i)).toBeInTheDocument();
    });
    
    // Step 3: User clicks on the generate route button
    const generateButton = screen.getByText(/Generate Route/i);
    userEvent.click(generateButton);
    
    // Verify route generation is called
    await waitFor(() => {
      expect(routeGenerationService.generateRouteFromQuery).toHaveBeenCalledWith(
        'I want to visit Paris for 3 days with my family'
      );
    });
    
    // Step 4: Route preview is displayed
    await waitFor(() => {
      expect(screen.getByText('Paris Family Adventure')).toBeInTheDocument();
      expect(screen.getByText(/Eiffel Tower/i)).toBeInTheDocument();
    });
    
    // Step 5: User clicks to save the route
    const saveButton = screen.getByText(/Save Route/i);
    userEvent.click(saveButton);
    
    // Verify route is saved
    await waitFor(() => {
      expect(routeManagementService.saveRoute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'route_123' }),
        mockUser.id
      );
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('saved'),
          type: 'success'
        })
      );
    });
    
    // Step 6: User sees edit button and clicks it
    const editButton = screen.getByText(/Edit Itinerary/i);
    userEvent.click(editButton);
    
    // Verify transition to itinerary builder
    await waitFor(() => {
      expect(screen.getByText(/Edit Your Itinerary/i)).toBeInTheDocument();
    });
    
    // Step 7: User edits the route title
    const editTitleButton = screen.getByLabelText(/edit title/i);
    userEvent.click(editTitleButton);
    
    const titleInput = screen.getByDisplayValue('Paris Family Adventure');
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Paris Family Vacation');
    
    const saveTitleButton = screen.getByText(/Save/i);
    userEvent.click(saveTitleButton);
    
    // Verify route is updated
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'saved_route_123',
        expect.objectContaining({
          route_name: 'Paris Family Vacation'
        })
      );
    });
    
    // Step 8: User adds a new activity
    const addActivityButton = screen.getByText(/Add Activity/i);
    userEvent.click(addActivityButton);
    
    const activityNameInput = screen.getByLabelText(/Activity name/i);
    userEvent.type(activityNameInput, 'Seine River Cruise');
    
    const activityDescInput = screen.getByLabelText(/Activity description/i);
    userEvent.type(activityDescInput, 'Evening cruise on the Seine');
    
    const activityTimeInput = screen.getByLabelText(/Activity time/i);
    userEvent.type(activityTimeInput, '7:00 PM');
    
    const saveActivityButton = screen.getByText(/Save Activity/i);
    userEvent.click(saveActivityButton);
    
    // Verify new activity is saved
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'saved_route_123',
        expect.objectContaining({
          daily_itinerary: expect.arrayContaining([
            expect.objectContaining({
              activities: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Seine River Cruise',
                  description: 'Evening cruise on the Seine',
                  time: '7:00 PM'
                })
              ])
            })
          ])
        })
      );
    });
    
    // Step 9: User returns to route preview
    const backToPreviewButton = screen.getByText(/Back to Preview/i);
    userEvent.click(backToPreviewButton);
    
    // Verify return to preview
    await waitFor(() => {
      expect(screen.getByText(/Paris Family Vacation/i)).toBeInTheDocument();
    });
    
    // Step 10: User adds route to favorites
    const favoriteButton = screen.getByText(/Add to Favorites/i);
    userEvent.click(favoriteButton);
    
    // Verify favorite is added
    await waitFor(() => {
      expect(routeManagementService.addToFavorites).toHaveBeenCalledWith(
        'saved_route_123',
        mockUser.id
      );
    });
  });
  
  test('should handle errors during route generation', async () => {
    // Mock an error response
    routeGenerationService.generateRouteFromQuery.mockRejectedValueOnce(
      new Error('Unable to generate route')
    );
    
    renderWithContext(<TravelPlanningWorkflow />);
    
    // Enter query and try to generate route
    const queryInput = screen.getByPlaceholderText(/Describe your travel plans/i);
    userEvent.type(queryInput, 'I want to visit Paris');
    
    const generateButton = screen.getByText(/Generate Route/i);
    userEvent.click(generateButton);
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/Unable to generate route/i)).toBeInTheDocument();
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('error'),
          type: 'error'
        })
      );
    });
  });
  
  test('unauthenticated users should be prompted to sign in when saving routes', async () => {
    // Render with unauthenticated context
    render(
      <AuthContext.Provider value={{ user: null, isAuthenticated: false }}>
        <NotificationContext.Provider value={{ showNotification }}>
          <TravelPlanningWorkflow />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    );
    
    // Set up the route generation
    routeGenerationService.generateRouteFromQuery.mockResolvedValueOnce(mockRoute);
    
    // User generates a route
    const queryInput = screen.getByPlaceholderText(/Describe your travel plans/i);
    userEvent.type(queryInput, 'I want to visit Paris');
    
    const generateButton = screen.getByText(/Generate Route/i);
    userEvent.click(generateButton);
    
    // Wait for route to be generated
    await waitFor(() => {
      expect(screen.getByText('Paris Family Adventure')).toBeInTheDocument();
    });
    
    // User tries to save the route
    const saveButton = screen.getByText(/Save Route/i);
    userEvent.click(saveButton);
    
    // Verify they are prompted to sign in
    await waitFor(() => {
      expect(screen.getByText(/Please sign in to save routes/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    });
    
    // Verify save was not attempted
    expect(routeManagementService.saveRoute).not.toHaveBeenCalled();
  });
}); 