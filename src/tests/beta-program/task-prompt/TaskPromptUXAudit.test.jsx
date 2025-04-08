import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskPromptUXAudit from '../../../beta-program/task-prompt/TaskPromptUXAudit';
import { tasksMocks, taskStateMocks, taskSessionMocks } from '../../mocks/taskPromptMocks';
import { sessionRecordingMocks } from '../../mocks/uxAuditMocks';

// Mock UX audit integration functions
const mockStartRecording = jest.fn().mockResolvedValue({ recordingId: 'rec-12345' });
const mockStopRecording = jest.fn().mockResolvedValue({ success: true });
const mockTagEvent = jest.fn().mockResolvedValue({ success: true });
const mockFetchSessionRecording = jest.fn().mockResolvedValue(sessionRecordingMocks);
const mockFetchTaskSession = jest.fn().mockResolvedValue(taskSessionMocks);

describe('TaskPromptUXAudit Component', () => {
  const activeTask = tasksMocks.find(task => task.id === taskStateMocks.activeTaskId);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('starts recording when task begins', async () => {
    render(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={true}
      />
    );
    
    // Should start recording when component mounts with active task
    await waitFor(() => {
      expect(mockStartRecording).toHaveBeenCalledWith({
        taskId: activeTask.id,
        metadata: expect.objectContaining({
          taskTitle: activeTask.title,
          taskType: expect.any(String)
        })
      });
    });
  });
  
  test('tags step transitions', async () => {
    render(
      <TaskPromptUXAudit
        task={activeTask}
        currentStepIndex={1}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={true}
        recordingId="rec-12345"
      />
    );
    
    // Update props to simulate step transition
    const { rerender } = render(
      <TaskPromptUXAudit
        task={activeTask}
        currentStepIndex={2} // Changed from 1 to 2
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={true}
        recordingId="rec-12345"
      />
    );
    
    // Should tag the step transition event
    await waitFor(() => {
      expect(mockTagEvent).toHaveBeenCalledWith({
        recordingId: 'rec-12345',
        eventType: 'task_step_transition',
        metadata: {
          taskId: activeTask.id,
          fromStep: activeTask.steps[1].id,
          toStep: activeTask.steps[2].id,
          stepTitle: activeTask.steps[2].title
        }
      });
    });
  });
  
  test('stops recording when task completes', async () => {
    // First render with active task
    const { rerender } = render(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={true}
        recordingId="rec-12345"
      />
    );
    
    // Update props to simulate task completion
    rerender(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={false}
        isCompleted={true}
        recordingId="rec-12345"
      />
    );
    
    // Should stop recording when task completes
    await waitFor(() => {
      expect(mockStopRecording).toHaveBeenCalledWith({
        recordingId: 'rec-12345',
        metadata: {
          taskId: activeTask.id,
          completionStatus: 'completed',
          totalSteps: activeTask.steps.length
        }
      });
    });
    
    // Should tag the completion event
    expect(mockTagEvent).toHaveBeenCalledWith({
      recordingId: 'rec-12345',
      eventType: 'task_completed',
      metadata: {
        taskId: activeTask.id,
        taskTitle: activeTask.title
      }
    });
  });
  
  test('displays task session timeline when requested', async () => {
    render(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={false}
        isCompleted={true}
        recordingId="rec-task-12345"
        showSessionTimeline={true}
      />
    );
    
    // Should fetch the task session data
    await waitFor(() => {
      expect(mockFetchTaskSession).toHaveBeenCalledWith('rec-task-12345');
    });
    
    // Should render the timeline with session events
    await waitFor(() => {
      expect(screen.getByTestId('task-session-timeline')).toBeInTheDocument();
      expect(screen.getByText('Task Session Timeline')).toBeInTheDocument();
    });
    
    // Should show task events in timeline
    taskSessionMocks.events.forEach(event => {
      if (event.type === 'task_step_completed') {
        expect(screen.getByText(`Step ${event.data.stepId} Completed`)).toBeInTheDocument();
      }
    });
  });
  
  test('generates UX metrics for task performance', async () => {
    render(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={false}
        isCompleted={true}
        recordingId="rec-task-12345"
        showUXMetrics={true}
      />
    );
    
    // Should fetch session data for metrics
    await waitFor(() => {
      expect(mockFetchTaskSession).toHaveBeenCalledWith('rec-task-12345');
    });
    
    // Should render UX metrics
    await waitFor(() => {
      expect(screen.getByTestId('task-ux-metrics')).toBeInTheDocument();
      expect(screen.getByText('Task Performance Metrics')).toBeInTheDocument();
    });
    
    // Should show key metrics
    expect(screen.getByText(/Average Time per Step/i)).toBeInTheDocument();
    expect(screen.getByText(/Step Difficulty Rating/i)).toBeInTheDocument();
    expect(screen.getByText(/User Path Efficiency/i)).toBeInTheDocument();
  });
  
  test('integrates with UX heatmap data', async () => {
    render(
      <TaskPromptUXAudit
        task={activeTask}
        startRecording={mockStartRecording}
        stopRecording={mockStopRecording}
        tagEvent={mockTagEvent}
        fetchSessionRecording={mockFetchSessionRecording}
        fetchTaskSession={mockFetchTaskSession}
        isActive={false}
        isCompleted={true}
        recordingId="rec-task-12345"
        showHeatmap={true}
      />
    );
    
    // Should fetch session data for heatmap
    await waitFor(() => {
      expect(mockFetchTaskSession).toHaveBeenCalledWith('rec-task-12345');
    });
    
    // Should render task-specific heatmap
    await waitFor(() => {
      expect(screen.getByTestId('task-heatmap')).toBeInTheDocument();
      expect(screen.getByText('Task Interaction Heatmap')).toBeInTheDocument();
    });
    
    // Should have controls for steps
    activeTask.steps.forEach((step, index) => {
      expect(screen.getByText(`Step ${index + 1}: ${step.title}`)).toBeInTheDocument();
    });
    
    const user = userEvent.setup();
    
    // Click on a step to filter heatmap
    const stepButton = screen.getByText(`Step 1: ${activeTask.steps[0].title}`);
    await user.click(stepButton);
    
    // Should update the heatmap to show step-specific data
    expect(screen.getByText('Showing interactions for Step 1')).toBeInTheDocument();
  });
}); 