import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
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

  test('renders survey list component', async () => {
    render(
      <MemoryRouter> 
        <SurveyList />
      </MemoryRouter>
    );
    
    // Check for the final state after data loading (mock returns empty array initially)
    expect(await screen.findByText(/no surveys available/i)).toBeInTheDocument();
  });
}); 