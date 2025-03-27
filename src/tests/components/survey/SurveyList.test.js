import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SurveyList from '../../../features/beta-program/components/survey/SurveyList';

// Mock the survey service
jest.mock('../../../features/beta-program/services/SurveyService', () => ({
  getSurveys: jest.fn(),
  deleteSurvey: jest.fn()
}));

// Import the mocked service for test control
import surveyService from '../../../features/beta-program/services/SurveyService';

describe('Survey List Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the getSurveys function to return empty array
    surveyService.getSurveys.mockResolvedValue([]);
  });

  test('renders survey list component', () => {
    render(<SurveyList />);
    
    // Should show loading initially
    expect(screen.getByText(/loading surveys/i)).toBeInTheDocument();
  });
}); 