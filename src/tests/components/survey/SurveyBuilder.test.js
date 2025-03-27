import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SurveyBuilder from '../../../features/beta-program/components/survey/SurveyBuilder';

// Mock the survey service
jest.mock('../../../features/beta-program/services/SurveyService', () => ({
  createSurvey: jest.fn().mockResolvedValue({ id: 'test-survey-123' }),
  updateSurvey: jest.fn().mockResolvedValue({ id: 'test-survey-123' }),
  deleteSurvey: jest.fn().mockResolvedValue(true)
}));

describe('Survey Builder Component', () => {
  // Initial survey data for testing
  const initialSurveyData = {
    title: 'Test Survey',
    description: 'A survey for testing',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'What is your favorite feature?',
        options: ['Map View', 'Route Planning', 'Recommendations']
      }
    ]
  };

  test('renders survey builder form', () => {
    render(<SurveyBuilder initialData={initialSurveyData} />);
    
    // Check that the form title is displayed
    expect(screen.getByText(/survey builder/i)).toBeInTheDocument();
  });
}); 