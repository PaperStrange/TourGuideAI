import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InAppTaskPrompt from '../../../beta-program/task-prompt/InAppTaskPrompt';
import { tasksMocks, taskStateMocks, taskInteractionsMocks } from '../../mocks/taskPromptMocks';

// Mock API/state management functions
const mockRecordInteraction = jest.fn().mockResolvedValue({ success: true });
const mockUpdateTaskState = jest.fn().mockResolvedValue({ success: true });
const mockCheckCompletionCriteria = jest.fn();

describe('InAppTaskPrompt Component', () => {
  const activeTask = tasksMocks.find(task => task.id === taskStateMocks.activeTaskId);
  const currentStepIndex = taskStateMocks.taskProgress[activeTask.id].currentStepIndex;
  const currentStep = activeTask.steps[currentStepIndex];
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckCompletionCriteria.mockReturnValue(false);
  });
  
  test('renders the current task step correctly', () => {
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
      />
    );
    
    // Check if step content is rendered correctly
    expect(screen.getByText(currentStep.title)).toBeInTheDocument();
    expect(screen.getByText(currentStep.instruction)).toBeInTheDocument();
    
    // Progress indicator should show correct step (step 3 of 4)
    expect(screen.getByText(`Step ${currentStepIndex + 1} of ${activeTask.steps.length}`)).toBeInTheDocument();
  });
  
  test('records interaction when prompt is shown', async () => {
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
      />
    );
    
    // Wait for component to mount and record view
    await waitFor(() => {
      expect(mockRecordInteraction).toHaveBeenCalledWith({
        taskId: activeTask.id,
        stepId: currentStep.id,
        action: 'prompt_shown',
        data: { timeShown: expect.any(Number) }
      });
    });
  });
  
  test('shows hint when requested', async () => {
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
      />
    );
    
    const user = userEvent.setup();
    
    // Initially hint should not be visible
    expect(screen.queryByText(currentStep.hint)).not.toBeInTheDocument();
    
    // Click the hint button
    const hintButton = screen.getByRole('button', { name: /Need a hint/i });
    await user.click(hintButton);
    
    // Hint should be visible now
    expect(screen.getByText(currentStep.hint)).toBeInTheDocument();
    
    // Interaction should be recorded
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: currentStep.id,
      action: 'hint_requested',
      data: { hintIndex: 0 }
    });
  });
  
  test('advances to next step when current step is completed', async () => {
    // Mock that the completion criteria is met
    mockCheckCompletionCriteria.mockReturnValue(true);
    
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
      />
    );
    
    // Wait for completion check and advancement
    await waitFor(() => {
      expect(mockUpdateTaskState).toHaveBeenCalledWith({
        taskProgress: {
          [activeTask.id]: {
            currentStepIndex: currentStepIndex + 1,
            stepCompletionTimes: {
              [currentStep.id]: expect.any(Number)
            }
          }
        }
      });
    });
    
    // Should record step completion
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: currentStep.id,
      action: 'step_completed',
      data: { timeToComplete: expect.any(Number) }
    });
  });
  
  test('shows task completion message when all steps are completed', async () => {
    // Set to the last step
    const lastStepIndex = activeTask.steps.length - 1;
    
    // Mock that the completion criteria is met
    mockCheckCompletionCriteria.mockReturnValue(true);
    
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={lastStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
      />
    );
    
    // Wait for completion check and final completion
    await waitFor(() => {
      expect(mockUpdateTaskState).toHaveBeenCalledWith({
        taskProgress: {
          [activeTask.id]: {
            completed: true,
            completionTime: expect.any(Number)
          }
        }
      });
    });
    
    // Should show completion message
    await waitFor(() => {
      expect(screen.getByText(activeTask.completionMessage)).toBeInTheDocument();
    });
  });
  
  test('allows manual step navigation', async () => {
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
        allowManualNavigation={true}
      />
    );
    
    const user = userEvent.setup();
    
    // Check if navigation buttons are present
    const prevButton = screen.getByRole('button', { name: /Previous/i });
    const nextButton = screen.getByRole('button', { name: /Next/i });
    
    // Click next button
    await user.click(nextButton);
    
    // Should update to next step
    expect(mockUpdateTaskState).toHaveBeenCalledWith({
      taskProgress: {
        [activeTask.id]: {
          currentStepIndex: currentStepIndex + 1
        }
      }
    });
    
    // Clear mock and click previous button
    mockUpdateTaskState.mockClear();
    await user.click(prevButton);
    
    // Should update to previous step
    expect(mockUpdateTaskState).toHaveBeenCalledWith({
      taskProgress: {
        [activeTask.id]: {
          currentStepIndex: currentStepIndex - 1
        }
      }
    });
  });
  
  test('renders in minimized state and can be expanded', async () => {
    render(
      <InAppTaskPrompt
        task={activeTask}
        currentStepIndex={currentStepIndex}
        recordInteraction={mockRecordInteraction}
        updateTaskState={mockUpdateTaskState}
        checkCompletionCriteria={mockCheckCompletionCriteria}
        initiallyMinimized={true}
      />
    );
    
    // Initially only the header should be visible, not the instruction
    expect(screen.getByText(currentStep.title)).toBeInTheDocument();
    expect(screen.queryByText(currentStep.instruction)).not.toBeInTheDocument();
    
    const user = userEvent.setup();
    
    // Click the expand button
    const expandButton = screen.getByRole('button', { name: /Expand/i });
    await user.click(expandButton);
    
    // Now the instruction should be visible
    expect(screen.getByText(currentStep.instruction)).toBeInTheDocument();
    
    // Interaction should be recorded
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: currentStep.id,
      action: 'prompt_expanded',
      data: {}
    });
  });
}); 