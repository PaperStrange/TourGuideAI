import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfileSetup from '../../../features/beta-program/components/onboarding/UserProfileSetup';
import PreferencesSetup from '../../../features/beta-program/components/onboarding/PreferencesSetup';

describe('Onboarding Components', () => {
  // Profile Setup Tests
  describe('User Profile Setup', () => {
    const initialData = {
      displayName: '',
      jobTitle: '',
      company: '',
      profilePicture: null,
      bio: ''
    };

    test('renders profile setup form', () => {
      render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
      expect(screen.getByText(/set up your profile/i)).toBeInTheDocument();
    });

    test('initializes with provided data', () => {
      const profileData = {
        displayName: 'John Doe',
        jobTitle: 'Developer',
        company: 'Tech Co',
        profilePicture: null,
        bio: 'Bio text'
      };
      render(<UserProfileSetup initialData={profileData} onSubmit={() => {}} />);
      expect(screen.getByLabelText(/display name/i)).toHaveValue('John Doe');
    });
  });

  // Preferences Setup Tests
  describe('Preferences Setup', () => {
    const initialData = {
      notificationEmail: true,
      dataSharingLevel: 'minimal',
      tourPreferences: [],
      interestTopics: []
    };

    test('renders preferences form', () => {
      render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
      expect(screen.getByText(/set your preferences/i)).toBeInTheDocument();
    });

    test('renders data sharing section', () => {
      render(<PreferencesSetup initialData={initialData} onSubmit={() => {}} />);
      expect(screen.getByText(/data sharing level/i)).toBeInTheDocument();
    });
  });
}); 