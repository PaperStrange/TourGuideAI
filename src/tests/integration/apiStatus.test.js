import * as openaiApi from '../../api/openaiApi';
import * as googleMapsApi from '../../api/googleMapsApi';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import ApiStatus from '../../components/ApiStatus';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../../pages/ChatPage';

// Partial mock the API modules
jest.mock('../../api/openaiApi', () => {
  const originalModule = jest.requireActual('../../api/openaiApi');
  return {
    ...originalModule,
    getStatus: jest.fn(),
    setApiKey: jest.fn()
  };
});

jest.mock('../../api/googleMapsApi', () => {
  const originalModule = jest.requireActual('../../api/googleMapsApi');
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
  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ApiStatus component correctly reflects API configuration state', async () => {
    // Mock API keys as not configured
    openaiApi.getStatus.mockResolvedValue({ isConfigured: false });
    googleMapsApi.getStatus.mockResolvedValue({ isConfigured: false });

    render(<ApiStatus />);

    // Expect loading state first
    expect(screen.getByText('Checking API connection...')).toBeInTheDocument();

    // Then expect the component to show both APIs as not connected
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Not connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not connected')).toBeInTheDocument();
    });

    // Now mock the APIs as configured
    openaiApi.getStatus.mockClear();
    googleMapsApi.getStatus.mockClear();
    openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
    googleMapsApi.getStatus.mockResolvedValue({ isConfigured: true });

    // Re-render the component
    render(<ApiStatus />);

    // Expect both APIs to be connected now
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('ChatPage includes ApiStatus component and reflects API state', async () => {
    // Set up API statuses
    openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
    googleMapsApi.getStatus.mockResolvedValue({ isConfigured: false });

    renderWithRouter(<ChatPage />);

    // Check both the ChatPage and ApiStatus component render correctly
    await waitFor(() => {
      // ChatPage elements
      expect(screen.getByText('Your personal tour guide!')).toBeInTheDocument();
      expect(screen.getByText('Generate your first plan!')).toBeInTheDocument();
      
      // ApiStatus elements
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not connected')).toBeInTheDocument();
    });
  });

  test('setting API keys updates status across components', async () => {
    // Initial setup - no API keys
    openaiApi.getStatus.mockResolvedValue({ isConfigured: false });
    googleMapsApi.getStatus.mockResolvedValue({ isConfigured: false });
    
    // Mock the setApiKey functions to update the mocked getStatus
    openaiApi.setApiKey.mockImplementation(() => {
      openaiApi.getStatus.mockResolvedValue({ isConfigured: true });
      return true;
    });
    
    googleMapsApi.setApiKey.mockImplementation(() => {
      googleMapsApi.getStatus.mockResolvedValue({ isConfigured: true });
      return true;
    });

    // Render the component with no API keys configured
    renderWithRouter(<ApiStatus />);
    
    // Verify initial state
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Not connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not connected')).toBeInTheDocument();
    });

    // Set the API keys
    const openaiKeyResult = openaiApi.setApiKey('test-openai-key');
    const googleKeyResult = googleMapsApi.setApiKey('test-google-key');
    
    expect(openaiKeyResult).toBe(true);
    expect(googleKeyResult).toBe(true);

    // Re-render the component to see the changes
    render(<ApiStatus />);
    
    // Verify updated state
    await waitFor(() => {
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('API status error handling', async () => {
    // Mock API check errors
    openaiApi.getStatus.mockRejectedValue(new Error('OpenAI API Error'));
    googleMapsApi.getStatus.mockRejectedValue(new Error('Google Maps API Error'));

    render(<ApiStatus />);

    // Expect error message
    await waitFor(() => {
      expect(screen.getByText('Error checking API status')).toBeInTheDocument();
    });
  });
}); 