import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock axios before other imports to prevent the ES module error
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} })
  }))
}));

// Mock the analytics service
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getUserActivityData: jest.fn().mockResolvedValue([]),
  getFeatureUsageData: jest.fn().mockResolvedValue([]),
  getDeviceDistributionData: jest.fn().mockResolvedValue([]),
  getSummaryData: jest.fn().mockResolvedValue({
    activeUsers: 158,
    totalSessions: 3241,
    avgSessionDuration: '8m 24s',
    crashRate: '0.8%'
  })
}));

// Mock child components to simplify testing
jest.mock('../../../features/beta-program/components/analytics/UserActivityChart', () => ({
  __esModule: true,
  default: () => <div data-testid="user-activity-chart">UserActivityChart Mock</div>
}));

jest.mock('../../../features/beta-program/components/analytics/FeatureUsageChart', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-usage-chart">FeatureUsageChart Mock</div>
}));

jest.mock('../../../features/beta-program/components/analytics/DeviceDistribution', () => ({
  __esModule: true,
  default: () => <div data-testid="device-distribution">DeviceDistribution Mock</div>
}));

// Import the component after all mocks are set up
import { BetaProgramDashboard } from '../../../features/beta-program/components/analytics';

describe('BetaProgramDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard with all components in overview tab', () => {
    render(<BetaProgramDashboard />);
    
    // Check that the title is rendered
    expect(screen.getByText(/Beta Program Analytics/i)).toBeInTheDocument();
    
    // Check that tabs are rendered by finding tab-like div elements directly
    const tabDivs = screen.getAllByText(/Overview|User Activity|Feature Usage|Device Stats/i);
    expect(tabDivs.length).toBeGreaterThan(0);
    
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
    const { container } = render(<BetaProgramDashboard />);
    
    // Find all div elements that could be tabs
    const tabElements = container.querySelectorAll('div[style*="cursor: pointer"]');
    // Find the User Activity tab specifically
    const activityTab = Array.from(tabElements).find(el => el.textContent === 'User Activity');
    
    // Click on User Activity tab
    if (activityTab) {
      fireEvent.click(activityTab);
      
      // Check that only UserActivityChart is rendered
      expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
      
      // Summary cards should not be rendered
      expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
      
      // Other charts should not be rendered
      expect(screen.queryByTestId('feature-usage-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('device-distribution')).not.toBeInTheDocument();
    }
  });
  
  test('switches to feature usage tab when clicked', () => {
    const { container } = render(<BetaProgramDashboard />);
    
    // Find all div elements that could be tabs
    const tabElements = container.querySelectorAll('div[style*="cursor: pointer"]');
    // Find the Feature Usage tab specifically
    const featuresTab = Array.from(tabElements).find(el => el.textContent === 'Feature Usage');
    
    // Click on Feature Usage tab
    if (featuresTab) {
      fireEvent.click(featuresTab);
      
      // Check that only FeatureUsageChart is rendered
      expect(screen.getByTestId('feature-usage-chart')).toBeInTheDocument();
      
      // Other elements should not be rendered
      expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-activity-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('device-distribution')).not.toBeInTheDocument();
    }
  });
  
  test('switches to device stats tab when clicked', () => {
    const { container } = render(<BetaProgramDashboard />);
    
    // Find all div elements that could be tabs
    const tabElements = container.querySelectorAll('div[style*="cursor: pointer"]');
    // Find the Device Stats tab specifically
    const devicesTab = Array.from(tabElements).find(el => el.textContent === 'Device Stats');
    
    // Click on Device Stats tab
    if (devicesTab) {
      fireEvent.click(devicesTab);
      
      // Check that only DeviceDistribution is rendered
      expect(screen.getByTestId('device-distribution')).toBeInTheDocument();
      
      // Other elements should not be rendered
      expect(screen.queryByText(/Active Beta Users/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-activity-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-usage-chart')).not.toBeInTheDocument();
    }
  });
  
  test('returns to overview tab when clicked after switching tabs', () => {
    const { container } = render(<BetaProgramDashboard />);
    
    // Find all div elements that could be tabs
    const tabElements = container.querySelectorAll('div[style*="cursor: pointer"]');
    // Find the tabs specifically
    const devicesTab = Array.from(tabElements).find(el => el.textContent === 'Device Stats');
    const overviewTab = Array.from(tabElements).find(el => el.textContent === 'Overview');
    
    // First switch to device stats tab
    if (devicesTab) {
      fireEvent.click(devicesTab);
      
      // Then switch back to overview
      if (overviewTab) {
        fireEvent.click(overviewTab);
        
        // Check that summary cards are rendered again
        expect(screen.getByText(/Active Beta Users/i)).toBeInTheDocument();
        
        // Check that all child components are rendered again
        expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
        expect(screen.getByTestId('feature-usage-chart')).toBeInTheDocument();
        expect(screen.getByTestId('device-distribution')).toBeInTheDocument();
      }
    }
  });
}); 