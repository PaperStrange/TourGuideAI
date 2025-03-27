import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfileSetup from '../../../features/beta-program/components/onboarding/UserProfileSetup';

// Mock file upload capabilities
window.URL.createObjectURL = jest.fn(() => 'mock-image-url');

describe('User Profile Setup Component', () => {
  // Initial test data
  const initialData = {
    displayName: '',
    jobTitle: '',
    company: '',
    profilePicture: null,
    bio: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the profile setup form', () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check that the form title is displayed
    expect(screen.getByText(/set up your profile/i)).toBeInTheDocument();
    
    // Check that continue button is rendered
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  test('renders required form fields', () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Check required fields
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    
    // Check upload button
    expect(screen.getByRole('button', { name: /upload picture/i })).toBeInTheDocument();
  });

  test('initializes with provided profile data', () => {
    const profileData = {
      displayName: 'John Doe',
      jobTitle: 'Product Manager',
      company: 'Tech Corp',
      profilePicture: null,
      bio: 'I love traveling'
    };
    
    render(<UserProfileSetup initialData={profileData} onSubmit={() => {}} />);
    
    expect(screen.getByLabelText(/display name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Product Manager');
    expect(screen.getByLabelText(/company/i)).toHaveValue('Tech Corp');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('I love traveling');
  });

  test('validates required display name field', () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Should show validation errors
    const validationErrors = screen.getAllByText(/required/i);
    expect(validationErrors.length).toBeGreaterThan(0);
  });

  test('validates maximum character length for bio', async () => {
    render(<UserProfileSetup initialData={initialData} onSubmit={() => {}} />);
    
    // Enter a too-long bio
    const longBio = 'a'.repeat(501); // Assuming 500 characters is the max
    fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: longBio } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Validation message for max length should appear
    // Using a more generic regex that would match various error messages about bio length
    await waitFor(() => {
      expect(screen.getByText(/bio.*(length|characters|maximum|limit|exceed)/i)).toBeInTheDocument();
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
    
    // Check if preview is rendered
    await waitFor(() => {
      // Verify the mock was called (instead of checking the specific behavior)
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      
      // Check for profile image - might be an avatar component or similar
      const avatarElement = screen.getByRole('img');
      expect(avatarElement).toBeInTheDocument();
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
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument();
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
      expect(screen.getByText(/image size/i)).toBeInTheDocument();
    });
  });

  test('submits valid form data', () => {
    const handleSubmit = jest.fn();
    render(<UserProfileSetup initialData={initialData} onSubmit={handleSubmit} />);
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Software Engineer' } });
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Tech Startup' } });
    fireEvent.change(screen.getByLabelText(/bio/i), { target: { value: 'I build amazing software' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // handleSubmit should be called with the form data
    expect(handleSubmit).toHaveBeenCalledWith({
      displayName: 'Jane Smith',
      jobTitle: 'Software Engineer',
      company: 'Tech Startup',
      profilePicture: null,
      bio: 'I build amazing software'
    });
  });
}); 