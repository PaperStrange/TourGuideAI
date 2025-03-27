import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreferencesSetup from '../../../features/beta-program/components/onboarding/PreferencesSetup';

describe('Preferences Setup Component', () => {
  // Initial preferences data
  const initialData = {
    notificationEmail: true,
    dataSharingLevel: 'minimal',
    tourPreferences: [],
    interestTopics: []
  };
  
  test('renders preferences setup form', () => {
    render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check main title is rendered
    expect(screen.getByText(/set your preferences/i)).toBeInTheDocument();
    
    // Check that continue button is rendered
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });
  
  test('renders notifications section', () => {
    render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check if notifications section is present - using getAllByText and selecting the first one
    const notificationElements = screen.getAllByText(/notifications/i);
    expect(notificationElements.length).toBeGreaterThan(0);
    
    // Check for the switch/checkbox element
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
  
  test('renders data sharing section', () => {
    render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check if data sharing section is present
    expect(screen.getByText(/data sharing level/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
  
  test('toggles notification preference', () => {
    render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Find the notification toggle - get the first checkbox which should be the notification toggle
    const checkboxes = screen.getAllByRole('checkbox');
    const notificationToggle = checkboxes[0];
    
    // Initial state should be checked based on initialData
    expect(notificationToggle).toBeChecked();
    
    // Toggle it off
    fireEvent.click(notificationToggle);
    
    // Check that it's unchecked now
    expect(notificationToggle).not.toBeChecked();
  });
  
  test('can select a radio button value', () => {
    render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Get all radio inputs
    const radioInputs = screen.getAllByRole('radio');
    
    // We should have at least one radio button for minimal and one for something else
    expect(radioInputs.length).toBeGreaterThan(1);
    
    // First should be selected (minimal based on initialData)
    expect(radioInputs[0]).toBeChecked();
    
    // Click the second one
    fireEvent.click(radioInputs[1]);
    
    // Check that second is now selected
    expect(radioInputs[1]).toBeChecked();
    expect(radioInputs[0]).not.toBeChecked();
  });
}); 