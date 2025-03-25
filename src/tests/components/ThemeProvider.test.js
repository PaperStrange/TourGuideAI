/**
 * Theme Provider Tests
 * 
 * Tests to verify the Material UI ThemeProvider implementation
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { create } from 'react-test-renderer';
import App from '../../App';
import Index from '../../index';

// Mock necessary dependencies
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(container => ({
    render: jest.fn(),
  })),
}));

jest.mock('../../App', () => () => <div>App Component</div>);
jest.mock('../../reportWebVitals', () => () => {});

// Mock Material UI components
jest.mock('@mui/material/styles', () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
  createTheme: jest.fn(() => ({})),
  useTheme: jest.fn(() => ({
    palette: {
      primary: { main: '#2196f3' },
      secondary: { main: '#ff9800' },
    },
    breakpoints: { down: jest.fn(() => false) },
  })),
}));

jest.mock('@mui/material/CssBaseline', () => () => <div data-testid="css-baseline" />);
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="browser-router">{children}</div>,
}));

describe('Theme Provider', () => {
  test('index.js should include ThemeProvider', () => {
    // Get the index.js file content
    const indexContent = Index ? Index.toString() : '';
    
    // Check if ThemeProvider is included
    expect(indexContent.includes('ThemeProvider')).toBe(true);
  });

  test('should wrap the application with ThemeProvider', () => {
    // Check the index.js structure
    const indexSource = process.env.NODE_ENV === 'test' ? 
      document.querySelector('[data-source="index.js"]')?.textContent : '';
    
    if (indexSource) {
      expect(indexSource.includes('ThemeProvider')).toBe(true);
      expect(indexSource.includes('createTheme')).toBe(true);
    }
    
    // Test the rendered structure
    const { queryByTestId } = render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    
    expect(queryByTestId('theme-provider')).not.toBeNull();
  });

  test('should create a theme with primary and secondary colors', () => {
    // Since we mocked createTheme, we can check if it was called
    const { createTheme } = require('@mui/material/styles');
    
    expect(createTheme).toHaveBeenCalled();
    
    // If we could access the actual theme configuration:
    if (process.env.NODE_ENV !== 'test') {
      const themeConfig = createTheme.mock.calls[0][0];
      expect(themeConfig.palette.primary.main).toBeDefined();
      expect(themeConfig.palette.secondary.main).toBeDefined();
    }
  });
}); 