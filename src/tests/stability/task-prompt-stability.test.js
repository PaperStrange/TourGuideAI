/**
 * Task Prompt System Stability Tests
 * 
 * These tests check the stability and reliability of the Task Prompt System components
 * under various conditions including invalid data, edge cases, and error scenarios.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Import components to test
import TaskPromptManager from '../../beta-program/task-prompt/TaskPromptManager';
import InAppTaskPrompt from '../../beta-program/task-prompt/InAppTaskPrompt';
import TaskCompletionFlow from '../../beta-program/task-prompt/TaskCompletionFlow';
import TaskPromptUXAudit from '../../beta-program/task-prompt/TaskPromptUXAudit';

// Import mock data
import { 
  tasksMocks, 
  taskStateMocks, 
  taskInteractionsMocks, 
  taskSessionMocks 
} from '../mocks/taskPromptMocks';

// Mock functions
const mockRecordInteraction = jest.fn().mockResolvedValue({ success: true });
const mockUpdateTaskState = jest.fn().mockResolvedValue({ success: true });
const mockCheckCompletionCriteria = jest.fn().mockReturnValue(false);
const mockFetchTasks = jest.fn().mockResolvedValue(tasksMocks);
const mockFetchTaskState = jest.fn().mockResolvedValue(taskStateMocks);
const mockCompleteTask = jest.fn().mockResolvedValue({ success: true });

// Mock UX Audit integration functions
const mockStartRecording = jest.fn().mockResolvedValue({ recordingId: 'rec-12345' });
const mockStopRecording = jest.fn().mockResolvedValue({ success: true });
const mockTagEvent = jest.fn().mockResolvedValue({ success: true });
const mockFetchTaskSession = jest.fn().mockResolvedValue(taskSessionMocks);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Prompt System Stability', () => {
  const activeTask = tasksMocks.find(task => task.id === taskStateMocks.activeTaskId);
  const currentStepIndex = taskStateMocks.taskProgress[activeTask.id].currentStepIndex;
  
  // Test section for TaskPromptManager component stability
  describe('TaskPromptManager Component Stability', () => {
    test('handles API failures gracefully', async () => {
      // Mock API error
      mockFetchTasks.mockRejectedValueOnce(new Error('Failed to fetch tasks'));
      mockFetchTaskState.mockRejectedValueOnce(new Error('Failed to fetch task state'));
      
      render(
        <TaskPromptManager 
          fetchTasks={mockFetchTasks}
          fetchTaskState={mockFetchTaskState}
          updateTaskState={mockUpdateTaskState}
        />
      );
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('tasks-error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();
      });
      
      // Should display retry button
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    
    test('handles empty tasks array gracefully', async () => {
      // Mock empty tasks array
      mockFetchTasks.mockResolvedValueOnce([]);
      
      render(
        <TaskPromptManager 
          fetchTasks={mockFetchTasks}
          fetchTaskState={mockFetchTaskState}
          updateTaskState={mockUpdateTaskState}
        />
      );
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('tasks-loading')).not.toBeInTheDocument();
      });
      
      // Should display empty state message
      expect(screen.getByText('No tasks available')).toBeInTheDocument();
    });
    
    test('handles various task data formats gracefully', async () => {
      // Mock tasks with missing or invalid data
      const irregularTasks = [
        {
          id: 'task-irregular-1',
          title: 'Irregular Task 1',
          // Missing description
          steps: [] // Empty steps array
        },
        {
          id: 'task-irregular-2',
          title: 'Irregular Task 2',
          description: 'Task with invalid steps',
          steps: [
            {
              // Missing id
              title: 'Step without ID',
              instruction: 'This step has no ID'
            },
            {
              id: 'step-2',
              // Missing title
              instruction: 'This step has no title'
            }
          ]
        }
      ];
      
      mockFetchTasks.mockResolvedValueOnce(irregularTasks);
      
      render(
        <TaskPromptManager 
          fetchTasks={mockFetchTasks}
          fetchTaskState={mockFetchTaskState}
          updateTaskState={mockUpdateTaskState}
        />
      );
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('tasks-loading')).not.toBeInTheDocument();
      });
      
      // Should display both tasks even with irregular data
      expect(screen.getByText('Irregular Task 1')).toBeInTheDocument();
      expect(screen.getByText('Irregular Task 2')).toBeInTheDocument();
    });
    
    test('handles task state with missing tasks gracefully', async () => {
      // Mock task state with reference to non-existent task
      const irregularTaskState = {
        ...taskStateMocks,
        activeTaskId: 'non-existent-task-id',
        taskProgress: {
          ...taskStateMocks.taskProgress,
          'non-existent-task-id': {
            currentStepIndex: 0,
            startTime: Date.now(),
            stepCompletionTimes: {}
          }
        }
      };
      
      mockFetchTaskState.mockResolvedValueOnce(irregularTaskState);
      
      render(
        <TaskPromptManager 
          fetchTasks={mockFetchTasks}
          fetchTaskState={mockFetchTaskState}
          updateTaskState={mockUpdateTaskState}
        />
      );
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('tasks-loading')).not.toBeInTheDocument();
      });
      
      // Should still render the task list without crashing
      tasksMocks.forEach(task => {
        expect(screen.getByText(task.title)).toBeInTheDocument();
      });
    });
  });
  
  // Test section for InAppTaskPrompt component stability
  describe('InAppTaskPrompt Component Stability', () => {
    test('handles invalid task data gracefully', () => {
      // Create invalid task with missing required properties
      const invalidTask = {
        id: 'invalid-task',
        title: 'Invalid Task',
        // Missing steps array
      };
      
      render(
        <InAppTaskPrompt
          task={invalidTask}
          currentStepIndex={0}
          recordInteraction={mockRecordInteraction}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      // Should display error message instead of crashing
      expect(screen.getByText('Invalid task data')).toBeInTheDocument();
    });
    
    test('handles null or undefined task gracefully', () => {
      // Test with null task
      render(
        <InAppTaskPrompt
          task={null}
          currentStepIndex={0}
          recordInteraction={mockRecordInteraction}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
      
      // Test with undefined task
      render(
        <InAppTaskPrompt
          currentStepIndex={0}
          recordInteraction={mockRecordInteraction}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
    });
    
    test('handles invalid step index gracefully', () => {
      // Test with out-of-bounds step index
      render(
        <InAppTaskPrompt
          task={activeTask}
          currentStepIndex={999} // Out of bounds
          recordInteraction={mockRecordInteraction}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      // Should handle out-of-bounds index gracefully
      expect(screen.getByText(/Invalid step index/)).toBeInTheDocument();
      
      // Test with negative step index
      render(
        <InAppTaskPrompt
          task={activeTask}
          currentStepIndex={-1} // Negative index
          recordInteraction={mockRecordInteraction}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      // Should handle negative index gracefully
      expect(screen.getByText(/Invalid step index/)).toBeInTheDocument();
    });
    
    test('handles API failures in recordInteraction gracefully', async () => {
      // Mock API failure
      const mockRecordInteractionFail = jest.fn().mockRejectedValue(new Error('Failed to record interaction'));
      
      render(
        <InAppTaskPrompt
          task={activeTask}
          currentStepIndex={currentStepIndex}
          recordInteraction={mockRecordInteractionFail}
          updateTaskState={mockUpdateTaskState}
          checkCompletionCriteria={mockCheckCompletionCriteria}
        />
      );
      
      // Component should render despite API failure
      expect(screen.getByText(activeTask.steps[currentStepIndex].title)).toBeInTheDocument();
      
      // API error should be handled gracefully without crashing
      await waitFor(() => {
        expect(mockRecordInteractionFail).toHaveBeenCalled();
      });
      
      // Should still be functional
      expect(screen.getByText(activeTask.steps[currentStepIndex].instruction)).toBeInTheDocument();
    });
  });
  
  // Test section for TaskCompletionFlow component stability
  describe('TaskCompletionFlow Component Stability', () => {
    test('handles API failures gracefully', async () => {
      // Mock API failures
      const mockCompleteTaskFail = jest.fn().mockRejectedValue(new Error('Failed to complete task'));
      const mockUpdateTaskStateFail = jest.fn().mockRejectedValue(new Error('Failed to update task state'));
      
      render(
        <TaskCompletionFlow
          task={activeTask}
          updateTaskState={mockUpdateTaskStateFail}
          recordInteraction={mockRecordInteraction}
          completeTask={mockCompleteTaskFail}
          isCompleted={true}
        />
      );
      
      // Should render completion message
      expect(screen.getByText(activeTask.completionMessage)).toBeInTheDocument();
      
      const user = userEvent.setup();
      
      // Click complete button
      const doneButton = screen.getByRole('button', { name: /Done/i });
      await user.click(doneButton);
      
      // Should show error notification but not crash
      await waitFor(() => {
        expect(screen.getByText(/Failed to complete task/)).toBeInTheDocument();
      });
    });
    
    test('handles missing task data gracefully', () => {
      // Test with null task
      render(
        <TaskCompletionFlow
          task={null}
          updateTaskState={mockUpdateTaskState}
          recordInteraction={mockRecordInteraction}
          completeTask={mockCompleteTask}
          isCompleted={true}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
      
      // Test with undefined task
      render(
        <TaskCompletionFlow
          updateTaskState={mockUpdateTaskState}
          recordInteraction={mockRecordInteraction}
          completeTask={mockCompleteTask}
          isCompleted={true}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
    });
    
    test('handles task without completion message gracefully', () => {
      // Create task without completion message
      const taskWithoutCompletionMessage = {
        ...activeTask,
        completionMessage: undefined // Missing completion message
      };
      
      render(
        <TaskCompletionFlow
          task={taskWithoutCompletionMessage}
          updateTaskState={mockUpdateTaskState}
          recordInteraction={mockRecordInteraction}
          completeTask={mockCompleteTask}
          isCompleted={true}
        />
      );
      
      // Should display default completion message
      expect(screen.getByText('Task completed successfully!')).toBeInTheDocument();
    });
    
    test('handles invalid task progress data gracefully', () => {
      // Task progress with invalid timestamps
      const invalidTaskProgress = {
        currentStepIndex: 2,
        startTime: 'invalid-time', // Invalid timestamp
        completionTime: 'not-a-timestamp', // Invalid timestamp
        stepCompletionTimes: {
          'step-1': 'invalid-time', // Invalid timestamp
          'step-2': 'not-a-timestamp' // Invalid timestamp
        }
      };
      
      render(
        <TaskCompletionFlow
          task={activeTask}
          taskProgress={invalidTaskProgress}
          updateTaskState={mockUpdateTaskState}
          recordInteraction={mockRecordInteraction}
          completeTask={mockCompleteTask}
          isCompleted={true}
          showAnalytics={true}
        />
      );
      
      // Should render completion message despite invalid times
      expect(screen.getByText(activeTask.completionMessage)).toBeInTheDocument();
      
      // Should handle invalid times gracefully
      expect(screen.getByText('Time data unavailable')).toBeInTheDocument();
    });
  });
  
  // Test section for TaskPromptUXAudit component stability
  describe('TaskPromptUXAudit Component Stability', () => {
    test('handles API failures gracefully', async () => {
      // Mock API failures
      const mockStartRecordingFail = jest.fn().mockRejectedValue(new Error('Failed to start recording'));
      const mockStopRecordingFail = jest.fn().mockRejectedValue(new Error('Failed to stop recording'));
      const mockTagEventFail = jest.fn().mockRejectedValue(new Error('Failed to tag event'));
      
      render(
        <TaskPromptUXAudit
          task={activeTask}
          startRecording={mockStartRecordingFail}
          stopRecording={mockStopRecordingFail}
          tagEvent={mockTagEventFail}
          fetchTaskSession={mockFetchTaskSession}
          isActive={true}
        />
      );
      
      // Should handle recording failure gracefully
      await waitFor(() => {
        expect(mockStartRecordingFail).toHaveBeenCalled();
      });
      
      // Component should render error state but not crash
      expect(screen.getByText('Failed to start session recording')).toBeInTheDocument();
    });
    
    test('handles missing task data gracefully', () => {
      // Test with null task
      render(
        <TaskPromptUXAudit
          task={null}
          startRecording={mockStartRecording}
          stopRecording={mockStopRecording}
          tagEvent={mockTagEvent}
          fetchTaskSession={mockFetchTaskSession}
          isActive={true}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
      
      // Test with undefined task
      render(
        <TaskPromptUXAudit
          startRecording={mockStartRecording}
          stopRecording={mockStopRecording}
          tagEvent={mockTagEvent}
          fetchTaskSession={mockFetchTaskSession}
          isActive={true}
        />
      );
      
      expect(screen.getByText('No task data available')).toBeInTheDocument();
    });
    
    test('handles session data with missing or invalid events gracefully', async () => {
      // Create session data with invalid events
      const invalidSessionData = {
        ...taskSessionMocks,
        events: [
          {
            // Missing type
            timestamp: Date.now(),
            data: { taskId: 'task-123', stepId: 'step-1' }
          },
          {
            type: 'click',
            // Missing timestamp
            target: '.navigation-menu .attractions-tab',
            position: { x: 250, y: 50 }
          },
          null, // Null event
          undefined // Undefined event
        ]
      };
      
      mockFetchTaskSession.mockResolvedValueOnce(invalidSessionData);
      
      render(
        <TaskPromptUXAudit
          task={activeTask}
          startRecording={mockStartRecording}
          stopRecording={mockStopRecording}
          tagEvent={mockTagEvent}
          fetchTaskSession={mockFetchTaskSession}
          isActive={false}
          isCompleted={true}
          recordingId="rec-task-12345"
          showSessionTimeline={true}
        />
      );
      
      // Wait for data to load
      await waitFor(() => {
        expect(mockFetchTaskSession).toHaveBeenCalled();
      });
      
      // Should render timeline despite invalid events
      expect(screen.getByTestId('task-session-timeline')).toBeInTheDocument();
      
      // Should display filtered timeline with valid events
      expect(screen.getByText('Some events could not be displayed')).toBeInTheDocument();
    });
    
    test('handles missing recording ID gracefully', () => {
      render(
        <TaskPromptUXAudit
          task={activeTask}
          startRecording={mockStartRecording}
          stopRecording={mockStopRecording}
          tagEvent={mockTagEvent}
          fetchTaskSession={mockFetchTaskSession}
          isActive={false}
          isCompleted={true}
          // Missing recordingId
          showSessionTimeline={true}
        />
      );
      
      // Should handle missing recording ID gracefully
      expect(screen.getByText('No recording ID available')).toBeInTheDocument();
    });
  });
}); 