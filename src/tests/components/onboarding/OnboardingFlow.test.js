import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingFlow from '../../../features/beta-program/components/OnboardingFlow';
import inviteCodeService from '../../../features/beta-program/services/InviteCodeService';
import authService from '../../../features/beta-program/services/AuthService';

// Mock the services
jest.mock('../../../features/beta-program/services/InviteCodeService', () => ({
  validateCode: jest.fn()
}));

jest.mock('../../../features/beta-program/services/AuthService', () => ({
  updateUserProfile: jest.fn(),
  saveUserPreferences: jest.fn(),
  completeOnboarding: jest.fn()
}));

describe('Onboarding Flow Integration', () => {
  // Setup mocks for each test
  beforeEach(() => {
    jest.clearAllMocks();
    inviteCodeService.validateCode.mockResolvedValue(true);
    authService.updateUserProfile.mockResolvedValue({ success: true });
    authService.saveUserPreferences.mockResolvedValue({ success: true });
    authService.completeOnboarding.mockResolvedValue({ success: true });
  });

  test('renders the first step of onboarding by default', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Check that the code redemption step is displayed initially
    expect(screen.getByText(/redeem beta code/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your beta access code/i)).toBeInTheDocument();
  });

  test('initializes with provided beta code', () => {
    render(<OnboardingFlow onComplete={() => {}} initialCode="TEST123" />);
    
    // Check that the code input is pre-filled
    expect(screen.getByRole('textbox')).toHaveValue('TEST123');
  });

  test('validates beta code and proceeds to next step', async () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Enter and submit a valid code
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'VALID123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for validation and step transition
    await waitFor(() => {
      expect(inviteCodeService.validateCode).toHaveBeenCalledWith('VALID123');
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid beta code', async () => {
    // Mock invalid code
    inviteCodeService.validateCode.mockResolvedValue(false);
    
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Enter and submit an invalid code
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'INVALID123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired beta code/i)).toBeInTheDocument();
      // Should not proceed to next step
      expect(screen.queryByText(/setup your profile/i)).not.toBeInTheDocument();
    });
  });

  test('completes entire onboarding flow end-to-end', async () => {
    const handleComplete = jest.fn();
    render(<OnboardingFlow onComplete={handleComplete} />);
    
    // Step 1: Code Redemption
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'VALID123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for transition to profile setup
    await waitFor(() => {
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
    
    // Step 2: Profile Setup
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Developer' } });
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Tech Co' } });
    fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: 'I build things' } });
    
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Wait for transition to preferences setup
    await waitFor(() => {
      expect(screen.getByText(/set preferences/i)).toBeInTheDocument();
    });
    
    // Step 3: Preferences Setup
    // Select some interests
    const historyTopic = screen.getByLabelText(/history/i);
    const artTopic = screen.getByLabelText(/art/i);
    fireEvent.click(historyTopic);
    fireEvent.click(artTopic);
    
    // Change data sharing level
    const moderateRadio = screen.getByLabelText(/moderate/i);
    fireEvent.click(moderateRadio);
    
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Wait for transition to welcome screen
    await waitFor(() => {
      expect(screen.getByText(/welcome to/i)).toBeInTheDocument();
    });
    
    // Step 4: Welcome Screen
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    
    // Check that onComplete was called
    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalledTimes(1);
    });
  });

  test('persists data between steps', async () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Step 1: Code Redemption
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'VALID123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for transition to profile setup
    await waitFor(() => {
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
    
    // Step 2: Fill profile but don't submit yet
    const displayName = 'John Doe';
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: displayName } });
    
    // Go back to previous step
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    
    // Wait for transition back to code redemption
    await waitFor(() => {
      expect(screen.getByText(/enter your beta access code/i)).toBeInTheDocument();
    });
    
    // Go forward again to profile setup
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Check that profile data was persisted
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue(displayName);
    });
  });

  test('handles navigation between steps using back and next buttons', async () => {
    render(<OnboardingFlow onComplete={() => {}} initialCode="TEST123" />);
    
    // Move to step 2 (profile setup)
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    await waitFor(() => {
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
    
    // Go back to step 1
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => {
      expect(screen.getByText(/enter your beta access code/i)).toBeInTheDocument();
    });
    
    // Move to step 2 again
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
    
    // Fill required fields and move to step 3
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'John Doe' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/set preferences/i)).toBeInTheDocument();
    });
    
    // Go back to step 2
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await waitFor(() => {
      expect(screen.getByText(/setup your profile/i)).toBeInTheDocument();
    });
  });
}); 