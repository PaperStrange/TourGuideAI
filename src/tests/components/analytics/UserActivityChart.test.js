import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserActivityChart from '../../../features/beta-program/components/analytics/UserActivityChart';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock the AnalyticsService
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getUserActivityData: jest.fn()
}));

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: () => <div data-testid="line-chart" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Brush: () => <div data-testid="brush" />
  };
});

describe('UserActivityChart Component', () => {
  // Mock data for user activity
  const mockActivityData = [
    { 
      date: '2023-05-01', 
      activeUsers: 42, 
      totalSessions: 86, 
      newUsers: 8, 
      returningUsers: 34,
      avgSessionLength: 15.2,
      actionsPerSession: 25.4,
      bounceRate: 12.5
    },
    { 
      date: '2023-05-02', 
      activeUsers: 45, 
      totalSessions: 93, 
      newUsers: 12, 
      returningUsers: 33,
      avgSessionLength: 16.8,
      actionsPerSession: 28.7,
      bounceRate: 11.2
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API call
    analyticsService.getUserActivityData.mockResolvedValue(mockActivityData);
  });

  test('renders loading state initially', async () => {
    render(<UserActivityChart />);
    
    // Update to match the actual loading text in the component
    expect(screen.getByText(/Loading activity data/i)).toBeInTheDocument();
  });
  
  test('renders chart with activity data after loading', async () => {
    render(<UserActivityChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading activity data/i)).not.toBeInTheDocument();
    });
    
    // Check chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check UI controls are rendered - update to match what's actually in the component
    expect(screen.getByText(/User Activity Trends/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  test('changes time range when selector is changed', async () => {
    render(<UserActivityChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading activity data/i)).not.toBeInTheDocument();
      // Make sure the component is fully loaded with the dropdown visible
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    // Change time range to week
    const timeRangeSelector = screen.getByRole('combobox');
    fireEvent.change(timeRangeSelector, { target: { value: 'week' } });
    
    // Verify API is called with new time range
    expect(analyticsService.getUserActivityData).toHaveBeenCalledWith('week');
  });
  
  test('toggles metrics when checkboxes are clicked', async () => {
    render(<UserActivityChart />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading activity data/i)).not.toBeInTheDocument();
    });
    
    // Find metric checkboxes and toggle one
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    // Toggle the first checkbox
    fireEvent.click(checkboxes[0]);
    
    // Toggle it back
    fireEvent.click(checkboxes[0]);
  });
  
  test('displays error message when API call fails', async () => {
    // Mock API failure
    analyticsService.getUserActivityData.mockRejectedValue(new Error('Failed to fetch data'));
    
    render(<UserActivityChart />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load user activity data/i)).toBeInTheDocument();
    });
  });
}); 