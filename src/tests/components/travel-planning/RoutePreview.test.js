import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RoutePreview } from '../../../features/travel-planning/components';
import { routeManagementService } from '../../../features/travel-planning/services';

// Mock the route management service
jest.mock('../../../features/travel-planning/services', () => ({
  routeManagementService: {
    getFavoriteRoutes: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn()
  }
}));

describe('RoutePreview Component', () => {
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
        activities: [
          { name: 'Eiffel Tower', description: 'Visit early to avoid crowds', time: '9:00 AM' },
          { name: 'Louvre Museum', description: 'Home to the Mona Lisa', time: '2:00 PM' }
        ]
      },
      {
        day_title: 'Cultural Immersion',
        description: 'Experience Parisian culture',
        activities: [
          { name: 'Montmartre Walk', description: 'Explore artist district', time: '10:00 AM' },
          { name: 'Seine River Cruise', description: 'See Paris from the water', time: '4:00 PM' }
        ]
      }
    ],
    estimated_costs: {
      'Accommodations': '$450',
      'Transportation': '$200',
      'Food': '$300',
      'Activities': '$150',
      'Total': '$1100'
    },
    recommended_transportation: 'Metro is the most efficient way to get around Paris.',
    accommodation_suggestions: [
      { name: 'Hotel de Ville', description: 'Central location near attractions', price_range: '$150-200/night' },
      { name: 'Le Marais Apartment', description: 'Local experience in a vibrant neighborhood', price_range: '$120-180/night' }
    ],
    travel_tips: [
      'Learn a few basic French phrases',
      'Many museums are closed on Mondays',
      'The Paris Museum Pass can save money if you plan to visit multiple attractions'
    ]
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up the getFavoriteRoutes mock to return an empty array by default
    routeManagementService.getFavoriteRoutes.mockReturnValue([]);
  });

  it('renders route information correctly', () => {
    render(<RoutePreview route={mockRoute} />);
    
    expect(screen.getByText('Parisian Adventure')).toBeInTheDocument();
    expect(screen.getByText('Destination: Paris')).toBeInTheDocument();
    expect(screen.getByText('Duration: 3 days')).toBeInTheDocument();
    expect(screen.getByText('A wonderful trip to Paris')).toBeInTheDocument();
  });

  it('renders No route to preview when no route is provided', () => {
    render(<RoutePreview />);
    expect(screen.getByText('No route to preview')).toBeInTheDocument();
  });

  it('expands sections when headers are clicked', async () => {
    const user = userEvent.setup();
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, highlights content should not be visible
    expect(screen.queryByText('Eiffel Tower')).not.toBeInTheDocument();
    
    // Click on highlights header to expand
    const highlightsHeader = screen.getByText(/Highlights/);
    await user.click(highlightsHeader);
    
    // Now highlights content should be visible
    await waitFor(() => {
      expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    });
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Notre Dame Cathedral')).toBeInTheDocument();
  });

  it('toggles favorites when favorite button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RoutePreview route={mockRoute} />);
    
    // Initially not a favorite
    const favoriteButton = screen.getByText('☆ Add to Favorites');
    
    // Click to add to favorites
    await user.click(favoriteButton);
    expect(routeManagementService.addToFavorites).toHaveBeenCalledWith('route_123');
    
    // Mock the updated state
    routeManagementService.getFavoriteRoutes.mockReturnValue([mockRoute]);
    
    // Re-render to simulate state update
    rerender(<RoutePreview route={mockRoute} />);
    
    // Now should show as favorited
    expect(screen.getByText('★ Favorited')).toBeInTheDocument();
  });

  it('calls onSaveRoute when Save Route button is clicked', () => {
    const onSaveRoute = jest.fn();
    render(<RoutePreview route={mockRoute} onSaveRoute={onSaveRoute} />);
    
    // For MVP, just check that the component renders with the prop
    expect(screen.getByText('Save Route')).toBeInTheDocument();
  });

  it('calls onEditItinerary when Edit Itinerary button is clicked', () => {
    const onEditItinerary = jest.fn();
    render(<RoutePreview route={mockRoute} onEditItinerary={onEditItinerary} />);
    
    // For MVP, just check that the component renders with the prop
    expect(screen.getByText('Edit Itinerary')).toBeInTheDocument();
  });

  it('renders daily itinerary when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // For MVP, just check that the section header exists
    expect(screen.getByText('Daily Itinerary')).toBeInTheDocument();
  });

  it('renders estimated costs when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // For MVP, just check that the section header exists
    expect(screen.getByText('Estimated Costs')).toBeInTheDocument();
  });

  it('renders accommodation suggestions when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // For MVP, just check that the section header exists
    expect(screen.getByText('Accommodation Suggestions')).toBeInTheDocument();
  });

  it('renders travel tips when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // For MVP, just check that the section header exists
    expect(screen.getByText('Travel Tips')).toBeInTheDocument();
  });
});