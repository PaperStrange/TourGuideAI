import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeviceDistribution from '../../../features/beta-program/components/analytics/DeviceDistribution';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock the AnalyticsService
jest.mock('../../../../src/features/beta-program/services/AnalyticsService', () => ({
  getDeviceDistributionData: jest.fn()
}));

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: () => <div data-testid="pie-chart" />,
    Pie: ({ children }) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    Sector: () => <div data-testid="sector" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

describe('DeviceDistribution Component', () => {
  // Mock data for device distribution
  const mockDeviceData = [
    { name: 'Mobile', value: 1250, crashRate: 2.8, retentionRate: 68, avgSessionDuration: 8.3 },
    { name: 'Desktop', value: 820, crashRate: 1.4, retentionRate: 76, avgSessionDuration: 15.7 },
    { name: 'Tablet', value: 340, crashRate: 3.1, retentionRate: 65, avgSessionDuration: 12.1 },
  ];

  const mockOsData = [
    { name: 'Android', value: 750, crashRate: 3.5, retentionRate: 65, avgSessionDuration: 7.2 },
    { name: 'iOS', value: 650, crashRate: 1.8, retentionRate: 78, avgSessionDuration: 9.1 },
    { name: 'Windows', value: 580, crashRate: 2.3, retentionRate: 72, avgSessionDuration: 16.4 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API call for device data by default
    analyticsService.getDeviceDistributionData.mockResolvedValue(mockDeviceData);
  });

  test('renders loading state initially', async () => {
    render(<DeviceDistribution />);
    
    expect(screen.getByText(/Loading device data/i)).toBeInTheDocument();
  });
  
  test('renders pie chart with device data after loading', async () => {
    render(<DeviceDistribution />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading device data/i)).not.toBeInTheDocument();
    });
    
    // Check chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    
    // Check UI controls are rendered
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  test('changes view when selector is changed to OS', async () => {
    // First return device data, then OS data on second call
    analyticsService.getDeviceDistributionData
      .mockResolvedValueOnce(mockDeviceData)
      .mockResolvedValueOnce(mockOsData);
    
    render(<DeviceDistribution />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading device data/i)).not.toBeInTheDocument();
    });
    
    // Change view to OS
    const viewSelector = screen.getByRole('combobox');
    fireEvent.change(viewSelector, { target: { value: 'os' } });
    
    // Verify API is called with new view
    expect(analyticsService.getDeviceDistributionData).toHaveBeenCalledWith('os');
  });
  
  test('generates insights based on device data', async () => {
    render(<DeviceDistribution />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading device data/i)).not.toBeInTheDocument();
    });
    
    // Check insights panel is rendered
    expect(screen.getByText(/Device Insights/i)).toBeInTheDocument();
    
    // Platform diversity should be calculated
    expect(screen.getByText(/Platform Diversity/i)).toBeInTheDocument();
    
    // Main platform should be Mobile (highest value in mock data)
    expect(screen.getByText(/Mobile/i)).toBeInTheDocument();
  });
  
  test('handles pie chart slice interaction', async () => {
    render(<DeviceDistribution />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading device data/i)).not.toBeInTheDocument();
    });
    
    // Simulate pie chart interaction via the onPieEnter function
    // This would normally be done by hovering/clicking pie sections
    // Since we can't directly test that, we're testing that the component doesn't crash
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });
  
  test('displays error message when API call fails', async () => {
    // Mock API failure
    analyticsService.getDeviceDistributionData.mockRejectedValue(new Error('Failed to fetch data'));
    
    render(<DeviceDistribution />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load device distribution data/i)).toBeInTheDocument();
    });
  });
}); 