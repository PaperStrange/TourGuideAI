import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ItineraryBuilder } from '../../../features/travel-planning/components';
import { routeManagementService } from '../../../features/travel-planning/services';

// Mock the route management service
jest.mock('../../../features/travel-planning/services', () => ({
  routeManagementService: {
    updateRoute: jest.fn(),
    getRouteById: jest.fn()
  }
}));

describe('ItineraryBuilder Component', () => {
  const mockRoute = {
    id: 'route_123',
    route_name: 'Parisian Adventure',
    destination: 'Paris',
    duration: '3',
    start_date: '2023-06-15',
    end_date: '2023-06-18',
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
      },
      {
        day_title: 'Cultural Immersion',
        description: 'Experience Parisian culture',
        day_number: 2,
        activities: [
          { id: 'act3', name: 'Montmartre Walk', description: 'Explore artist district', time: '10:00 AM' },
          { id: 'act4', name: 'Seine River Cruise', description: 'See Paris from the water', time: '4:00 PM' }
        ]
      }
    ],
    estimated_costs: {
      'Accommodations': '$450',
      'Transportation': '$200',
      'Food': '$300',
      'Activities': '$150',
      'Total': '$1100'
    }
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock implementations
    routeManagementService.getRouteById.mockResolvedValue(mockRoute);
    routeManagementService.updateRoute.mockResolvedValue({ success: true });
  });

  it('renders loading state while fetching route data', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    expect(screen.getByText(/Loading itinerary/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(routeManagementService.getRouteById).toHaveBeenCalledWith('route_123');
    });
  });

  it('loads and displays route data correctly', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Parisian Adventure')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('3 days')).toBeInTheDocument();
    });
    
    // Verify itinerary days are displayed
    expect(screen.getByText((content, element) => 
      content.includes('Exploring Iconic Landmarks')
    )).toBeInTheDocument();
    expect(screen.getByText('Cultural Immersion')).toBeInTheDocument();
  });

  it('allows editing of route title', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Parisian Adventure')).toBeInTheDocument();
    });
    
    // Click edit button for title
    const editTitleButton = screen.getByLabelText(/edit title/i);
    userEvent.click(editTitleButton);
    
    // Change the title
    const titleInput = screen.getByDisplayValue('Parisian Adventure');
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'Magnificent Paris');
    
    // Submit the form
    const saveButton = screen.getByText(/save/i);
    userEvent.click(saveButton);
    
    // Check that update service was called with the correct data
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          route_name: 'Magnificent Paris'
        })
      );
    });
  });

  it('allows editing of activity details', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    });
    
    // Click edit button for an activity
    const editActivityButton = screen.getAllByLabelText(/edit activity/i)[0];
    userEvent.click(editActivityButton);
    
    // Modify the activity
    const activityNameInput = screen.getByDisplayValue('Eiffel Tower');
    userEvent.clear(activityNameInput);
    userEvent.type(activityNameInput, 'Eiffel Tower Visit');
    
    const activityDescInput = screen.getByDisplayValue('Visit early to avoid crowds');
    userEvent.clear(activityDescInput);
    userEvent.type(activityDescInput, 'Best visited early morning to avoid long queues');
    
    // Save the changes
    const saveActivityButton = screen.getByText(/save changes/i);
    userEvent.click(saveActivityButton);
    
    // Check that update service was called with the correct data
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          daily_itinerary: expect.arrayContaining([
            expect.objectContaining({
              activities: expect.arrayContaining([
                expect.objectContaining({
                  id: 'act1',
                  name: 'Eiffel Tower Visit',
                  description: 'Best visited early morning to avoid long queues'
                })
              ])
            })
          ])
        })
      );
    });
  });

  it('allows adding a new activity to a day', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText((content, element) => 
        content.includes('Exploring Iconic Landmarks')
      )).toBeInTheDocument();
    });
    
    // Find the add activity button for the first day
    const addActivityButton = screen.getAllByText(/add activity/i)[0];
    userEvent.click(addActivityButton);
    
    // Fill out the new activity form
    const activityNameInput = screen.getByLabelText(/activity name/i);
    userEvent.type(activityNameInput, 'Café Break');
    
    const activityDescInput = screen.getByLabelText(/activity description/i);
    userEvent.type(activityDescInput, 'Enjoy coffee at a local café');
    
    const activityTimeInput = screen.getByLabelText(/activity time/i);
    userEvent.type(activityTimeInput, '12:00 PM');
    
    // Save the new activity
    const saveButton = screen.getByText(/save activity/i);
    userEvent.click(saveButton);
    
    // Check that update service was called with the correct data
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          daily_itinerary: expect.arrayContaining([
            expect.objectContaining({
              day_number: 1,
              activities: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Café Break',
                  description: 'Enjoy coffee at a local café',
                  time: '12:00 PM'
                })
              ])
            })
          ])
        })
      );
    });
  });

  it('allows removing an activity from a day', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    });
    
    // Click delete button for the first activity
    const deleteActivityButton = screen.getAllByLabelText(/delete activity/i)[0];
    userEvent.click(deleteActivityButton);
    
    // Confirm deletion
    const confirmButton = screen.getByText(/confirm delete/i);
    userEvent.click(confirmButton);
    
    // Check that update service was called with the first activity removed
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          daily_itinerary: expect.arrayContaining([
            expect.objectContaining({
              day_number: 1,
              activities: expect.not.arrayContaining([
                expect.objectContaining({
                  id: 'act1'
                })
              ])
            })
          ])
        })
      );
    });
  });

  it('allows adding a new day to the itinerary', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Cultural Immersion')).toBeInTheDocument();
    });
    
    // Click the add day button
    const addDayButton = screen.getByText(/add day/i);
    userEvent.click(addDayButton);
    
    // Fill out the day form
    const dayTitleInput = screen.getByLabelText(/day title/i);
    userEvent.type(dayTitleInput, 'Departure Day');
    
    const dayDescInput = screen.getByLabelText(/day description/i);
    userEvent.type(dayDescInput, 'Saying goodbye to Paris');
    
    // Save the new day
    const saveDayButton = screen.getByText(/save new day/i);
    userEvent.click(saveDayButton);
    
    // Check that update service was called with the new day added
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          daily_itinerary: expect.arrayContaining([
            expect.objectContaining({
              day_number: 3,
              day_title: 'Departure Day',
              description: 'Saying goodbye to Paris',
              activities: expect.any(Array)
            })
          ])
        })
      );
    });
  });

  it('displays error message when API call fails', async () => {
    // Mock an API error
    routeManagementService.updateRoute.mockRejectedValueOnce(new Error('Failed to update route'));
    
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Parisian Adventure')).toBeInTheDocument();
    });
    
    // Try to edit the title
    const editTitleButton = screen.getByLabelText(/edit title/i);
    userEvent.click(editTitleButton);
    
    const titleInput = screen.getByDisplayValue('Parisian Adventure');
    userEvent.clear(titleInput);
    userEvent.type(titleInput, 'New Title');
    
    const saveButton = screen.getByText(/save/i);
    userEvent.click(saveButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error updating itinerary/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to update route/i)).toBeInTheDocument();
    });
  });

  it('displays reordering UI when reorder mode is activated', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    });
    
    // Enable reorder mode
    const reorderButton = screen.getByText(/reorder activities/i);
    userEvent.click(reorderButton);
    
    // Verify reorder UI elements are displayed
    expect(screen.getByText(/drag to reorder/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/move activity/i)).toHaveLength(4); // All 4 activities
    
    // Exit reorder mode
    const doneButton = screen.getByText(/done reordering/i);
    userEvent.click(doneButton);
    
    // Verify reorder UI is hidden
    expect(screen.queryByText(/drag to reorder/i)).not.toBeInTheDocument();
  });

  it('allows costs to be edited', async () => {
    render(<ItineraryBuilder routeId="route_123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Parisian Adventure')).toBeInTheDocument();
    });
    
    // Open costs section
    const costsButton = screen.getByText(/edit costs/i);
    userEvent.click(costsButton);
    
    // Modify accommodation cost
    const accommodationInput = screen.getByDisplayValue('$450');
    userEvent.clear(accommodationInput);
    userEvent.type(accommodationInput, '$500');
    
    // Save the changes
    const saveCostsButton = screen.getByText(/save costs/i);
    userEvent.click(saveCostsButton);
    
    // Check that update service was called with the updated costs
    await waitFor(() => {
      expect(routeManagementService.updateRoute).toHaveBeenCalledWith(
        'route_123',
        expect.objectContaining({
          estimated_costs: expect.objectContaining({
            'Accommodations': '$500',
            'Total': '$1150' // Total should be recalculated
          })
        })
      );
    });
  });
}); 