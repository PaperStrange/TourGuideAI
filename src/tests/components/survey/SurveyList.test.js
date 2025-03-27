import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SurveyList from '../../../features/beta-program/components/survey/SurveyList';

describe('Survey List Component', () => {
  // Sample surveys data
  const surveys = [
    {
      id: 'survey_1',
      title: 'Beta Program Feedback Survey',
      description: 'Help us improve the beta program by sharing your feedback',
      questions: [
        { id: 'q1', title: 'How satisfied are you with the beta program so far?', type: 'rating' },
        { id: 'q2', title: 'What features would you like to see improved?', type: 'checkbox' }
      ],
      status: 'active',
      responses: 12,
      createdAt: '2023-03-25T14:32:01Z',
      updatedAt: '2023-03-26T09:15:22Z'
    },
    {
      id: 'survey_2',
      title: 'Travel Preferences Survey',
      description: 'Tell us about your travel preferences to help us improve tour recommendations',
      questions: [
        { id: 'q1', title: 'What types of destinations do you prefer?', type: 'checkbox' },
        { id: 'q2', title: 'How do you typically plan your trips?', type: 'radio' },
      ],
      status: 'draft',
      responses: 0,
      createdAt: '2023-03-28T11:45:33Z',
      updatedAt: '2023-03-28T11:45:33Z'
    }
  ];
  
  test('renders the survey list with surveys', () => {
    render(<SurveyList />);
    
    // Initial loading state
    expect(screen.getByText(/loading surveys/i)).toBeInTheDocument();
    
    // After loading
    waitFor(() => {
      // Check that each survey title is rendered
      surveys.forEach(survey => {
        expect(screen.getByText(survey.title)).toBeInTheDocument();
      });
      
      // Check that create survey button is rendered
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument();
    });
  });
  
  test('displays empty state when no surveys', async () => {
    // Mock implementation to return empty surveys array
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ surveys: [] }),
      })
    );
    
    render(<SurveyList />);
    
    // Check that empty state message is displayed
    await waitFor(() => {
      expect(screen.getByText(/no surveys found/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first survey/i)).toBeInTheDocument();
    });
  });
  
  test('handles survey creation', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument();
    });
    
    // Click create survey button
    fireEvent.click(screen.getByRole('button', { name: /create survey/i }));
    
    // Check that survey builder is displayed
    await waitFor(() => {
      expect(screen.getByText(/create new survey/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/survey title/i)).toBeInTheDocument();
    });
  });
  
  test('handles survey editing', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getByText(surveys[0].title)).toBeInTheDocument();
    });
    
    // Find and click edit button for the first survey
    const editButtons = screen.getAllByLabelText(/edit survey/i);
    fireEvent.click(editButtons[0]);
    
    // Check that survey builder is displayed with the survey data
    await waitFor(() => {
      expect(screen.getByText(/edit survey/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/survey title/i)).toHaveValue(surveys[0].title);
    });
  });
  
  test('handles survey deletion', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getByText(surveys[0].title)).toBeInTheDocument();
    });
    
    // Find and click delete button for the first survey
    const deleteButtons = screen.getAllByLabelText(/delete survey/i);
    fireEvent.click(deleteButtons[0]);
    
    // Check that confirmation dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
    
    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    
    // Check that survey was removed from the list
    await waitFor(() => {
      expect(screen.queryByText(surveys[0].title)).not.toBeInTheDocument();
    });
  });
  
  test('filters surveys by status', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getByText(surveys[0].title)).toBeInTheDocument();
      expect(screen.getByText(surveys[1].title)).toBeInTheDocument();
    });
    
    // Click on status filter for draft surveys
    fireEvent.click(screen.getByRole('button', { name: /filter by status/i }));
    fireEvent.click(screen.getByText(/draft/i));
    
    // Check that only draft surveys are displayed
    await waitFor(() => {
      expect(screen.queryByText(surveys[0].title)).not.toBeInTheDocument();
      expect(screen.getByText(surveys[1].title)).toBeInTheDocument();
    });
  });
  
  test('sorts surveys by different criteria', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getAllByTestId('survey-item')).toHaveLength(surveys.length);
    });
    
    // Click on sort menu
    fireEvent.click(screen.getByRole('button', { name: /sort surveys/i }));
    
    // Sort by responses
    fireEvent.click(screen.getByText(/responses/i));
    
    // Check that surveys are sorted (implementation-dependent)
    // This assumes the first survey has more responses than the second
    await waitFor(() => {
      const surveyItems = screen.getAllByTestId('survey-item');
      expect(surveyItems[0]).toHaveTextContent(surveys[0].title);
    });
  });
  
  test('searches surveys by title and description', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getAllByTestId('survey-item')).toHaveLength(surveys.length);
    });
    
    // Enter search term
    fireEvent.change(screen.getByPlaceholderText(/search surveys/i), {
      target: { value: 'travel' }
    });
    
    // Check that only matching surveys are displayed
    await waitFor(() => {
      expect(screen.queryByText(surveys[0].title)).not.toBeInTheDocument();
      expect(screen.getByText(surveys[1].title)).toBeInTheDocument();
    });
  });
  
  test('displays survey statistics correctly', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getAllByTestId('survey-item')).toHaveLength(surveys.length);
    });
    
    // Check that the first survey shows the correct number of responses
    expect(screen.getByText(`${surveys[0].responses} responses`)).toBeInTheDocument();
    
    // Check status indicators
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
  
  test('views survey responses', async () => {
    render(<SurveyList />);
    
    // Wait for surveys to load
    await waitFor(() => {
      expect(screen.getAllByTestId('survey-item')).toHaveLength(surveys.length);
    });
    
    // Find and click view responses button for the first survey
    const viewButtons = screen.getAllByLabelText(/view responses/i);
    fireEvent.click(viewButtons[0]);
    
    // Check that response viewer is displayed
    await waitFor(() => {
      expect(screen.getByText(/survey responses/i)).toBeInTheDocument();
      expect(screen.getByText(surveys[0].title)).toBeInTheDocument();
      expect(screen.getByText(`${surveys[0].responses} total responses`)).toBeInTheDocument();
    });
  });
}); 