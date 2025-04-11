import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeatmapVisualization from '../../../features/beta-program/components/analytics/HeatmapVisualization';
import analyticsService from '../../../features/beta-program/services/analytics/AnalyticsService';

// Mock canvas context methods
const mockCanvasContext = {
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  fillStyle: '',
  font: '',
  textAlign: '',
  fillText: jest.fn(),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  globalCompositeOperation: ''
};

// Mock HTMLCanvasElement properties and methods
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  writable: true,
  value: 1280
});
Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  writable: true,
  value: 720
});

// Mock canvas toDataURL for export functionality
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockImageData');

// Mock the document.createElement and appendChild methods for the export function
document.createElement = jest.fn().mockImplementation((tag) => {
  if (tag === 'a') {
    return {
      download: '',
      href: '',
      click: jest.fn(),
    };
  }
  return {};
});
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock the AnalyticsService
jest.mock('../../../features/beta-program/services/analytics/AnalyticsService', () => ({
  getHeatmapPagesList: jest.fn(),
  getHeatmapData: jest.fn()
}));

describe('HeatmapVisualization Component', () => {
  // Mock data for heatmap pages list
  const mockPagesList = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
    { id: 'map', name: 'Map View', path: '/map' },
    { id: 'settings', name: 'Settings', path: '/settings' }
  ];

  // Mock data for heatmap visualization
  const mockHeatmapData = {
    data: [
      { x: 150, y: 200, value: 45 },
      { x: 300, y: 200, value: 32 },
      { x: 450, y: 350, value: 28 }
    ],
    page: 'dashboard',
    type: 'clicks',
    viewport: { width: 1280, height: 720 },
    pageUrl: '/dashboard',
    screenshot: 'https://via.placeholder.com/1280x720?text=Screenshot+of+dashboard+page'
  };

  // Mock onBack function
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API calls
    analyticsService.getHeatmapPagesList.mockResolvedValue(mockPagesList);
    analyticsService.getHeatmapData.mockResolvedValue(mockHeatmapData);
  });

  test('renders loading state initially', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    expect(screen.getByText(/Loading heatmap data/i)).toBeInTheDocument();
  });
  
  test('renders heatmap with data after loading', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Check UI elements are rendered
    expect(screen.getByText(/User Interaction Heatmap/i)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBe(2);
    
    // Check canvas is rendered
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    // Check controls for heatmap settings
    expect(screen.getByText(/Intensity/i)).toBeInTheDocument();
    expect(screen.getByText(/Radius/i)).toBeInTheDocument();
  });
  
  test('changes page when selector is changed', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Select a different page (Map View)
    const pageSelector = screen.getAllByRole('combobox')[0];
    fireEvent.change(pageSelector, { target: { value: 'map' } });
    
    // Verify API is called with new page
    expect(analyticsService.getHeatmapData).toHaveBeenCalledWith('map', expect.any(String));
  });
  
  test('changes heatmap type when selector is changed', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Change heatmap type to moves
    const typeSelector = screen.getAllByRole('combobox')[1];
    fireEvent.change(typeSelector, { target: { value: 'moves' } });
    
    // Verify API is called with new type
    expect(analyticsService.getHeatmapData).toHaveBeenCalledWith(expect.any(String), 'moves');
  });
  
  test('changes intensity when slider is moved', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Find the intensity slider
    const intensitySlider = screen.getAllByRole('slider')[0];
    fireEvent.change(intensitySlider, { target: { value: '0.5' } });
    
    // Check intensity value is updated (visual check)
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });
  
  test('changes radius when slider is moved', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Find the radius slider
    const radiusSlider = screen.getAllByRole('slider')[1];
    fireEvent.change(radiusSlider, { target: { value: '20' } });
    
    // Check radius value is updated (visual check)
    expect(screen.getByText('20px')).toBeInTheDocument();
  });
  
  test('calls onBack when back button is clicked', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Find and click the back button
    const backButton = screen.getByText(/Back to Dashboard/i);
    fireEvent.click(backButton);
    
    // Verify onBack function is called
    expect(mockOnBack).toHaveBeenCalled();
  });
  
  test('handles export functionality when export button is clicked', async () => {
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading heatmap data/i)).not.toBeInTheDocument();
    });
    
    // Find and click the export button
    const exportButton = screen.getByText(/Export/i);
    fireEvent.click(exportButton);
    
    // Verify export functionality
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });
  
  test('displays error message when API call fails', async () => {
    // Mock API failure
    analyticsService.getHeatmapPagesList.mockRejectedValue(new Error('Failed to fetch data'));
    
    render(<HeatmapVisualization onBack={mockOnBack} />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load pages list/i)).toBeInTheDocument();
    });
    
    // Check back button is rendered
    const backButton = screen.getByText(/Back to Analytics/i);
    expect(backButton).toBeInTheDocument();
  });
}); 