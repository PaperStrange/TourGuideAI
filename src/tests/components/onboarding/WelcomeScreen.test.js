import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeScreen from '../../../features/beta-program/components/onboarding/WelcomeScreen';

describe('Welcome Screen Component', () => {
  // Sample profile data
  const profileData = {
    displayName: 'Alex Johnson',
    jobTitle: 'Travel Enthusiast',
    company: 'Acme Corp',
    profilePicture: 'https://example.com/profile.jpg',
    bio: 'I love discovering new places and cultures.'
  };
  
  test('renders the welcome screen with user information', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that welcome header is displayed
    expect(screen.getByText(/welcome to tourguideal beta/i)).toBeInTheDocument();
    
    // Check that user profile information is displayed
    expect(screen.getByText(new RegExp(profileData.displayName, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(profileData.jobTitle, 'i'))).toBeInTheDocument();
    
    // Check that call to action is present
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });
  
  test('displays profile image if provided', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that the profile image is displayed with the correct source
    const profileImage = screen.getByAltText(/profile picture/i);
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveAttribute('src', profileData.profilePicture);
  });
  
  test('displays default avatar if no profile image is provided', () => {
    const profileWithoutImage = { ...profileData, profilePicture: null };
    render(<WelcomeScreen profile={profileWithoutImage} onFinish={() => {}} />);
    
    // Check that the default avatar is displayed
    const defaultAvatar = screen.getByTestId('default-avatar');
    expect(defaultAvatar).toBeInTheDocument();
  });
  
  test('renders feature highlights section', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that feature highlights section is displayed
    expect(screen.getByText(/feature highlights/i)).toBeInTheDocument();
    
    // Check that at least some feature information is present
    expect(screen.getByText(/personalized routes/i)).toBeInTheDocument();
    expect(screen.getByText(/ai recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/community insights/i)).toBeInTheDocument();
  });
  
  test('renders beta program information', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that beta program information is displayed
    expect(screen.getByText(/as a beta tester/i)).toBeInTheDocument();
    expect(screen.getByText(/provide feedback/i)).toBeInTheDocument();
  });
  
  test('calls onFinish when get started button is clicked', () => {
    const handleFinish = jest.fn();
    render(<WelcomeScreen profile={profileData} onFinish={handleFinish} />);
    
    // Click the get started button
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    
    // Check that onFinish was called
    expect(handleFinish).toHaveBeenCalledTimes(1);
  });
  
  test('displays appropriate next steps', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that next steps section is displayed
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    
    // Check that specific next steps are listed
    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
    expect(screen.getByText(/explore the features/i)).toBeInTheDocument();
    expect(screen.getByText(/share your feedback/i)).toBeInTheDocument();
  });
  
  test('renders social sharing options', () => {
    render(<WelcomeScreen profile={profileData} onFinish={() => {}} />);
    
    // Check that social sharing section is displayed
    expect(screen.getByText(/share your beta access/i)).toBeInTheDocument();
    
    // Check that social sharing buttons are displayed
    expect(screen.getByLabelText(/share on twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on facebook/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on linkedin/i)).toBeInTheDocument();
  });
}); 