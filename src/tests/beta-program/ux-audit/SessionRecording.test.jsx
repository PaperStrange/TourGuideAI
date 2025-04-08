import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionRecording from '../../../beta-program/ux-audit/SessionRecording';
import { sessionRecordingMocks } from '../../mocks/uxAuditMocks';

describe('SessionRecording Component', () => {
  beforeEach(() => {
    // Mock functions
    window.HTMLMediaElement.prototype.play = jest.fn();
    window.HTMLMediaElement.prototype.pause = jest.fn();
  });

  test('renders recording player with correct data', () => {
    render(<SessionRecording recording={sessionRecordingMocks} />);
    
    // Basic rendering tests
    expect(screen.getByTestId('session-player')).toBeInTheDocument();
    expect(screen.getByText(`Recording ID: ${sessionRecordingMocks.recordingId}`)).toBeInTheDocument();
    expect(screen.getByText(`Duration: 3 minutes`)).toBeInTheDocument();
  });

  test('timeline displays events correctly', () => {
    render(<SessionRecording recording={sessionRecordingMocks} />);
    
    const timeline = screen.getByTestId('timeline');
    expect(timeline).toBeInTheDocument();
    
    // Check for event markers
    sessionRecordingMocks.events.forEach(event => {
      const marker = screen.getByTestId(`event-marker-${event.type}`);
      expect(marker).toBeInTheDocument();
    });
  });

  test('playback controls work correctly', async () => {
    render(<SessionRecording recording={sessionRecordingMocks} />);
    
    const user = userEvent.setup();
    
    // Play button
    const playButton = screen.getByLabelText('Play recording');
    await user.click(playButton);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    
    // Pause button
    const pauseButton = screen.getByLabelText('Pause recording');
    await user.click(pauseButton);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    
    // Seek to position
    const seekBar = screen.getByTestId('seek-bar');
    fireEvent.change(seekBar, { target: { value: 50 } });
    
    // Speed control
    const speedControl = screen.getByLabelText('Playback speed');
    await user.selectOptions(speedControl, '2.0');
    expect(screen.getByTestId('session-player').playbackRate).toBe(2.0);
  });

  test('event details are displayed when clicking on timeline events', async () => {
    render(<SessionRecording recording={sessionRecordingMocks} />);
    
    const user = userEvent.setup();
    const clickEventMarker = screen.getByTestId('event-marker-click');
    
    await user.click(clickEventMarker);
    
    expect(screen.getByTestId('event-details')).toBeInTheDocument();
    expect(screen.getByText('.nav-menu-item')).toBeInTheDocument(); // target element
    expect(screen.getByText('Position: x: 150, y: 75')).toBeInTheDocument();
  });

  test('handles empty recording data gracefully', () => {
    render(<SessionRecording recording={{...sessionRecordingMocks, events: []}} />);
    
    expect(screen.getByText('No events recorded in this session')).toBeInTheDocument();
  });

  test('performance is within acceptable range', async () => {
    const start = performance.now();
    render(<SessionRecording recording={sessionRecordingMocks} />);
    const end = performance.now();
    
    // Rendering should be quick (under 100ms)
    expect(end - start).toBeLessThan(100);
  });
}); 