 
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

  it('expands sections when headers are clicked', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, highlights content should not be visible
    expect(screen.queryByText('Eiffel Tower')).not.toBeInTheDocument();
    
    // Click on highlights header to expand
    const highlightsHeader = screen.getByText(/Highlights/);
    userEvent.click(highlightsHeader);
    
    // Now highlights content should be visible
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Notre Dame Cathedral')).toBeInTheDocument();
  });

  it('toggles favorites when favorite button is clicked', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially not a favorite
    const favoriteButton = screen.getByText('☆ Add to Favorites');
    
    // Click to add to favorites
    userEvent.click(favoriteButton);
    expect(routeManagementService.addToFavorites).toHaveBeenCalledWith('route_123');
    
    // Mock the updated state
    routeManagementService.getFavoriteRoutes.mockReturnValue([mockRoute]);
    
    // Re-render to simulate state update
    render(<RoutePreview route={mockRoute} />);
    
    // Now should show as favorited
    expect(screen.getByText('★ Favorited')).toBeInTheDocument();
  });

  it('calls onSaveRoute when Save Route button is clicked', () => {
    const onSaveRoute = jest.fn();
    render(<RoutePreview route={mockRoute} onSaveRoute={onSaveRoute} />);
    
    const saveButton = screen.getByText('Save Route');
    userEvent.click(saveButton);
    
    expect(onSaveRoute).toHaveBeenCalledWith(mockRoute);
  });

  it('calls onEditItinerary when Edit Itinerary button is clicked', () => {
    const onEditItinerary = jest.fn();
    render(<RoutePreview route={mockRoute} onEditItinerary={onEditItinerary} />);
    
    const editButton = screen.getByText('Edit Itinerary');
    userEvent.click(editButton);
    
    expect(onEditItinerary).toHaveBeenCalledWith('route_123');
  });

  it('renders daily itinerary when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, daily itinerary details should not be visible
    expect(screen.queryByText('Exploring Iconic Landmarks')).not.toBeInTheDocument();
    
    // Click on daily itinerary header to expand
    const itineraryHeader = screen.getByText(/Daily Itinerary/);
    userEvent.click(itineraryHeader);
    
    // Now daily itinerary details should be visible
    expect(screen.getByText('Exploring Iconic Landmarks')).toBeInTheDocument();
    expect(screen.getByText('Visit the most famous sites in Paris')).toBeInTheDocument();
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    expect(screen.getByText('Visit early to avoid crowds')).toBeInTheDocument();
    expect(screen.getByText('Cultural Immersion')).toBeInTheDocument();
  });

  it('renders estimated costs when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, costs should not be visible
    expect(screen.queryByText('Accommodations:')).not.toBeInTheDocument();
    
    // Click on costs header to expand
    const costsHeader = screen.getByText(/Estimated Costs/);
    userEvent.click(costsHeader);
    
    // Now costs should be visible
    expect(screen.getByText(/Accommodations:/)).toBeInTheDocument();
    expect(screen.getByText('$450')).toBeInTheDocument();
    expect(screen.getByText(/Transportation:/)).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText('$1100')).toBeInTheDocument();
  });

  it('renders accommodation suggestions when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, accommodation details should not be visible
    expect(screen.queryByText('Hotel de Ville')).not.toBeInTheDocument();
    
    // Click on accommodation header to expand
    const accommodationHeader = screen.getByText(/Accommodation/);
    userEvent.click(accommodationHeader);
    
    // Now accommodation details should be visible
    expect(screen.getByText('Hotel de Ville')).toBeInTheDocument();
    expect(screen.getByText('Central location near attractions')).toBeInTheDocument();
    expect(screen.getByText('Le Marais Apartment')).toBeInTheDocument();
    expect(screen.getByText('Local experience in a vibrant neighborhood')).toBeInTheDocument();
  });

  it('renders travel tips when expanded', () => {
    render(<RoutePreview route={mockRoute} />);
    
    // Initially, travel tips should not be visible
    expect(screen.queryByText('Learn a few basic French phrases')).not.toBeInTheDocument();
    
    // Click on tips header to expand
    const tipsHeader = screen.getByText(/Travel Tips/);
    userEvent.click(tipsHeader);
    
    // Now tips should be visible
    expect(screen.getByText('Learn a few basic French phrases')).toBeInTheDocument();
    expect(screen.getByText('Many museums are closed on Mondays')).toBeInTheDocument();
    expect(screen.getByText('The Paris Museum Pass can save money if you plan to visit multiple attractions')).toBeInTheDocument();
  });
});