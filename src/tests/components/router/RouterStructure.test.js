/**
 * React Router Structure Tests
 * 
 * Tests to verify the structure of React Router in the application
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../../../App';

// Mock fetch for backend health check
global.fetch = jest.fn(() => Promise.reject(new Error('Health check failed')));

// Mock components used in the App
jest.mock('../../../components/common/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

jest.mock('../../../pages/HomePage', () => {
  return function MockHomePage() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('../../../contexts/LoadingContext', () => ({
  LoadingProvider: function MockLoadingProvider({ children }) {
    return <div data-testid="loading-provider">{children}</div>;
  },
  useLoading: () => ({
    isLoading: false,
    setLoading: jest.fn()
  })
}));

describe('Router Structure', () => {
  test('should render Routes properly', () => {
    const theme = createTheme();
    
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    );
    
    // Check that the App component renders
    expect(screen.getByTestId('loading-provider')).toBeInTheDocument();
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    
    // Since we're just testing the Router structure, we don't need to test
    // the backend availability fallback UI in this test
  });
}); 