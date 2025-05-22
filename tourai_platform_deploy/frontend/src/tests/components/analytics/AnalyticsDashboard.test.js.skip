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
  detectAnomalies: jest.fn()
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
    analyticsService.detectAnomalies.mockResolvedValue([]);
  });

  test('renders analytics dashboard for admin users', async () => {
    render(<AnalyticsDashboard />);
    
    // Check loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Check that dashboard content is rendered after loading
    await waitFor(() => {
      expect(screen.getByText(/Beta Analytics Dashboard/i)).toBeInTheDocument();
    });
  });
  
  test('shows access denied for non-admin users', async () => {
    // Mock non-admin user
    authService.isAdmin.mockResolvedValue(false);
    
    render(<AnalyticsDashboard />);
    
    // Check that access denied message is shown
    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
    });
  });
  
  test('handles loading error state', async () => {
    // Mock error in analytics service
    analyticsService.getUserActivity.mockRejectedValue(new Error('Failed to load data'));
    
    render(<AnalyticsDashboard />);
    
    // Check that error message is shown
    await waitFor(() => {
      expect(screen.getByText(/failed to load analytics data/i)).toBeInTheDocument();
    });
  });
}); 