import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureUsageChart from '../../../features/beta-program/components/analytics/FeatureUsageChart';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock the AnalyticsService
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getFeatureUsageData: jest.fn()
}));

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: () => <div data-testid="bar-chart" />,
    Bar: () => <div data-testid="bar" />,
    Cell: () => <div data-testid="cell" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

describe('FeatureUsageChart Component', () => {
  // Mock data for feature usage
  const mockFeatureData = [
    { feature: 'Route Planning', category: 'Planning', value: 3450, uniqueUsers: 758, trend: 12.5 },
    { feature: 'POI Search', category: 'Discovery', value: 2890, uniqueUsers: 683, trend: 8.2 },
    { feature: 'Timeline Creation', category: 'Planning', value: 2100, uniqueUsers: 521, trend: -3.8 },
    { feature: 'Image Upload', category: 'Content', value: 1750, uniqueUsers: 420, trend: 5.1 },
    { feature: 'Tour Generation', category: 'AI', value: 1520, uniqueUsers: 380, trend: 15.2 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API call
    analyticsService.getFeatureUsageData.mockResolvedValue(mockFeatureData);
  });

  test('renders loading state initially', async () => {
    render(<FeatureUsageChart />);
    
    expect(screen.getByText(/Loading feature usage data/i)).toBeInTheDocument();
  });
  
  test('renders chart with feature data after loading', async () => {
    render(<FeatureUsageChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading feature usage data/i)).not.toBeInTheDocument();
    });
    
    // Check chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Check UI controls are rendered
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });
  
  test('changes time range when selector is changed', async () => {
    render(<FeatureUsageChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading feature usage data/i)).not.toBeInTheDocument();
    });
    
    // Get all selectors
    const selectors = screen.getAllByRole('combobox');
    
    // Change time range to week
    const timeRangeSelector = selectors[0];
    fireEvent.change(timeRangeSelector, { target: { value: 'week' } });
    
    // Verify API is called with new parameters
    expect(analyticsService.getFeatureUsageData).toHaveBeenCalledWith('week', expect.any(String));
  });
  
  test('changes view type when selector is changed', async () => {
    render(<FeatureUsageChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading feature usage data/i)).not.toBeInTheDocument();
    });
    
    // Get all selectors
    const selectors = screen.getAllByRole('combobox');
    
    // Change view type to duration
    const viewTypeSelector = selectors[1];
    fireEvent.change(viewTypeSelector, { target: { value: 'duration' } });
    
    // Verify API is called with new parameters
    expect(analyticsService.getFeatureUsageData).toHaveBeenCalledWith(expect.any(String), 'duration');
  });
  
  test('changes sort order when selector is changed', async () => {
    render(<FeatureUsageChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading feature usage data/i)).not.toBeInTheDocument();
    });
    
    // Get all selectors
    const selectors = screen.getAllByRole('combobox');
    
    // Change sort to alphabetical
    const sortSelector = selectors[2];
    fireEvent.change(sortSelector, { target: { value: 'alphabetical' } });
    
    // No new API call expected, just re-sorting existing data
    expect(analyticsService.getFeatureUsageData).toHaveBeenCalledTimes(1);
  });
  
  test('displays insights panel with top and least used features', async () => {
    render(<FeatureUsageChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading feature usage data/i)).not.toBeInTheDocument();
    });
    
    // Check insights panel is rendered
    expect(screen.getByText(/Feature Insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Least Used Features/i)).toBeInTheDocument();
    
    // Top feature should be the first in the sorted list
    expect(screen.getByText(/Route Planning/i)).toBeInTheDocument();
  });
  
  test('displays error message when API call fails', async () => {
    // Mock API failure
    analyticsService.getFeatureUsageData.mockRejectedValue(new Error('Failed to fetch data'));
    
    render(<FeatureUsageChart />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load feature usage data/i)).toBeInTheDocument();
    });
  });
}); 