import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UXMetricsEvaluation from '../../../beta-program/ux-audit/UXMetricsEvaluation';
import { uxMetricsMocks } from '../../mocks/uxAuditMocks';

// Mock chart libraries
jest.mock('chart.js', () => ({
  Chart: jest.fn(),
  registerables: []
}));

jest.mock('react-chartjs-2', () => ({
  Bar: (props) => (
    <div data-testid="bar-chart">
      <span>Bar Chart Component</span>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>
    </div>
  ),
  Line: (props) => (
    <div data-testid="line-chart">
      <span>Line Chart Component</span>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>
    </div>
  ),
  Pie: (props) => (
    <div data-testid="pie-chart">
      <span>Pie Chart Component</span>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>
    </div>
  )
}));

describe('UXMetricsEvaluation Component', () => {
  test('renders metrics dashboard with all expected sections', () => {
    render(<UXMetricsEvaluation metrics={uxMetricsMocks} />);
    
    // Should render title
    expect(screen.getByText('UX Metrics Evaluation')).toBeInTheDocument();
    
    // Should render all main sections
    expect(screen.getByTestId('time-on-page-section')).toBeInTheDocument();
    expect(screen.getByTestId('click-accuracy-section')).toBeInTheDocument();
    expect(screen.getByTestId('user-flow-section')).toBeInTheDocument();
    
    // Should render all charts
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('displays time on page metrics correctly', () => {
    render(<UXMetricsEvaluation metrics={uxMetricsMocks} />);
    
    // Check average time display
    expect(screen.getByText(`Average Time on Page: ${uxMetricsMocks.timeOnPage.average} seconds`)).toBeInTheDocument();
    
    // Check page breakdown
    uxMetricsMocks.timeOnPage.breakdown.forEach(item => {
      expect(screen.getByText(`${item.page}: ${item.average}s`)).toBeInTheDocument();
    });
  });

  test('displays click accuracy metrics correctly', () => {
    render(<UXMetricsEvaluation metrics={uxMetricsMocks} />);
    
    // Check average accuracy display
    expect(screen.getByText(`Average Click Accuracy: ${uxMetricsMocks.clickAccuracy.average * 100}%`)).toBeInTheDocument();
    
    // Check element breakdown
    uxMetricsMocks.clickAccuracy.breakdown.forEach(item => {
      expect(screen.getByText(`${item.element}: ${item.accuracy * 100}%`)).toBeInTheDocument();
    });
  });

  test('displays user flow metrics correctly', () => {
    render(<UXMetricsEvaluation metrics={uxMetricsMocks} />);
    
    // Check flow items
    uxMetricsMocks.userFlow.forEach(flow => {
      expect(screen.getByText(`${flow.from} → ${flow.to}: ${flow.count} users`)).toBeInTheDocument();
    });
  });

  test('date filter changes update the metrics displayed', async () => {
    // Mock API call function
    const mockFetchMetrics = jest.fn().mockResolvedValue({
      ...uxMetricsMocks,
      timeOnPage: {
        ...uxMetricsMocks.timeOnPage,
        average: 150 // Different value for testing updates
      }
    });
    
    render(<UXMetricsEvaluation metrics={uxMetricsMocks} fetchMetrics={mockFetchMetrics} />);
    
    const user = userEvent.setup();
    
    // Change date range
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    await user.clear(startDateInput);
    await user.type(startDateInput, '2023-04-01');
    
    await user.clear(endDateInput);
    await user.type(endDateInput, '2023-04-15');
    
    const applyButton = screen.getByRole('button', { name: 'Apply Filter' });
    await user.click(applyButton);
    
    // Check if API was called with correct dates
    expect(mockFetchMetrics).toHaveBeenCalledWith('2023-04-01', '2023-04-15');
    
    // Wait for update and check if new data is displayed
    await waitFor(() => {
      expect(screen.getByText('Average Time on Page: 150 seconds')).toBeInTheDocument();
    });
  });

  test('handles empty metrics data gracefully', () => {
    render(<UXMetricsEvaluation metrics={{
      timeOnPage: { average: 0, breakdown: [] },
      clickAccuracy: { average: 0, breakdown: [] },
      userFlow: []
    }} />);
    
    expect(screen.getByText('No time on page data available')).toBeInTheDocument();
    expect(screen.getByText('No click accuracy data available')).toBeInTheDocument();
    expect(screen.getByText('No user flow data available')).toBeInTheDocument();
  });

  test('export functionality works correctly', async () => {
    // Mock the export function
    const mockExportCSV = jest.fn();
    const mockExportPDF = jest.fn();
    
    render(
      <UXMetricsEvaluation 
        metrics={uxMetricsMocks}
        exportToCSV={mockExportCSV}
        exportToPDF={mockExportPDF}
      />
    );
    
    const user = userEvent.setup();
    
    // Test CSV export
    const csvButton = screen.getByRole('button', { name: 'Export to CSV' });
    await user.click(csvButton);
    expect(mockExportCSV).toHaveBeenCalledWith(uxMetricsMocks);
    
    // Test PDF export
    const pdfButton = screen.getByRole('button', { name: 'Export to PDF' });
    await user.click(pdfButton);
    expect(mockExportPDF).toHaveBeenCalledWith(uxMetricsMocks);
  });
}); 