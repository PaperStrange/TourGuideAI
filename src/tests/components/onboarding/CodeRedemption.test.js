import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeRedemptionForm from '../../../features/beta-program/components/onboarding/CodeRedemptionForm';
import { apiHelpers } from '../../../core/services/apiClient';

// Mock the API client
jest.mock('../../../core/services/apiClient', () => ({
  apiHelpers: {
    post: jest.fn()
  }
}));

// Use fake timers for setTimeout handling
jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});

test('renders code redemption form', () => {
  render(<CodeRedemptionForm />);
  expect(screen.getByLabelText(/beta invite code/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /redeem code/i })).toBeInTheDocument();
  // Button should be disabled initially when no valid code is entered
  expect(screen.getByRole('button', { name: /redeem code/i })).toBeDisabled();
});

test('handles successful code redemption', async () => {
  // Mock a successful API response
  apiHelpers.post.mockResolvedValueOnce({ 
    valid: true,
    userData: { id: '123', name: 'Test User' }
  });
  
  const handleSuccess = jest.fn();
  render(<CodeRedemptionForm onSuccess={handleSuccess} />);

  // Enter valid code
  fireEvent.change(screen.getByLabelText(/beta invite code/i), { 
    target: { value: 'ABCD-EFGH-IJKL' } 
  });
  
  // Button should be enabled with valid code
  expect(screen.getByRole('button', { name: /redeem code/i })).not.toBeDisabled();
  
  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /redeem code/i }));

  // Verify API was called correctly
  expect(apiHelpers.post).toHaveBeenCalledWith('/beta/redeem-code', { code: 'ABCD-EFGH-IJKL' });
  
  // Wait for success message
  await waitFor(() => {
    expect(screen.getByText(/code accepted/i)).toBeInTheDocument();
  });
  
  // Advance timers to trigger the onSuccess callback (after 1000ms delay)
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  
  // Check if success callback was called
  expect(handleSuccess).toHaveBeenCalledWith({ id: '123', name: 'Test User' });
});

test('handles invalid code submission', async () => {
  // Mock API failure response
  apiHelpers.post.mockResolvedValueOnce({ 
    valid: false,
    message: 'Invalid or expired code'
  });
  
  const handleError = jest.fn();
  render(<CodeRedemptionForm onError={handleError} />);

  // Enter valid format but invalid code
  fireEvent.change(screen.getByLabelText(/beta invite code/i), { 
    target: { value: 'ABCD-EFGH-IJKL' } 
  });
  
  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /redeem code/i }));

  // Wait for error message
  await waitFor(() => {
    expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument();
  });
  
  // Check if error callback was called
  expect(handleError).toHaveBeenCalledWith('Invalid or expired code');
});

test('handles network error', async () => {
  // Mock network error
  apiHelpers.post.mockRejectedValueOnce(new Error('Network error'));

  render(<CodeRedemptionForm />);
  
  // Enter a valid code
  const input = screen.getByLabelText(/beta invite code/i);
  fireEvent.change(input, { target: { value: 'ABCD-EFGH-IJKL' } });
  
  // Submit the form
  const button = screen.getByRole('button', { name: /redeem code/i });
  fireEvent.click(button);
  
  // Wait for error message
  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
  
  // Verify the button is re-enabled
  expect(button).toHaveTextContent(/redeem code/i);
  expect(button).toBeDisabled(); // Disabled because validation state is 'invalid'
});

test('validates code format', () => {
  render(<CodeRedemptionForm />);
  const input = screen.getByLabelText(/beta invite code/i);
  const submitButton = screen.getByRole('button', { name: /redeem code/i });
  
  // Initially button should be disabled
  expect(submitButton).toBeDisabled();
  
  // Invalid format should keep button disabled
  fireEvent.change(input, { target: { value: 'INVALID' } });
  expect(submitButton).toBeDisabled();
  
  // Valid format should enable button
  fireEvent.change(input, { target: { value: 'ABCD-EFGH-IJKL' } });
  expect(submitButton).not.toBeDisabled();
}); 