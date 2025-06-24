import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the apiClient to prevent axios import issues
jest.mock('../../../core/services/apiClient', () => ({
  apiHelpers: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

import UserProfileSetup from '../../../features/beta-program/components/onboarding/UserProfileSetup';
import PreferencesSetup from '../../../features/beta-program/components/onboarding/PreferencesSetup';

describe('Onboarding Components', () => {
  // Profile Setup Tests
  describe('User Profile Setup', () => {
    const initialData = {
      name: '',
      email: '',
      username: '',
      profilePicture: null
    };

    test('renders profile setup form', () => {
      render(<UserProfileSetup initialData={initialData} onComplete={() => {}} />);
      expect(screen.getByText(/create your profile/i)).toBeInTheDocument();
    });

    test('initializes with provided data', () => {
      const profileData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        profilePicture: null
      };
      render(<UserProfileSetup initialData={profileData} onComplete={() => {}} />);
      
      // Check that fields are initialized with provided data
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
    });
    
    test('validates form fields', () => {
      render(<UserProfileSetup initialData={initialData} onComplete={() => {}} />);
      
      // Try to submit with empty fields
      const submitButton = screen.getByRole('button', { name: /continue|next|save/i });
      fireEvent.click(submitButton);
      
      // Should show some validation message
      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    });
  });

  // Preferences Setup Tests
  describe('Preferences Setup', () => {
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

    test('renders preferences form', () => {
      render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
      expect(screen.getByText(/set your preferences/i)).toBeInTheDocument();
    });

    test('renders notification preferences section', () => {
      render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={() => {}} />);
      expect(screen.getByText(/notification preferences/i)).toBeInTheDocument();
    });
    
    test('submits form with preferences data', () => {
      const handleComplete = jest.fn();
      render(<PreferencesSetup initialPreferences={initialPreferences} onComplete={handleComplete} />);
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save preferences/i });
      fireEvent.click(submitButton);
      
      // Check that onComplete was called with the preferences data
      expect(handleComplete).toHaveBeenCalledTimes(1);
      expect(handleComplete).toHaveBeenCalledWith(expect.objectContaining({
        notifications: expect.any(Object),
        privacy: expect.any(Object),
        features: expect.any(Object)
      }));
    });
  });
}); 