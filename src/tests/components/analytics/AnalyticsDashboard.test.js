import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsDashboard from '../../../features/beta-program/components/analytics/AnalyticsDashboard';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';
import authService from '../../../features/beta-program/services/AuthService';

// Mock required services
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  initGA4: jest.fn(),
  getUserActivity: jest.fn(),
  getFeatureUsage: jest.fn(),
  getFeedbackSentiment: jest.fn(),
  getRetentionData: jest.fn(),
  getGeographicData: jest.fn(),
  getDeviceData: jest.fn(),
  getBrowserData: jest.fn(),
  getIssueData: jest.fn(),
  getAnomalies: jest.fn(),
  exportAnalytics: jest.fn()
}));

jest.mock('../../../features/beta-program/services/AuthService', () => ({
  isAdmin: jest.fn()
}));

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: () => <div data-testid="area-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
    LineChart: () => <div data-testid="line-chart" />,
    PieChart: () => <div data-testid="pie-chart" />
  };
});

describe('Analytics Dashboard Component', () => {
  // Mock data for analytics
  const mockUserActivity = [
    { date: 'Mar 1', activeUsers: 42, newUsers: 8, sessions: 86 },
    { date: 'Mar 2', activeUsers: 45, newUsers: 12, sessions: 93 }
  ];
  
  const mockFeatureUsage = [
    { name: 'Route Planning', usage: 78 },
    { name: 'Map Exploration', usage: 65 }
  ];
  
  const mockFeedbackSentiment = [
    { category: 'UI/UX', positive: 65, neutral: 25, negative: 10 },
    { category: 'Features', positive: 80, neutral: 15, negative: 5 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock admin status
    authService.isAdmin.mockResolvedValue(true);
    
    // Mock analytics data
    analyticsService.getUserActivity.mockResolvedValue(mockUserActivity);
    analyticsService.getFeatureUsage.mockResolvedValue(mockFeatureUsage);
    analyticsService.getFeedbackSentiment.mockResolvedValue(mockFeedbackSentiment);
    analyticsService.getRetentionData.mockResolvedValue([]);
    analyticsService.getGeographicData.mockResolvedValue([]);
    analyticsService.getDeviceData.mockResolvedValue([]);
    analyticsService.getBrowserData.mockResolvedValue([]);
    analyticsService.getIssueData.mockResolvedValue([]);
    analyticsService.getAnomalies.mockResolvedValue([]);
  });

  test('renders analytics dashboard for admin users', async () => {
    render(<AnalyticsDashboard />);
    
    // Check loading state is initially shown
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Check that dashboard content is rendered after loading
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/user activity/i)).toBeInTheDocument();
      expect(screen.getByText(/feature usage/i)).toBeInTheDocument();
      expect(screen.getByText(/feedback analysis/i)).toBeInTheDocument();
    });
    
    // Check that charts are rendered
    await waitFor(() => {
      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });
  });
  
  test('shows access denied for non-admin users', async () => {
    // Mock non-admin user
    authService.isAdmin.mockResolvedValue(false);
    
    render(<AnalyticsDashboard />);
    
    // Check that access denied message is shown
    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });
  });
  
  test('handles loading error state', async () => {
    // Mock error in analytics service
    analyticsService.getUserActivity.mockRejectedValue(new Error('Failed to load data'));
    
    render(<AnalyticsDashboard />);
    
    // Check that error message is shown
    await waitFor(() => {
      expect(screen.getByText(/error loading analytics data/i)).toBeInTheDocument();
    });
  });
  
  test('changes time range for analytics data', async () => {
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Change time range to 30 days
    fireEvent.click(screen.getByLabelText(/select time range/i));
    fireEvent.click(screen.getByText(/30 days/i));
    
    // Check that data is reloaded with new time range
    await waitFor(() => {
      expect(analyticsService.getUserActivity).toHaveBeenCalledWith('30days');
      expect(analyticsService.getFeatureUsage).toHaveBeenCalledWith('30days');
    });
  });
  
  test('switches between dashboard tabs', async () => {
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Initial tab should be Overview
    expect(screen.getByText(/user activity/i)).toBeInTheDocument();
    
    // Switch to Feedback tab
    fireEvent.click(screen.getByRole('tab', { name: /feedback/i }));
    
    // Check that feedback content is displayed
    await waitFor(() => {
      expect(screen.getByText(/sentiment analysis/i)).toBeInTheDocument();
      expect(screen.queryByText(/user activity/i)).not.toBeInTheDocument();
    });
    
    // Switch to Usage tab
    fireEvent.click(screen.getByRole('tab', { name: /usage/i }));
    
    // Check that usage content is displayed
    await waitFor(() => {
      expect(screen.getByText(/feature adoption/i)).toBeInTheDocument();
      expect(screen.queryByText(/sentiment analysis/i)).not.toBeInTheDocument();
    });
  });
  
  test('exports analytics data in different formats', async () => {
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Click export button
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    
    // Export as CSV
    fireEvent.click(screen.getByText(/csv/i));
    
    // Check that export function was called with correct format
    expect(analyticsService.exportAnalytics).toHaveBeenCalledWith('csv', expect.any(String));
    
    // Click export button again
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    
    // Export as PDF
    fireEvent.click(screen.getByText(/pdf/i));
    
    // Check that export function was called with correct format
    expect(analyticsService.exportAnalytics).toHaveBeenCalledWith('pdf', expect.any(String));
  });
  
  test('refreshes analytics data', async () => {
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Clear previous mock calls
    jest.clearAllMocks();
    
    // Click refresh button
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    
    // Check that data loading functions were called again
    await waitFor(() => {
      expect(analyticsService.getUserActivity).toHaveBeenCalled();
      expect(analyticsService.getFeatureUsage).toHaveBeenCalled();
      expect(analyticsService.getFeedbackSentiment).toHaveBeenCalled();
    });
  });
  
  test('displays correct summary metrics', async () => {
    // Mock additional summary data
    analyticsService.getUserActivity.mockResolvedValue({
      data: mockUserActivity,
      summary: {
        activeUsers: {
          current: 87,
          previous: 65
        },
        newUsers: {
          current: 24,
          previous: 18
        }
      }
    });
    
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load and check summary metrics
    await waitFor(() => {
      expect(screen.getByText(/87/)).toBeInTheDocument(); // Active users
      expect(screen.getByText(/33.8%/)).toBeInTheDocument(); // Increase percentage
      expect(screen.getByText(/24/)).toBeInTheDocument(); // New users
    });
  });
  
  test('renders data visualization components correctly', async () => {
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Check that charts are rendered
    expect(screen.getAllByTestId(/chart/)).toHaveLength(expect.any(Number));
  });
  
  test('shows no anomalies message when no anomalies detected', async () => {
    // Mock empty anomalies array
    analyticsService.getAnomalies.mockResolvedValue([]);
    
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Switch to Insights tab
    fireEvent.click(screen.getByRole('tab', { name: /insights/i }));
    
    // Check that no anomalies message is displayed
    await waitFor(() => {
      expect(screen.getByText(/no anomalies detected/i)).toBeInTheDocument();
    });
  });
  
  test('displays anomalies when detected', async () => {
    // Mock anomalies data
    const mockAnomalies = [
      { 
        id: 'a1', 
        metric: 'Session Duration', 
        value: 45.2, 
        expected: 32.1, 
        deviation: 40.8,
        timestamp: '2023-03-26T14:22:31Z',
        severity: 'high'
      }
    ];
    
    analyticsService.getAnomalies.mockResolvedValue(mockAnomalies);
    
    render(<AnalyticsDashboard />);
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/beta program analytics/i)).toBeInTheDocument();
    });
    
    // Switch to Insights tab
    fireEvent.click(screen.getByRole('tab', { name: /insights/i }));
    
    // Check that anomaly is displayed
    await waitFor(() => {
      expect(screen.getByText(/session duration/i)).toBeInTheDocument();
      expect(screen.getByText(/40.8%/i)).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });
  });
}); 