import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BetaProgramDashboard } from '../../../features/beta-program/components/analytics';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock child components to simplify testing
jest.mock('../../../../src/features/beta-program/components/analytics/UserActivityChart', () => ({
  __esModule: true,
  default: () => <div data-testid="user-activity-chart">UserActivityChart Mock</div>
}));

jest.mock('../../../../src/features/beta-program/components/analytics/FeatureUsageChart', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-usage-chart">FeatureUsageChart Mock</div>
}));

jest.mock('../../../../src/features/beta-program/components/analytics/DeviceDistribution', () => ({
  __esModule: true,
  default: () => <div data-testid="device-distribution">DeviceDistribution Mock</div>
}));

// Mock the AnalyticsService
jest.mock('../../../../src/features/beta-program/services/AnalyticsService', () => ({
  getUserActivityData: jest.fn()
}));

describe('BetaProgramDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with all components in overview tab', () => {
    render(<BetaProgramDashboard />);
    
    // Check that the title is rendered
    expect(screen.getByText(/Beta Program Analytics/i)).toBeInTheDocument();
    
    // Check that tabs are rendered
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/User Activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Usage/i)).toBeInTheDocument();
    expect(screen.getByText(/Device Stats/i)).toBeInTheDocument();
    
    // Check that summary cards are rendered in overview
    expect(screen.getByText(/Active Beta Users/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg. Session Duration/i)).toBeInTheDocument();
    expect(screen.getByText(/Crash Rate/i)).toBeInTheDocument();
    
    // Check that child components are rendered in overview
    expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('feature-usage-chart')).toBeInTheDocument();
    expect(screen.getByTestId('device-distribution')).toBeInTheDocument();
  });
  
  test('switches to user activity tab when clicked', () => {
    render(<BetaProgramDashboard />);
    
    // Click on User Activity tab
    const activityTab = screen.getByText(/User Activity/i);
    fireEvent.click(activityTab);
    
    // Check that only UserActivityChart is rendered
    expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
    
    // Summary cards should not be rendered
    expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
    
    // Other charts should not be rendered
    expect(screen.queryByTestId('feature-usage-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-distribution')).not.toBeInTheDocument();
  });
  
  test('switches to feature usage tab when clicked', () => {
    render(<BetaProgramDashboard />);
    
    // Click on Feature Usage tab
    const featuresTab = screen.getByText(/Feature Usage/i);
    fireEvent.click(featuresTab);
    
    // Check that only FeatureUsageChart is rendered
    expect(screen.getByTestId('feature-usage-chart')).toBeInTheDocument();
    
    // Other elements should not be rendered
    expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-activity-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-distribution')).not.toBeInTheDocument();
  });
  
  test('switches to device stats tab when clicked', () => {
    render(<BetaProgramDashboard />);
    
    // Click on Device Stats tab
    const devicesTab = screen.getByText(/Device Stats/i);
    fireEvent.click(devicesTab);
    
    // Check that only DeviceDistribution is rendered
    expect(screen.getByTestId('device-distribution')).toBeInTheDocument();
    
    // Other elements should not be rendered
    expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-activity-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-usage-chart')).not.toBeInTheDocument();
  });
  
  test('returns to overview tab when clicked after switching tabs', () => {
    render(<BetaProgramDashboard />);
    
    // First switch to device stats tab
    const devicesTab = screen.getByText(/Device Stats/i);
    fireEvent.click(devicesTab);
    
    // Then switch back to overview
    const overviewTab = screen.getByText(/Overview/i);
    fireEvent.click(overviewTab);
    
    // Check that summary cards are rendered again
    expect(screen.getByText(/Active Beta Users/i)).toBeInTheDocument();
    
    // Check that all child components are rendered again
    expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('feature-usage-chart')).toBeInTheDocument();
    expect(screen.getByTestId('device-distribution')).toBeInTheDocument();
  });
}); 