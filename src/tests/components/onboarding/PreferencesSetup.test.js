import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreferencesSetup from '../../../features/beta-program/components/onboarding/PreferencesSetup';

describe('Preferences Setup Component', () => {
  // Initial preferences data
  const initialPreferences = {
    notifications: {
      email: true,
      push: true,
      digest: 'daily'
    },
    privacy: {
      dataSharing: true,
      analyticsCollection: true,
      feedbackSharing: true
    },
    features: {
      earlyAccess: true,
      betaFeatures: true,
      experimentalFeatures: false
    }
  };
  
  test('renders preferences setup form', () => {
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
    
    // Check main title is rendered
    expect(screen.getByText(/set your preferences/i)).toBeInTheDocument();
    
    // Check that continue button is rendered
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });
  
  test('renders notifications section', () => {
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
    
    // Check if notifications section is present
    expect(screen.getByText(/notification preferences/i)).toBeInTheDocument();
    
    // Check for notification toggle elements
    const switches = screen.getAllByRole('checkbox');
    expect(switches.length).toBeGreaterThan(0);
  });
  
  test('renders privacy section', () => {
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
    
    // Check if privacy section is present
    expect(screen.getByText(/privacy preferences/i)).toBeInTheDocument();
    
    // Check for data sharing toggle
    expect(screen.getByText(/usage data sharing/i)).toBeInTheDocument();
  });
  
  test('toggles notification preference', () => {
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
    
    // Find the email notifications toggle
    const emailToggle = screen.getAllByRole('checkbox')[0];
    
    // Initial state should be checked based on initialPreferences
    expect(emailToggle).toBeChecked();
    
    // Toggle it off
    fireEvent.click(emailToggle);
    
    // Check that it's unchecked now
    expect(emailToggle).not.toBeChecked();
  });
  
  test('selects different digest frequency', () => {
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
    
    // Get all radio inputs in the digest frequency section
    const radioInputs = screen.getAllByRole('radio');
    
    // Find the "Weekly" radio option by its label
    const weeklyRadio = screen.getByLabelText(/weekly/i);
    
    // Make sure it's not already selected
    expect(weeklyRadio).not.toBeChecked();
    
    // Select it
    fireEvent.click(weeklyRadio);
    
    // Check that it's now selected
    expect(weeklyRadio).toBeChecked();
  });
  
  test('calls onComplete with updated preferences when form is submitted', () => {
    const handleComplete = jest.fn();
    render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={handleComplete} />);
    
    // Find and click the continue button
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    // Check that onComplete was called with the preferences object
    expect(handleComplete).toHaveBeenCalledTimes(1);
    expect(handleComplete).toHaveBeenCalledWith(expect.objectContaining({
      notifications: expect.any(Object),
      privacy: expect.any(Object),
      features: expect.any(Object)
    }));
  });
}); 