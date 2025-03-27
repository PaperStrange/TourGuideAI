import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SurveyBuilder from '../../../features/beta-program/components/survey/SurveyBuilder';

describe('Survey Builder Component', () => {
  // Initial empty survey
  const emptySurvey = {
    id: '',
    title: '',
    description: '',
    questions: [],
    settings: {
      allowAnonymous: true,
      requireAllQuestions: false,
      showProgressBar: true,
      randomizeQuestions: false
    }
  };
  
  // Sample survey with questions
  const sampleSurvey = {
    id: 'survey-123',
    title: 'Feature Feedback Survey',
    description: 'Please provide your feedback on our new features',
    questions: [
      {
        id: 'q1',
        title: 'How satisfied are you with the new itinerary feature?',
        type: 'rating',
        required: true,
        options: []
      },
      {
        id: 'q2',
        title: 'Which features would you like to see improved?',
        type: 'checkbox',
        required: false,
        options: [
          { id: 'opt1', text: 'Map interface' },
          { id: 'opt2', text: 'Route creation' },
          { id: 'opt3', text: 'Recommendations' }
        ]
      }
    ],
    settings: {
      allowAnonymous: true,
      requireAllQuestions: false,
      showProgressBar: true,
      randomizeQuestions: false
    }
  };
  
  test('renders empty survey builder form', () => {
    render(<SurveyBuilder survey={emptySurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Check that title and description fields are rendered
    expect(screen.getByLabelText(/survey title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/survey description/i)).toBeInTheDocument();
    
    // Check that add question button is rendered
    expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
    
    // Check that save button is rendered
    expect(screen.getByRole('button', { name: /save survey/i })).toBeInTheDocument();
  });
  
  test('renders existing survey data correctly', () => {
    render(<SurveyBuilder survey={sampleSurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Check that title and description are filled with existing data
    expect(screen.getByLabelText(/survey title/i)).toHaveValue(sampleSurvey.title);
    expect(screen.getByLabelText(/survey description/i)).toHaveValue(sampleSurvey.description);
    
    // Check that questions are rendered
    expect(screen.getByText(sampleSurvey.questions[0].title)).toBeInTheDocument();
    expect(screen.getByText(sampleSurvey.questions[1].title)).toBeInTheDocument();
    
    // Check that question options are rendered
    expect(screen.getByText('Map interface')).toBeInTheDocument();
    expect(screen.getByText('Route creation')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });
  
  test('adds a new question', async () => {
    render(<SurveyBuilder survey={emptySurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Click add question button
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    
    // Check that question form appears
    await waitFor(() => {
      expect(screen.getByLabelText(/question text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/question type/i)).toBeInTheDocument();
    });
    
    // Fill question form
    fireEvent.change(screen.getByLabelText(/question text/i), { 
      target: { value: 'What features do you use most?' } 
    });
    
    // Select question type
    fireEvent.mouseDown(screen.getByLabelText(/question type/i));
    fireEvent.click(screen.getByText(/multiple choice/i));
    
    // Add question button in the form
    fireEvent.click(screen.getByRole('button', { name: /add this question/i }));
    
    // Check that question was added to the survey
    await waitFor(() => {
      expect(screen.getByText('What features do you use most?')).toBeInTheDocument();
    });
  });
  
  test('edits an existing question', async () => {
    render(<SurveyBuilder survey={sampleSurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Click edit button on first question
    const editButtons = screen.getAllByLabelText(/edit question/i);
    fireEvent.click(editButtons[0]);
    
    // Check that question form appears with existing data
    await waitFor(() => {
      const questionTextInput = screen.getByLabelText(/question text/i);
      expect(questionTextInput).toBeInTheDocument();
      expect(questionTextInput).toHaveValue(sampleSurvey.questions[0].title);
    });
    
    // Update question text
    fireEvent.change(screen.getByLabelText(/question text/i), { 
      target: { value: 'Updated question text' } 
    });
    
    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /update question/i }));
    
    // Check that question was updated
    await waitFor(() => {
      expect(screen.getByText('Updated question text')).toBeInTheDocument();
    });
  });
  
  test('deletes a question', async () => {
    render(<SurveyBuilder survey={sampleSurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // First question title to check it's gone later
    const firstQuestionTitle = sampleSurvey.questions[0].title;
    
    // Click delete button on first question
    const deleteButtons = screen.getAllByLabelText(/delete question/i);
    fireEvent.click(deleteButtons[0]);
    
    // Confirm deletion in the dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    
    // Check that question was removed
    await waitFor(() => {
      expect(screen.queryByText(firstQuestionTitle)).not.toBeInTheDocument();
    });
  });
  
  test('reorders questions by drag and drop', async () => {
    render(<SurveyBuilder survey={sampleSurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Get question elements
    const questionElements = screen.getAllByTestId('question-item');
    
    // Simulate drag operation on first question (move down)
    fireEvent.dragStart(questionElements[0]);
    fireEvent.dragOver(questionElements[1]);
    fireEvent.drop(questionElements[1]);
    
    // Check that questions were reordered (implementation-dependent)
    // This might need adjustment based on actual drag-drop implementation
    const reorderedQuestions = screen.getAllByTestId('question-item');
    expect(reorderedQuestions[0]).not.toEqual(questionElements[0]);
    expect(reorderedQuestions[1]).not.toEqual(questionElements[1]);
  });
  
  test('validates required fields before saving', async () => {
    render(<SurveyBuilder survey={emptySurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Try to save without title
    fireEvent.click(screen.getByRole('button', { name: /save survey/i }));
    
    // Check that validation error appears
    await waitFor(() => {
      expect(screen.getByText(/survey title is required/i)).toBeInTheDocument();
    });
    
    // Fill title
    fireEvent.change(screen.getByLabelText(/survey title/i), { 
      target: { value: 'My Survey' } 
    });
    
    // Try to save without questions
    fireEvent.click(screen.getByRole('button', { name: /save survey/i }));
    
    // Check that validation error appears
    await waitFor(() => {
      expect(screen.getByText(/at least one question is required/i)).toBeInTheDocument();
    });
  });
  
  test('saves survey when form is valid', async () => {
    const handleSave = jest.fn();
    render(<SurveyBuilder survey={sampleSurvey} onSave={handleSave} onCancel={() => {}} />);
    
    // Update title
    fireEvent.change(screen.getByLabelText(/survey title/i), { 
      target: { value: 'Updated Survey Title' } 
    });
    
    // Save survey
    fireEvent.click(screen.getByRole('button', { name: /save survey/i }));
    
    // Check that save handler was called with updated survey
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
        id: sampleSurvey.id,
        title: 'Updated Survey Title',
        questions: sampleSurvey.questions
      }));
    });
  });
  
  test('manages question options for multiple choice questions', async () => {
    render(<SurveyBuilder survey={emptySurvey} onSave={() => {}} onCancel={() => {}} />);
    
    // Add new question
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));
    
    // Fill question details
    fireEvent.change(screen.getByLabelText(/question text/i), { 
      target: { value: 'Which features do you like?' } 
    });
    
    // Select multiple choice type
    fireEvent.mouseDown(screen.getByLabelText(/question type/i));
    fireEvent.click(screen.getByText(/multiple choice/i));
    
    // Add options
    await waitFor(() => {
      expect(screen.getByLabelText(/add option/i)).toBeInTheDocument();
    });
    
    // Add first option
    fireEvent.change(screen.getByLabelText(/add option/i), { 
      target: { value: 'Option 1' } 
    });
    fireEvent.click(screen.getByLabelText(/add option button/i));
    
    // Add second option
    fireEvent.change(screen.getByLabelText(/add option/i), { 
      target: { value: 'Option 2' } 
    });
    fireEvent.click(screen.getByLabelText(/add option button/i));
    
    // Check that options were added
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
    
    // Add question
    fireEvent.click(screen.getByRole('button', { name: /add this question/i }));
    
    // Check that question with options was added to survey
    await waitFor(() => {
      expect(screen.getByText('Which features do you like?')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });
}); 