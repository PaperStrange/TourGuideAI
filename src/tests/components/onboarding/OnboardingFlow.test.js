import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingFlow from '../../../features/beta-program/components/onboarding/OnboardingFlow';
import inviteCodeService from '../../../features/beta-program/services/InviteCodeService';
import authService from '../../../features/beta-program/services/AuthService';
import { apiHelpers } from '../../../core/services/apiClient';

// Mock the services
jest.mock('../../../features/beta-program/services/InviteCodeService', () => ({
  validateCode: jest.fn()
}));

jest.mock('../../../features/beta-program/services/AuthService', () => ({
  updateUserProfile: jest.fn(),
  saveUserPreferences: jest.fn(),
  completeOnboarding: jest.fn()
}));

// Mock the API client used by CodeRedemptionForm
jest.mock('../../../core/services/apiClient', () => ({
  apiHelpers: {
    post: jest.fn(),
    get: jest.fn()
  }
}));

// Mock MUI components that might cause issues
jest.mock('@mui/material/TextField', () => ({ label, ...props }) => (
  <input 
    aria-label={label} 
    placeholder={label} 
    data-testid={`text-field-${label?.toLowerCase().replace(/\s+/g, '-')}`} 
    {...props} 
  />
));

jest.mock('@mui/material/FormControlLabel', () => {
  const mockReact = require('react');
  return ({ control, label, ...props }) => (
    <label>
      {mockReact.cloneElement(control, props)}
      <span>{label}</span>
    </label>
  );
});

describe('Onboarding Flow Integration', () => {
  // Setup mocks for each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    apiHelpers.post.mockResolvedValue({
      valid: true,
      userData: { id: 'test-user' }
    });
    
    apiHelpers.get.mockResolvedValue({
      available: true
    });
  });

  test('renders the first step of onboarding by default', () => {
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Check that the first step (Redeem Invite Code) is displayed initially
    expect(screen.getByText(/redeem invite code/i)).toBeInTheDocument();
  });

  test('initializes with initial step if provided', () => {
    render(<OnboardingFlow onComplete={() => {}} initialStep={1} />);
    
    // Should render the second step (Create Your Profile)
    expect(screen.getByText(/create your profile/i)).toBeInTheDocument();
  });

  test('handles code redemption and moves to next step', async () => {
    const mockOnSuccess = jest.fn();
    render(<OnboardingFlow onComplete={() => {}} />);
    
    // Find the code redemption form
    const codeInput = screen.getByPlaceholderText(/enter your invite code/i) || 
                      screen.getByRole('textbox');
    
    // Enter a valid code
    fireEvent.change(codeInput, { target: { value: 'VALID-CODE-123' } });
    
    // Submit the form
    const form = screen.getByRole('form') || 
                 codeInput.closest('form') || 
                 screen.getByText(/redeem invite code/i).closest('form');
    
    fireEvent.submit(form);
    
    // Wait for the redemption to be processed
    await waitFor(() => {
      expect(apiHelpers.post).toHaveBeenCalled();
    });
    
    // Verify step advance functionality is called
    await waitFor(() => {
      // Should move to the second step after successful code redemption
      expect(screen.getByText(/create your profile/i)).toBeInTheDocument();
    });
  });

  test('handles profile setup and moves to next step', async () => {
    // Start at profile setup step
    render(<OnboardingFlow onComplete={() => {}} initialStep={1} />);
    
    // Fill in profile fields
    const nameInput = screen.getByLabelText(/name/i) ||
                     screen.getByPlaceholderText(/name/i);
    const usernameInput = screen.getByLabelText(/username/i) ||
                         screen.getByPlaceholderText(/username/i);
    const emailInput = screen.getByLabelText(/email/i) ||
                      screen.getByPlaceholderText(/email/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Submit the profile form
    const submitButton = screen.getByRole('button', { name: /continue|next|save/i });
    fireEvent.click(submitButton);
    
    // Wait for the preferences step to appear
    await waitFor(() => {
      expect(screen.getByText(/set preferences/i)).toBeInTheDocument();
    });
  });

  test('handles preferences setup and moves to final step', async () => {
    // Start at preferences step
    render(<OnboardingFlow onComplete={() => {}} initialStep={2} />);
    
    // Make a preference change
    const switches = screen.getAllByRole('checkbox');
    if (switches.length > 0) {
      fireEvent.click(switches[0]);
    }
    
    // Submit the preferences form
    const submitButton = screen.getByRole('button', { name: /continue|next|save/i });
    fireEvent.click(submitButton);
    
    // Wait for the welcome step to appear
    await waitFor(() => {
      expect(screen.getByText(/get started/i)).toBeInTheDocument();
    });
  });

  test('completes onboarding flow when finish button is clicked', async () => {
    const handleComplete = jest.fn();
    
    // Start at welcome screen
    render(<OnboardingFlow onComplete={handleComplete} initialStep={3} />);
    
    // Click the get started button
    const getStartedButton = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(getStartedButton);
    
    // Verify the onComplete callback is called
    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalled();
    });
  });
}); 