import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../../pages/ProfilePage';

// Mock the route navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('ProfilePage Component', () => {
  // Mock localStorage for route data
  const mockRoutes = {
    'route1': {
      id: 'route1',
      name: 'Rome 3-day Tour',
      destination: 'Rome, Italy',
      created_date: '2025-01-01',
      upvotes: 100,
      views: 500,
      sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain'],
      route_duration: '3 days',
      estimated_cost: '$2000'
    },
    'route2': {
      id: 'route2',
      name: 'Paris Weekend',
      destination: 'Paris, France',
      created_date: '2025-01-05',
      upvotes: 50,
      views: 300,
      sites_included_in_routes: ['Eiffel Tower', 'Louvre', 'Notre Dame'],
      route_duration: '2 days',
      estimated_cost: '$1500'
    },
    'route3': {
      id: 'route3',
      name: 'London Adventure',
      destination: 'London, UK',
      created_date: '2025-01-10',
      upvotes: 75,
      views: 400,
      sites_included_in_routes: ['Big Ben', 'Tower of London', 'British Museum'],
      route_duration: '4 days',
      estimated_cost: '$2500'
    }
  };

  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'tourguide_routes') {
        return JSON.stringify(mockRoutes);
      } else if (key === 'tourguide_user') {
        return JSON.stringify({
          name: 'Test User',
          profile_image: '/images/profile.jpg'
        });
      }
      return null;
    });
  });

  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    );
  };

  test('should render profile page with user name', () => {
    renderWithRouter(<ProfilePage />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('should render profile image', () => {
    renderWithRouter(<ProfilePage />);
    const profileImage = screen.getByAltText('User Profile');
    expect(profileImage).toBeInTheDocument();
    expect(profileImage.src).toContain('/images/profile.jpg');
  });

  test('should render route cards', () => {
    renderWithRouter(<ProfilePage />);
    
    expect(screen.getByText('Rome 3-day Tour')).toBeInTheDocument();
    expect(screen.getByText('Paris Weekend')).toBeInTheDocument();
    expect(screen.getByText('London Adventure')).toBeInTheDocument();
  });

  test('should display route details on cards', () => {
    renderWithRouter(<ProfilePage />);
    
    expect(screen.getByText('100 upvotes')).toBeInTheDocument();
    expect(screen.getByText('500 views')).toBeInTheDocument();
    expect(screen.getByText('3 sites')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('$2000')).toBeInTheDocument();
  });

  test('should allow sorting by created time', () => {
    renderWithRouter(<ProfilePage />);
    
    const sortSelect = screen.getByLabelText('Sort by:');
    fireEvent.change(sortSelect, { target: { value: 'created_date' } });
    
    // Newest first is default, so London should be first
    const routeCards = screen.getAllByTestId('route-card');
    expect(routeCards[0]).toHaveTextContent('London Adventure');
    expect(routeCards[1]).toHaveTextContent('Paris Weekend');
    expect(routeCards[2]).toHaveTextContent('Rome 3-day Tour');
  });

  test('should allow sorting by upvotes', () => {
    renderWithRouter(<ProfilePage />);
    
    const sortSelect = screen.getByLabelText('Sort by:');
    fireEvent.change(sortSelect, { target: { value: 'upvotes' } });
    
    // Most upvotes first
    const routeCards = screen.getAllByTestId('route-card');
    expect(routeCards[0]).toHaveTextContent('Rome 3-day Tour');
    expect(routeCards[1]).toHaveTextContent('London Adventure');
    expect(routeCards[2]).toHaveTextContent('Paris Weekend');
  });

  test('should allow sorting by views', () => {
    renderWithRouter(<ProfilePage />);
    
    const sortSelect = screen.getByLabelText('Sort by:');
    fireEvent.change(sortSelect, { target: { value: 'views' } });
    
    // Most views first
    const routeCards = screen.getAllByTestId('route-card');
    expect(routeCards[0]).toHaveTextContent('Rome 3-day Tour');
    expect(routeCards[1]).toHaveTextContent('London Adventure');
    expect(routeCards[2]).toHaveTextContent('Paris Weekend');
  });

  test('should allow sorting by sites', () => {
    renderWithRouter(<ProfilePage />);
    
    const sortSelect = screen.getByLabelText('Sort by:');
    fireEvent.change(sortSelect, { target: { value: 'sites' } });
    
    // Most sites first (all have 3 sites in this mock data)
    const routeCards = screen.getAllByTestId('route-card');
    expect(routeCards.length).toBe(3);
  });

  test('should display message when no routes are available', () => {
    // Mock localStorage to return no routes
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'tourguide_routes') {
        return JSON.stringify({});
      } else if (key === 'tourguide_user') {
        return JSON.stringify({
          name: 'Test User',
          profile_image: '/images/profile.jpg'
        });
      }
      return null;
    });
    
    renderWithRouter(<ProfilePage />);
    
    expect(screen.getByText('No routes available')).toBeInTheDocument();
  });
}); 