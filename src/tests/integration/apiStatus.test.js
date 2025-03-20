import * as openaiApi from '../../core/api/openaiApi';
import * as googleMapsApi from '../../core/api/googleMapsApi';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import ApiStatus from '../../components/ApiStatus';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../../pages/ChatPage';

// Partial mock the API modules
jest.mock('../../core/api/openaiApi', () => {
  const originalModule = jest.requireActual('../../core/api/openaiApi');
  return {
    ...originalModule,
    getStatus: jest.fn(),
    setApiKey: jest.fn()
  };
});

jest.mock('../../core/api/googleMapsApi', () => {
  const originalModule = jest.requireActual('../../core/api/googleMapsApi');
  return {
    ...originalModule,
    getStatus: jest.fn(),
    setApiKey: jest.fn()
  };
});

// Mock the route navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('API Status Integration', () => {
  const originalEnv = process.env;

  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env = {
      ...originalEnv,
      REACT_APP_GOOGLE_MAPS_API_KEY: undefined,
      REACT_APP_OPENAI_API_KEY: undefined
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('ApiStatus component correctly reflects API configuration state', async () => {
    // Mock OpenAI API as not configured
    openaiApi.getStatus.mockResolvedValue({ isConfigured: false });

    render(<ApiStatus />);

    // Expect loading state first
    expect(screen.getByText('Checking API status...')).toBeInTheDocument();

    // Then expect the component to show both APIs as not connected
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Not Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not Connected')).toBeInTheDocument();
    });

    // Now mock the API as configured and set environment variable
    openaiApi.getStatus.mockClear();
    openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';

    // Re-render the component
    render(<ApiStatus />);

    // Expect both APIs to be connected now
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('ChatPage includes ApiStatus component and reflects API state', async () => {
    // Set up API status
    openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
    // Google Maps API is not configured (from beforeEach)

    renderWithRouter(<ChatPage />);

    // Check both the ChatPage and ApiStatus component render correctly
    await waitFor(() => {
      // ChatPage elements
      expect(screen.getByText('Your personal tour guide!')).toBeInTheDocument();
      expect(screen.getByText('Generate your first plan!')).toBeInTheDocument();
      
      // ApiStatus elements
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not Connected')).toBeInTheDocument();
    });
  });

  test('setting API keys updates status across components', async () => {
    // Initial setup - no API keys
    openaiApi.getStatus.mockResolvedValue({ isConfigured: false });
    
    // Mock the setApiKey function to update the mocked getStatus
    openaiApi.setApiKey.mockImplementation(() => {
      openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
      return true;
    });

    // Render the component with no API keys configured
    renderWithRouter(<ApiStatus />);
    
    // Verify initial state
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Not Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not Connected')).toBeInTheDocument();
    });

    // Set the OpenAI API key
    const openaiKeyResult = openaiApi.setApiKey('test-openai-key');
    expect(openaiKeyResult).toBe(true);
    
    // Set Google Maps API key via environment variable
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-google-key';

    // Re-render the component to see the changes
    render(<ApiStatus />);
    
    // Verify updated state
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('API status error handling', async () => {
    // Mock API check error
    openaiApi.getStatus.mockRejectedValue(new Error('API Error'));

    render(<ApiStatus />);

    // Expect error message
    await waitFor(() => {
      expect(screen.getByText('API Status Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
}); 