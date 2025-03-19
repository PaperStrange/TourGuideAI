import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../../pages/ChatPage';

// Mock the openaiApi module
jest.mock('../../api/openaiApi', () => ({
  generateRoute: jest.fn().mockResolvedValue({
    id: 'route1',
    name: 'Rome 3-day Tour',
    destination: 'Rome',
    sites_included_in_routes: ['Colosseum', 'Vatican', 'Trevi Fountain']
  }),
  generateRandomRoute: jest.fn().mockResolvedValue({
    id: 'random1',
    name: 'Random Paris Tour',
    destination: 'Paris',
    sites_included_in_routes: ['Eiffel Tower', 'Louvre', 'Notre Dame']
  }),
  recognizeIntent: jest.fn().mockResolvedValue({
    arrival: 'Rome',
    departure: '',
    travel_duration: '3 days',
    transportation_prefer: ''
  })
}));

// Mock the route navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('ChatPage Component', () => {
  const renderWithRouter = (ui) => {
    return render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    );
  };

  test('should render page title', () => {
    renderWithRouter(<ChatPage />);
    expect(screen.getByText('Your personal tour guide!')).toBeInTheDocument();
  });

  test('should render input box', () => {
    renderWithRouter(<ChatPage />);
    expect(screen.getByPlaceholderText('Enter your travel details...')).toBeInTheDocument();
  });

  test('should render generate button with correct text', () => {
    renderWithRouter(<ChatPage />);
    expect(screen.getByText('Generate your first plan!')).toBeInTheDocument();
  });

  test('should render feel lucky button with correct text', () => {
    renderWithRouter(<ChatPage />);
    expect(screen.getByText('Feel lucky?')).toBeInTheDocument();
  });

  test('buttons should be disabled when input is empty', () => {
    renderWithRouter(<ChatPage />);
    
    const generateButton = screen.getByText('Generate your first plan!');
    const luckyButton = screen.getByText('Feel lucky?');
    
    expect(generateButton).toBeDisabled();
    expect(luckyButton).toBeDisabled();
  });

  test('buttons should be enabled when input has text', () => {
    renderWithRouter(<ChatPage />);
    
    const inputBox = screen.getByPlaceholderText('Enter your travel details...');
    fireEvent.change(inputBox, { target: { value: 'Show me a 3-day tour of Rome' } });
    
    const generateButton = screen.getByText('Generate your first plan!');
    const luckyButton = screen.getByText('Feel lucky?');
    
    expect(generateButton).not.toBeDisabled();
    expect(luckyButton).not.toBeDisabled();
  });

  test('should show loading state when generate button is clicked', async () => {
    renderWithRouter(<ChatPage />);
    
    const inputBox = screen.getByPlaceholderText('Enter your travel details...');
    fireEvent.change(inputBox, { target: { value: 'Show me a 3-day tour of Rome' } });
    
    const generateButton = screen.getByText('Generate your first plan!');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating your travel plan...')).toBeInTheDocument();
    });
  });

  test('should show loading state when feel lucky button is clicked', async () => {
    renderWithRouter(<ChatPage />);
    
    const inputBox = screen.getByPlaceholderText('Enter your travel details...');
    fireEvent.change(inputBox, { target: { value: 'Show me a 3-day tour of Rome' } });
    
    const luckyButton = screen.getByText('Feel lucky?');
    fireEvent.click(luckyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating a surprise journey...')).toBeInTheDocument();
    });
  });

  test('should render rankboard with top routes', () => {
    renderWithRouter(<ChatPage />);
    
    // Check for rankboard title
    expect(screen.getByText('Top Routes')).toBeInTheDocument();
    
    // Check for medal positions
    expect(screen.getAllByText(/upvotes/i).length).toBeGreaterThan(0);
  });

  test('should render the API status component', () => {
    renderWithRouter(<ChatPage />);
    
    // The ApiStatus component should be included
    expect(screen.getByText(/API Status/i)).toBeInTheDocument();
  });
}); 