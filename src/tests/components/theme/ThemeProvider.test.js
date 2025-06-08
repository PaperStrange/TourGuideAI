/**
 * Theme Provider Tests
 * 
 * Tests to verify the Material UI ThemeProvider implementation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

// Test component that uses theme
const TestComponent = () => {
  const theme = useTheme();
  return (
    <div data-testid="themed-component">
      <div data-testid="primary-color">{theme.palette.primary.main}</div>
      <div data-testid="secondary-color">{theme.palette.secondary.main}</div>
    </div>
  );
};

describe('Theme Provider', () => {
  test('should provide theme to child components', () => {
    const testTheme = createTheme({
      palette: {
        primary: { main: '#2196f3' },
        secondary: { main: '#ff9800' },
      },
    });

    render(
      <ThemeProvider theme={testTheme}>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('themed-component')).toBeInTheDocument();
    expect(screen.getByTestId('primary-color')).toHaveTextContent('#2196f3');
    expect(screen.getByTestId('secondary-color')).toHaveTextContent('#ff9800');
  });

  test('should create theme with correct default colors', () => {
    const theme = createTheme({
      palette: {
        primary: { main: '#2196f3' },
        secondary: { main: '#ff9800' },
      },
    });
    
    expect(theme.palette.primary.main).toBe('#2196f3');
    expect(theme.palette.secondary.main).toBe('#ff9800');
  });

  test('should render without errors when theme is provided', () => {
    const theme = createTheme();
    
    render(
      <ThemeProvider theme={theme}>
        <div data-testid="test-content">Test Content</div>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
}); 