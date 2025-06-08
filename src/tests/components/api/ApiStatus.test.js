import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiStatus from '../../../components/ApiStatus';

// Mock the openaiApi module
jest.mock('../../../core/api/openaiApi', () => ({
  getStatus: jest.fn()
}));

// Import the mocked module
import { getStatus } from '../../../core/api/openaiApi';

describe('ApiStatus Component', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Mock environment variable
    process.env = {
      ...originalEnv,
      REACT_APP_GOOGLE_MAPS_API_KEY: undefined
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  test('should display loading state initially', () => {
    render(<ApiStatus />);
    expect(screen.getByText('Checking API status...')).toBeInTheDocument();
  });

  test('should display connected APIs when both are configured', async () => {
    // Mock OpenAI API as connected
    getStatus.mockResolvedValue({ isConfigured: true });
    
    // Mock Google Maps API key as defined
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-google-maps-key';

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Connected')).toBeInTheDocument();
    });
  });

  test('should display disconnected APIs when not configured', async () => {
    // Mock OpenAI API as disconnected
    getStatus.mockResolvedValue({ isConfigured: false });
    
    // Google Maps API key is undefined from beforeEach

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Not Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not Connected')).toBeInTheDocument();
      expect(screen.getAllByText(/Please set your .* API key in the \.env file/)).toHaveLength(2);
    });
  });

  test('should display mixed API connection states', async () => {
    // Mock OpenAI API connected but Google Maps disconnected
    getStatus.mockResolvedValue({ isConfigured: true });
    // Google Maps API key is undefined from beforeEach

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status')).toBeInTheDocument();
      expect(screen.getByText('OpenAI API: Connected')).toBeInTheDocument();
      expect(screen.getByText('Google Maps API: Not Connected')).toBeInTheDocument();
    });
  });

  test('should handle API check errors', async () => {
    // Mock an error during API check
    getStatus.mockRejectedValue(new Error('API Error'));

    render(<ApiStatus />);

    // Wait for the async status check to complete
    await waitFor(() => {
      expect(screen.getByText('API Status Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
}); 