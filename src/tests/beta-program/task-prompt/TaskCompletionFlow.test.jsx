import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCompletionFlow from '../../../beta-program/task-prompt/TaskCompletionFlow';
import { tasksMocks, taskStateMocks } from '../../mocks/taskPromptMocks';

// Mock API calls
const mockUpdateTaskState = jest.fn().mockResolvedValue({ success: true });
const mockRecordInteraction = jest.fn().mockResolvedValue({ success: true });
const mockCompleteTask = jest.fn().mockResolvedValue({ success: true });

describe('TaskCompletionFlow Component', () => {
  const activeTask = tasksMocks.find(task => task.id === taskStateMocks.activeTaskId);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders completion message when task is completed', async () => {
    render(
      <TaskCompletionFlow
        task={activeTask}
        updateTaskState={mockUpdateTaskState}
        recordInteraction={mockRecordInteraction}
        completeTask={mockCompleteTask}
        isCompleted={true}
      />
    );
    
    // Check for completion message
    expect(screen.getByText(activeTask.completionMessage)).toBeInTheDocument();
    
    // Should have actions available
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next Task/i })).toBeInTheDocument();
    
    // Interaction should be recorded
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: null,
      action: 'completion_shown',
      data: {}
    });
  });
  
  test('tracks completion actions and analytics', async () => {
    render(
      <TaskCompletionFlow
        task={activeTask}
        updateTaskState={mockUpdateTaskState}
        recordInteraction={mockRecordInteraction}
        completeTask={mockCompleteTask}
        isCompleted={true}
      />
    );
    
    const user = userEvent.setup();
    
    // Click Done button
    const doneButton = screen.getByRole('button', { name: /Done/i });
    await user.click(doneButton);
    
    // Should call completeTask with correct parameters
    expect(mockCompleteTask).toHaveBeenCalledWith(
      activeTask.id,
      { action: 'done' }
    );
    
    // Interaction should be recorded
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: null,
      action: 'task_completed',
      data: { completionAction: 'done' }
    });
  });
  
  test('handles "next task" action correctly', async () => {
    // Mock the next task
    const nextTask = tasksMocks.find(task => task.id === 'task-456');
    
    render(
      <TaskCompletionFlow
        task={activeTask}
        nextTask={nextTask}
        updateTaskState={mockUpdateTaskState}
        recordInteraction={mockRecordInteraction}
        completeTask={mockCompleteTask}
        isCompleted={true}
      />
    );
    
    const user = userEvent.setup();
    
    // Click Next Task button
    const nextButton = screen.getByRole('button', { name: /Next Task/i });
    await user.click(nextButton);
    
    // Should call completeTask with correct parameters
    expect(mockCompleteTask).toHaveBeenCalledWith(
      activeTask.id,
      { action: 'next_task', nextTaskId: nextTask.id }
    );
    
    // Should update task state to start next task
    expect(mockUpdateTaskState).toHaveBeenCalledWith({
      activeTaskId: nextTask.id,
      taskProgress: {
        [nextTask.id]: {
          currentStepIndex: 0,
          startTime: expect.any(Number),
          stepCompletionTimes: {}
        }
      }
    });
    
    // Interaction should be recorded
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: null,
      action: 'task_completed',
      data: { 
        completionAction: 'next_task',
        nextTaskId: nextTask.id
      }
    });
  });
  
  test('displays feedback form when configured', async () => {
    render(
      <TaskCompletionFlow
        task={activeTask}
        updateTaskState={mockUpdateTaskState}
        recordInteraction={mockRecordInteraction}
        completeTask={mockCompleteTask}
        isCompleted={true}
        showFeedback={true}
      />
    );
    
    // Check for feedback form
    expect(screen.getByText(/How was your experience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeInTheDocument();
    
    const user = userEvent.setup();
    
    // Fill out and submit feedback
    const ratingOption = screen.getByLabelText('4 stars');
    await user.click(ratingOption);
    
    const commentField = screen.getByLabelText(/Comments/i);
    await user.type(commentField, 'Great experience!');
    
    const submitButton = screen.getByRole('button', { name: /Submit Feedback/i });
    await user.click(submitButton);
    
    // Should record feedback
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: null,
      action: 'feedback_submitted',
      data: { 
        rating: 4,
        comments: 'Great experience!'
      }
    });
  });
  
  test('handles task time analytics correctly', () => {
    // Create mock task progress with specific timestamps
    const startTime = new Date('2023-04-15T10:30:00Z').getTime();
    const step1Time = new Date('2023-04-15T10:31:15Z').getTime();
    const step2Time = new Date('2023-04-15T10:32:45Z').getTime();
    const completionTime = new Date('2023-04-15T10:34:00Z').getTime();
    
    const mockProgress = {
      currentStepIndex: activeTask.steps.length,
      startTime: startTime,
      completionTime: completionTime,
      stepCompletionTimes: {
        'step-1': step1Time,
        'step-2': step2Time
      }
    };
    
    render(
      <TaskCompletionFlow
        task={activeTask}
        taskProgress={mockProgress}
        updateTaskState={mockUpdateTaskState}
        recordInteraction={mockRecordInteraction}
        completeTask={mockCompleteTask}
        isCompleted={true}
        showAnalytics={true}
      />
    );
    
    // Time summaries should be displayed
    expect(screen.getByText('Total task time: 4 minutes')).toBeInTheDocument();
    expect(screen.getByText('Step 1: 1 minute 15 seconds')).toBeInTheDocument();
    expect(screen.getByText('Step 2: 1 minute 30 seconds')).toBeInTheDocument();
    
    // Overall completion should include analytics
    expect(mockRecordInteraction).toHaveBeenCalledWith({
      taskId: activeTask.id,
      stepId: null,
      action: 'completion_shown',
      data: { 
        totalTimeMs: completionTime - startTime,
        stepTimes: {
          'step-1': step1Time - startTime,
          'step-2': step2Time - step1Time
        }
      }
    });
  });
}); 