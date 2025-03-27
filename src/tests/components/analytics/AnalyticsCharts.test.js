import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  UserActivityChart,
  FeatureUsageChart,
  FeedbackSentimentChart,
  GeoDistributionChart,
  DeviceBreakdownChart
} from '../../../features/beta-program/components/analytics/AnalyticsCharts';

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: () => <div data-testid="area-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
    LineChart: () => <div data-testid="line-chart" />,
    PieChart: () => <div data-testid="pie-chart" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Area: () => <div data-testid="area" />,
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
    Pie: () => <div data-testid="pie" />,
  };
});

describe('Analytics Charts Components', () => {
  // Sample chart data
  const userActivityData = [
    { date: 'Mar 1', activeUsers: 42, newUsers: 8, sessions: 86 },
    { date: 'Mar 2', activeUsers: 45, newUsers: 12, sessions: 93 }
  ];
  
  const featureUsageData = [
    { name: 'Route Planning', usage: 78 },
    { name: 'Map Exploration', usage: 65 }
  ];
  
  const feedbackSentimentData = [
    { category: 'UI/UX', positive: 65, neutral: 25, negative: 10 },
    { category: 'Features', positive: 80, neutral: 15, negative: 5 }
  ];
  
  const geoDistributionData = [
    { country: 'United States', users: 65 },
    { country: 'United Kingdom', users: 30 },
    { country: 'Canada', users: 25 }
  ];
  
  const deviceBreakdownData = [
    { name: 'Desktop', value: 60 },
    { name: 'Mobile', value: 30 },
    { name: 'Tablet', value: 10 }
  ];

  test('renders UserActivityChart correctly', () => {
    render(<UserActivityChart data={userActivityData} />);
    
    // Check that chart container is rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check that appropriate chart type is used
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    
    // Check that chart title is displayed
    expect(screen.getByText(/user activity/i)).toBeInTheDocument();
    
    // Check that chart elements are included
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
  
  test('renders FeatureUsageChart correctly', () => {
    render(<FeatureUsageChart data={featureUsageData} />);
    
    // Check that chart container is rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check that appropriate chart type is used
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Check that chart title is displayed
    expect(screen.getByText(/feature usage/i)).toBeInTheDocument();
    
    // Check that chart elements are included
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
  
  test('renders FeedbackSentimentChart correctly', () => {
    render(<FeedbackSentimentChart data={feedbackSentimentData} />);
    
    // Check that chart container is rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check that appropriate chart type is used
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Check that chart title is displayed
    expect(screen.getByText(/feedback sentiment/i)).toBeInTheDocument();
    
    // Check that legend is rendered
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    
    // Check that sentiment categories are in the component
    expect(screen.getByText(/positive/i)).toBeInTheDocument();
    expect(screen.getByText(/neutral/i)).toBeInTheDocument();
    expect(screen.getByText(/negative/i)).toBeInTheDocument();
  });
  
  test('renders GeoDistributionChart correctly', () => {
    render(<GeoDistributionChart data={geoDistributionData} />);
    
    // Check that chart container is rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check that appropriate chart type is used
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Check that chart title is displayed
    expect(screen.getByText(/geographic distribution/i)).toBeInTheDocument();
    
    // Check that country data is present
    expect(screen.getByText(/united states/i)).toBeInTheDocument();
    expect(screen.getByText(/united kingdom/i)).toBeInTheDocument();
    expect(screen.getByText(/canada/i)).toBeInTheDocument();
  });
  
  test('renders DeviceBreakdownChart correctly', () => {
    render(<DeviceBreakdownChart data={deviceBreakdownData} />);
    
    // Check that chart container is rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check that appropriate chart type is used
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    
    // Check that chart title is displayed
    expect(screen.getByText(/device breakdown/i)).toBeInTheDocument();
    
    // Check that device types are listed
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/tablet/i)).toBeInTheDocument();
    
    // Check that values are displayed
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
  
  test('handles empty data gracefully in UserActivityChart', () => {
    render(<UserActivityChart data={[]} />);
    
    // Check that empty state message is displayed
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });
  
  test('handles empty data gracefully in FeatureUsageChart', () => {
    render(<FeatureUsageChart data={[]} />);
    
    // Check that empty state message is displayed
    expect(screen.getByText(/no feature usage data available/i)).toBeInTheDocument();
  });
  
  test('handles empty data gracefully in FeedbackSentimentChart', () => {
    render(<FeedbackSentimentChart data={[]} />);
    
    // Check that empty state message is displayed
    expect(screen.getByText(/no feedback data available/i)).toBeInTheDocument();
  });
  
  test('displays loading state when data is null', () => {
    render(<UserActivityChart data={null} />);
    
    // Check that loading indicator is shown
    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
  });
  
  test('applies custom colors to charts correctly', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    
    render(<FeatureUsageChart data={featureUsageData} colors={customColors} />);
    
    // Perform color check (implementation dependent)
    // This is a simplified check; actual implementation may vary
    expect(screen.getByTestId('custom-colors')).toHaveAttribute('data-colors', customColors.join(','));
  });
  
  test('UserActivityChart shows tooltips correctly', () => {
    render(<UserActivityChart data={userActivityData} />);
    
    // Check tooltip is properly configured
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-custom', 'true');
  });
}); 