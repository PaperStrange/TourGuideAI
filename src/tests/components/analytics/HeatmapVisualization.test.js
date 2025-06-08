import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock the AnalyticsService
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getHeatmapPagesList: jest.fn(),
  getHeatmapData: jest.fn()
}));

// Import the actual component
import HeatmapVisualization from '../../../features/beta-program/components/analytics/HeatmapVisualization';

describe('HeatmapVisualization Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the API responses
    analyticsService.getHeatmapPagesList.mockResolvedValue([
      { id: 1, name: 'Home Page', path: '/' },
      { id: 2, name: 'About Page', path: '/about' }
    ]);
    
    analyticsService.getHeatmapData.mockResolvedValue({
      width: 1000,
      height: 800,
      points: [
        { x: 100, y: 200, value: 5 },
        { x: 300, y: 400, value: 10 }
      ]
    });
  });

  test('renders heatmap visualization component', async () => {
    const mockOnBack = jest.fn();
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('User Interaction Heatmap')).toBeInTheDocument();
    });
  });

  test('calls onBack when back button is clicked', async () => {
    const mockOnBack = jest.fn();
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for the component to load and find the back button
    await waitFor(() => {
      const backButton = screen.getByText('Back to Dashboard');
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  test('allows changing visualization type', async () => {
    const mockOnBack = jest.fn();
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('User Interaction Heatmap')).toBeInTheDocument();
    });
    
    // Find the type selector - it's the second select element
    const selects = screen.getAllByRole('combobox');
    const typeSelector = selects[1]; // Second select is the type selector
    fireEvent.change(typeSelector, { target: { value: 'moves' } });
    
    // After changing the type, it should reload data and show the component again
    await waitFor(() => {
      expect(screen.getByText('User Interaction Heatmap')).toBeInTheDocument();
    });
  });
}); 