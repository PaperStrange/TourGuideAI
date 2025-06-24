import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RouteGenerator } from '../../../features/travel-planning/components';
import { routeGenerationService } from '../../../features/travel-planning/services';

// Mock the route generation service
jest.mock('../../../features/travel-planning/services', () => ({
  routeGenerationService: {
    analyzeUserQuery: jest.fn(),
    generateRouteFromQuery: jest.fn(),
    generateRandomRoute: jest.fn()
  }
}));

describe('RouteGenerator Component', () => {
  const mockRoute = {
    id: 'route_123',
    route_name: 'Test Route',
    destination: 'Paris',
    duration: '3',
    overview: 'A wonderful trip to Paris',
    highlights: ['Eiffel Tower', 'Louvre Museum'],
    daily_itinerary: [
      {
        day_title: 'Day 1',
        description: 'Exploring city center',
        activities: [
          { name: 'Visit Eiffel Tower', description: 'Iconic landmark' }
        ]
      }
    ]
  };

  const mockIntent = {
    arrival: 'Paris',
    departure: 'London',
    arrival_date: 'June 15',
    departure_date: 'June 18',
    travel_duration: '3 days',
    entertainment_prefer: 'Museums, food tours',
    transportation_prefer: 'Train',
    accommodation_prefer: 'Mid-range hotel',
    total_cost_prefer: 'Budget',
    user_personal_need: ''
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    render(<RouteGenerator />);
    expect(screen.getByText('Generate Your Travel Route')).toBeInTheDocument();
  });

  it('shows error when generating route with empty query', async () => {
    render(<RouteGenerator />);
    
    const generateButton = screen.getByText('Generate Route');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a travel query')).toBeInTheDocument();
    });
    expect(routeGenerationService.generateRouteFromQuery).not.toHaveBeenCalled();
  });

  it('calls analyzeQuery when analyze button is clicked', async () => {
    routeGenerationService.analyzeUserQuery.mockResolvedValueOnce(mockIntent);
    
    render(<RouteGenerator />);
    
    // Type a query
    const textArea = screen.getByPlaceholderText(/Describe your travel plans/i);
    await userEvent.type(textArea, 'I want to visit Paris for 3 days');
    
    // Click analyze button
    const analyzeButton = screen.getByText('Analyze Query');
    await userEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(routeGenerationService.analyzeUserQuery).toHaveBeenCalledWith('I want to visit Paris for 3 days');
    });
  });

  it('displays intent analysis when analyzeQuery is successful', async () => {
    routeGenerationService.analyzeUserQuery.mockResolvedValueOnce(mockIntent);
    
    render(<RouteGenerator />);
    
    // Type a query
    const textArea = screen.getByPlaceholderText(/Describe your travel plans/i);
    await userEvent.type(textArea, 'I want to visit Paris for 3 days');
    
    // Click analyze button
    const analyzeButton = screen.getByText('Analyze Query');
    await userEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Travel Intent Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Destination:/)).toBeInTheDocument();
      expect(screen.getAllByText(/Paris/)).toHaveLength(2); // One in textarea, one in intent
      expect(screen.getByText(/Duration:/)).toBeInTheDocument();
      expect(screen.getAllByText(/3 days/)).toHaveLength(2); // One in textarea, one in intent
    });
  });

  it('generates a route when Generate Route button is clicked', async () => {
    routeGenerationService.generateRouteFromQuery.mockResolvedValueOnce(mockRoute);
    
    const onRouteGenerated = jest.fn();
    render(<RouteGenerator onRouteGenerated={onRouteGenerated} />);
    
    // Type a query
    const textArea = screen.getByPlaceholderText(/Describe your travel plans/i);
    await userEvent.type(textArea, 'I want to visit Paris for 3 days');
    
    // Click generate route button
    const generateButton = screen.getByText('Generate Route');
    await userEvent.click(generateButton);
    
    await waitFor(() => {
      expect(routeGenerationService.generateRouteFromQuery).toHaveBeenCalledWith('I want to visit Paris for 3 days');
      expect(onRouteGenerated).toHaveBeenCalledWith(mockRoute);
    });
  });

  it('generates a random route when Surprise Me button is clicked', async () => {
    routeGenerationService.generateRandomRoute.mockResolvedValueOnce(mockRoute);
    
    const onRouteGenerated = jest.fn();
    render(<RouteGenerator onRouteGenerated={onRouteGenerated} />);
    
    // Click surprise me button
    const surpriseButton = screen.getByText('Surprise Me!');
    await userEvent.click(surpriseButton);
    
    await waitFor(() => {
      expect(routeGenerationService.generateRandomRoute).toHaveBeenCalled();
      expect(onRouteGenerated).toHaveBeenCalledWith(mockRoute);
    });
  });

  it('shows loading indicator while generating route', async () => {
    // Delay the mock resolution to ensure we can check the loading state
    routeGenerationService.generateRouteFromQuery.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockRoute), 100);
      });
    });
    
    render(<RouteGenerator />);
    
    // Type a query
    const textArea = screen.getByPlaceholderText(/Describe your travel plans/i);
    await userEvent.type(textArea, 'I want to visit Paris for 3 days');
    
    // Click generate route button
    const generateButton = screen.getByText('Generate Route');
    await userEvent.click(generateButton);
    
    // Check that loading indicator is shown
    await waitFor(() => {
      expect(screen.getByText(/Generating your travel plan/i)).toBeInTheDocument();
    });
    
    // Wait for completion
    await waitFor(() => {
      expect(routeGenerationService.generateRouteFromQuery).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    routeGenerationService.generateRouteFromQuery.mockRejectedValueOnce(
      new Error('Network error')
    );
    
    render(<RouteGenerator />);
    
    // Type a query
    const textArea = screen.getByPlaceholderText(/Describe your travel plans/i);
    await userEvent.type(textArea, 'I want to visit Paris for 3 days');
    
    // Click generate route button
    const generateButton = screen.getByText('Generate Route');
    await userEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error generating route: Network error/i)).toBeInTheDocument();
    });
  });
});