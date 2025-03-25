// New test file
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock the entire @react-google-maps/api library
jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker"></div>,
  InfoWindow: ({ children }) => <div data-testid="info-window">{children}</div>,
  useLoadScript: () => ({
    isLoaded: true,
    loadError: null
  })
}));

// Mock the useLocation from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    state: {
      userQuery: 'Show me a 3-day tour of Rome',
      intentData: {
        intent: {
          arrival: 'Rome',
          travel_duration: '3 days'
        }
      }
    }
  })
}));

// Import the real component to test
const MapPage = jest.requireActual('../../pages/MapPage').default;

describe('MapPage Component', () => {
  test('renders with expected elements', () => {
    // Render with mocked components
    render(
      <BrowserRouter>
        <MapPage />
      </BrowserRouter>
    );
    
    // Basic assertions - just check that key elements exist
    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByText('User Query')).toBeInTheDocument();
    expect(screen.getByText('Your Itinerary')).toBeInTheDocument();
    expect(screen.getByText('Nearby Points of Interest')).toBeInTheDocument();
  });
});
