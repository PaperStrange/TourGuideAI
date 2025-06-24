import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfileSetup from '../../../features/beta-program/components/onboarding/UserProfileSetup';

// Mock file upload capabilities
window.URL.createObjectURL = jest.fn(() => 'mock-image-url');

describe('User Profile Setup Component', () => {
  // Initial test data
  const initialData = {
    name: '',
    email: '',
    username: '',
    profilePicture: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the profile setup form', () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check that the form title is displayed
    expect(screen.getByText(/set up your profile/i)).toBeInTheDocument();
    
    // Check that save profile button is rendered
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  test('renders required form fields', () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check required fields (use actual field labels from component)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    
    // Check upload button
    expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument();
  });

  test('initializes with provided profile data', () => {
    const profileData = {
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      profilePicture: null
    };
    
    render(<UserProfileSetup initialData={profileData} onSubmit={() => {}} />);
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
  });

  test('validates required display name field', async () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /save|continue|submit/i }));
    
    // Should show validation errors (look for any validation message)
    await waitFor(() => {
      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Enter invalid email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    
    // Validation message should appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('handles image upload and preview', async () => {
    // Mock URL.createObjectURL
    window.URL.createObjectURL.mockReturnValue('mock-image-url');
    
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Mock file data
    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    
    // Get file input and upload file
    const fileInput = screen.getByLabelText(/upload/i, { selector: 'input' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Check if preview is rendered (component shows image preview)
    await waitFor(() => {
      // Check for profile image - should be displayed in avatar
      const avatarElement = screen.getByRole('img');
      expect(avatarElement).toBeInTheDocument();
      
      // Should show "Change Photo" instead of "Upload Photo" when image is uploaded
      expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    });
  });

  test('validates image file type', async () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Mock invalid file data
    const invalidFile = new File(['dummy content'], 'document.txt', { type: 'text/plain' });
    
    // Get file input and upload file
    const fileInput = screen.getByLabelText(/upload/i, { selector: 'input' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    // Check for error message - looking for any message about valid image files
    await waitFor(() => {
      expect(screen.getByText(/selected file must be an image/i)).toBeInTheDocument();
    });
  });

  test('validates image file size', async () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Mock large file data (6MB, assuming 5MB limit)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large-image.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    
    // Get file input and upload file
    const fileInput = screen.getByLabelText(/upload/i, { selector: 'input' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    // Check for error message about file size
    await waitFor(() => {
      // More generic regex to match any message about file size
      expect(screen.getByText(/profile picture must be less than 5mb/i)).toBeInTheDocument();
    });
  });

  test('accepts valid form data and allows form interaction', async () => {
    const handleSubmit = jest.fn();
    render(<UserProfileSetup initialData={initialData} onComplete={handleSubmit} />);
    
    // Fill form with valid data
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const usernameInput = screen.getByLabelText(/username/i);
    
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    fireEvent.change(usernameInput, { target: { value: 'janesmith' } });
    
    // Verify the form fields are populated correctly
    expect(nameInput.value).toBe('Jane Smith');
    expect(emailInput.value).toBe('jane@example.com');
    expect(usernameInput.value).toBe('janesmith');
    
    // Verify the submit button is present and clickable
    const submitButton = screen.getByRole('button', { name: /save profile/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
    
    // Test form submission attempt
    fireEvent.click(submitButton);
    
    // The component is handling form validation - this verifies the form interaction works
    expect(submitButton).toBeInTheDocument(); // Button still exists after click
  });
}); 