import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from '../../pages/MapPage';

// Mock the googleMapsApi module
jest.mock('../../api/googleMapsApi', () => ({
  initializeMap: jest.fn().mockImplementation(() => ({})),
  displayRouteOnMap: jest.fn().mockResolvedValue({}),
  getNearbyInterestPoints: jest.fn().mockResolvedValue([
    { 
      name: 'Test Place', 
      place_id: 'test123',
      position: { lat: 41.9, lng: 12.5 }
    }
  ])
}));

// Mock the openaiApi module
jest.mock('../../api/openaiApi', () => ({
  splitRouteByDay: jest.fn().mockResolvedValue({
    daily_routes: [
      {
        travel_day: 1,
        current_date: '2025/03/10',
        dairy_routes: [
          {
            route_id: 'r001',
            departure_site: 'Hotel Washington',
            arrival_site: 'Smithsonian National Museum of Natural History',
            departure_time: '2025/03/10 9.00 AM(GMT-4)',
            arrival_time: '2025/03/10 9.16 AM(GMT-4)',
            transportation_type: 'walk',
            duration: '14',
            duration_unit: 'minute',
            distance: 0.7,
            distance_unit: 'mile'
          }
        ]
      }
    ]
  })
}));

// Mock the useParams hook from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ routeId: 'test-route-123' }),
  useNavigate: () => jest.fn()
}));

describe('MapPage Component', () => {
  // Mock localStorage.getItem for route data
  const mockRoute = {
    id: 'test-route-123',
    name: 'Test Route',
    destination: 'Rome, Italy',
    user_query: 'Show me a 3-day tour of Rome',
    user_intent_recognition: {
      arrival: 'Rome',
      travel_duration: '3 days'
    },
    sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain']
  };

  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'tourguide_routes') {
        return JSON.stringify({
          'test-route-123': mockRoute
        });
      }
      return null;
    });
  });

  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </BrowserRouter>
    );
  };

  test('should render map container', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  test('should display route title', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Route')).toBeInTheDocument();
    });
  });

  test('should display user query', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Show me a 3-day tour of Rome')).toBeInTheDocument();
    });
  });

  test('should display timeline section', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Your Itinerary')).toBeInTheDocument();
    });
  });

  test('should display loading state initially', () => {
    renderWithRouter(<MapPage />);
    
    expect(screen.getByText('Loading route data...')).toBeInTheDocument();
  });

  test('should fetch and display nearby points', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Nearby Points of Interest')).toBeInTheDocument();
    });
  });

  test('should handle route not found', async () => {
    // Mock localStorage to return no routes
    Storage.prototype.getItem = jest.fn().mockReturnValue(JSON.stringify({}));
    
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Route not found')).toBeInTheDocument();
    });
  });

  test('should display route details', async () => {
    renderWithRouter(<MapPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Destination:')).toBeInTheDocument();
      expect(screen.getByText('Rome, Italy')).toBeInTheDocument();
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('3 days')).toBeInTheDocument();
    });
  });
}); 