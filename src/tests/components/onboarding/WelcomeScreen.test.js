import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeScreen from '../../../features/beta-program/components/onboarding/WelcomeScreen';

describe('Welcome Screen Component', () => {
  // User name for testing
  const userName = 'Alex Johnson';
  
  test('renders the welcome screen with user name', () => {
    render(<WelcomeScreen userName={userName} onComplete={() => {}} />);
    
    // Check that welcome header is displayed
    expect(screen.getByText(/welcome to tourguideal beta/i)).toBeInTheDocument();
    
    // Check that user name is displayed
    expect(screen.getByText(new RegExp(userName, 'i'))).toBeInTheDocument();
    
    // Check that call to action is present
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });
  
  test('shows appropriate next steps', () => {
    render(<WelcomeScreen userName={userName} onComplete={() => {}} />);
    
    // Check that next steps section is displayed
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    
    // Check that specific next steps are listed (at least one should match)
    expect(screen.getByText(/explore the dashboard/i)).toBeInTheDocument();
  });
  
  test('shows key features section', () => {
    render(<WelcomeScreen userName={userName} onComplete={() => {}} />);
    
    // Check that key features section is displayed
    expect(screen.getByText(/key features to explore/i)).toBeInTheDocument();
    
    // Check for specific feature names
    expect(screen.getByText(/ai-powered chat/i)).toBeInTheDocument();
    expect(screen.getByText(/interactive maps/i)).toBeInTheDocument();
  });
  
  test('calls onComplete when Get Started button is clicked', () => {
    const handleComplete = jest.fn();
    render(<WelcomeScreen userName={userName} onComplete={handleComplete} />);
    
    // Find the get started button
    const getStartedButton = screen.getByRole('button', { name: /get started/i });
    
    // Click the button
    fireEvent.click(getStartedButton);
    
    // Check that the callback was called
    expect(handleComplete).toHaveBeenCalled();
  });
  
  test('displays loading state when loading prop is true', () => {
    render(<WelcomeScreen userName={userName} onComplete={() => {}} loading={true} />);
    
    // Check that loading indicator is displayed and button is disabled
    const getStartedButton = screen.getByRole('button', { name: /get started/i });
    expect(getStartedButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  test('displays error message when error prop is provided', () => {
    const errorMessage = 'Something went wrong!';
    render(<WelcomeScreen userName={userName} onComplete={() => {}} error={errorMessage} />);
    
    // Check that error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
}); 