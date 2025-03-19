import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiStatus from '../../components/ApiStatus';

// Mock the openaiApi module
jest.mock('../../api/openaiApi', () => ({
  getStatus: jest.fn()
}));

// Mock the googleMapsApi module
jest.mock('../../api/googleMapsApi', () => ({
  getStatus: jest.fn()
}));

// Import the mocked modules
import { getStatus as getOpenAIStatus } from '../../api/openaiApi';
import { getStatus as getGoogleMapsStatus } from '../../api/googleMapsApi';

describe('ApiStatus Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should display loading state initially', () => {
    render(<ApiStatus />);
    expect(screen.getByText('Checking API connection...')).toBeInTheDocument();
  });

  test('should display connected APIs when both are configured', async () => {
    // Mock both APIs as connected
    getOpenAIStatus.mockResolvedValue({ isConfigured: true });
    getGoogleMapsStatus.mockResolvedValue({ isConfigured: true });

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('should display disconnected APIs when not configured', async () => {
    // Mock both APIs as disconnected
    getOpenAIStatus.mockResolvedValue({ isConfigured: false });
    getGoogleMapsStatus.mockResolvedValue({ isConfigured: false });

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Not connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not connected')).toBeInTheDocument();
      expect(screen.getByText('Configure API keys in your .env file')).toBeInTheDocument();
    });
  });

  test('should display mixed API connection states', async () => {
    // Mock one API connected, one disconnected
    getOpenAIStatus.mockResolvedValue({ isConfigured: true });
    getGoogleMapsStatus.mockResolvedValue({ isConfigured: false });

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not connected')).toBeInTheDocument();
    });
  });

  test('should handle API check errors', async () => {
    // Mock an error during API check
    getOpenAIStatus.mockRejectedValue(new Error('API Error'));
    getGoogleMapsStatus.mockRejectedValue(new Error('API Error'));

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('Error checking API status')).toBeInTheDocument();
    });
  });

  test('should refresh API status on interval', async () => {
    // Mock the timer
    jest.useFakeTimers();
    
    // Mock APIs as connected initially
    getOpenAIStatus.mockResolvedValue({ isConfigured: true });
    getGoogleMapsStatus.mockResolvedValue({ isConfigured: true });

    render(<ApiStatus />);

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
    });

    // Clear mocks to check if they're called again
    getOpenAIStatus.mockClear();
    getGoogleMapsStatus.mockClear();

    // Mock APIs as disconnected for the second check
    getOpenAIStatus.mockResolvedValue({ isConfigured: false });
    getGoogleMapsStatus.mockResolvedValue({ isConfigured: false });

    // Advance timer to trigger refresh
    act(() => {
      jest.advanceTimersByTime(60000); // 60 seconds
    });

    // Verify that the status was checked again
    expect(getOpenAIStatus).toHaveBeenCalled();
    expect(getGoogleMapsStatus).toHaveBeenCalled();

    // Clean up
    jest.useRealTimers();
  });
}); 