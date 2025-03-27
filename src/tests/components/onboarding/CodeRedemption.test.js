import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeRedemptionForm from '../../../features/beta-program/components/onboarding/CodeRedemptionForm';
import inviteCodeService from '../../../features/beta-program/services/InviteCodeService';

// Mock the invite code service
jest.mock('../../../features/beta-program/services/InviteCodeService', () => ({
  validateCode: jest.fn()
}));

describe('Code Redemption Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the code redemption form', () => {
    render(<CodeRedemptionForm initialCode="" onSubmit={() => {}} />);
    
    expect(screen.getByText(/enter your beta access code/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
  });

  test('initializes with provided code', () => {
    render(<CodeRedemptionForm initialCode="BETA123" onSubmit={() => {}} />);
    
    expect(screen.getByRole('textbox')).toHaveValue('BETA123');
  });

  test('validates required field', async () => {
    render(<CodeRedemptionForm initialCode="" onSubmit={() => {}} />);
    
    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Validation message should appear
    await waitFor(() => {
      expect(screen.getByText(/beta code is required/i)).toBeInTheDocument();
    });
  });

  test('handles valid code submission', async () => {
    // Mock successful validation
    inviteCodeService.validateCode.mockResolvedValue(true);
    
    const handleSubmit = jest.fn();
    render(<CodeRedemptionForm initialCode="" onSubmit={handleSubmit} />);
    
    // Enter code
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'VALID123' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for validation and submission
    await waitFor(() => {
      expect(inviteCodeService.validateCode).toHaveBeenCalledWith('VALID123');
      expect(handleSubmit).toHaveBeenCalledWith('VALID123');
    });
  });

  test('handles invalid code submission', async () => {
    // Mock failed validation
    inviteCodeService.validateCode.mockResolvedValue(false);
    
    const handleSubmit = jest.fn();
    render(<CodeRedemptionForm initialCode="" onSubmit={handleSubmit} />);
    
    // Enter code
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'INVALID123' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for validation
    await waitFor(() => {
      expect(inviteCodeService.validateCode).toHaveBeenCalledWith('INVALID123');
      expect(screen.getByText(/invalid or expired beta code/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  test('handles network error during submission', async () => {
    // Mock service error
    inviteCodeService.validateCode.mockRejectedValue(new Error('Network error'));
    
    const handleSubmit = jest.fn();
    render(<CodeRedemptionForm initialCode="" onSubmit={handleSubmit} />);
    
    // Enter code
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ERROR123' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByText(/error validating code/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  test('handles rate limiting for multiple attempts', async () => {
    // First mock successful validation, then rate limiting error
    inviteCodeService.validateCode
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('Rate limit exceeded'));
    
    const handleSubmit = jest.fn();
    render(<CodeRedemptionForm initialCode="" onSubmit={handleSubmit} />);
    
    // First attempt
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST123' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired beta code/i)).toBeInTheDocument();
    });
    
    // Second attempt
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST456' } });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
    });
  });
}); 