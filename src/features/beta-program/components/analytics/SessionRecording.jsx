import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Slider,
  IconButton,
  Grid,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  FastForward,
  FastRewind,
  SkipNext,
  SkipPrevious,
  Fullscreen,
  FullscreenExit,
  BugReport,
  Bookmark,
  Flag,
  Download,
  Speed,
  ZoomIn,
  ZoomOut,
  Refresh,
  ArrowBack
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Import the service for session recordings
import sessionRecordingService from '../../services/SessionRecordingService';

/**
 * SessionRecording component
 * Displays recorded user sessions with playback controls and analysis tools
 */
const SessionRecording = ({ sessionId, onEventMarked, onAnalysisComplete, onBack }) => {
  const theme = useTheme();
  const playerRef = useRef(null);
  const canvasRef = useRef(null);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [bookmarks, setBookmarks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [flaggedEvents, setFlaggedEvents] = useState([]);
  
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch the session recording data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const data = await sessionRecordingService.getSessionById(sessionId);
        setSession(data);
        setDuration(data.duration);
        setMarkers(data.events || []);
        setBookmarks(data.bookmarks || []);
        setIssues(data.issues || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load session recording: ' + err.message);
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Initialize the canvas for session replay
  useEffect(() => {
    if (session && canvasRef.current) {
      const initializePlayer = async () => {
        try {
          await sessionRecordingService.initializePlayer(canvasRef.current, session);
        } catch (err) {
          setError('Failed to initialize player: ' + err.message);
        }
      };

      initializePlayer();
    }
  }, [session, canvasRef]);

  // Update time tracking during playback
  useEffect(() => {
    let intervalId;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1 * playbackSpeed;
          
          // Check if we've reached an event
          const nearestEvent = markers.find(
            event => Math.abs(event.timestamp - newTime) < 0.2
          );
          
          if (nearestEvent && (!currentEvent || currentEvent.id !== nearestEvent.id)) {
            setCurrentEvent(nearestEvent);
          }
          
          // Check if we've reached the end
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, duration, playbackSpeed, markers, currentEvent]);

  // When current time changes, update the visual playback
  useEffect(() => {
    if (session) {
      sessionRecordingService.seekToTime(currentTime);
    }
  }, [currentTime, session]);

  // Play/pause handling
  const handlePlayPause = () => {
    if (isPlaying) {
      sessionRecordingService.pause();
    } else {
      sessionRecordingService.play(playbackSpeed);
    }
    setIsPlaying(!isPlaying);
  };

  // Time navigation
  const handleSeek = (_, newValue) => {
    setCurrentTime(newValue);
  };

  // Jump forward/backward
  const handleJump = (seconds) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    setCurrentTime(newTime);
  };

  // Speed change
  const handleSpeedChange = (event) => {
    const newSpeed = parseFloat(event.target.value);
    setPlaybackSpeed(newSpeed);
    if (isPlaying) {
      sessionRecordingService.setPlaybackSpeed(newSpeed);
    }
  };

  // Filter session events
  const handleFilterChange = (event) => {
    setSelectedFilter(event.target.value);
  };

  // Add a bookmark at the current time
  const handleAddBookmark = () => {
    const newBookmark = {
      id: `bookmark-${Date.now()}`,
      timestamp: currentTime,
      label: `Bookmark at ${formatTime(currentTime)}`,
      type: 'bookmark',
    };
    
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    
    // Save bookmark through service
    sessionRecordingService.addBookmark(sessionId, newBookmark);
    
    if (onEventMarked) {
      onEventMarked(newBookmark);
    }
  };

  // Report an issue at the current time
  const handleReportIssue = () => {
    const newIssue = {
      id: `issue-${Date.now()}`,
      timestamp: currentTime,
      label: `Issue at ${formatTime(currentTime)}`,
      type: 'issue',
    };
    
    const updatedIssues = [...issues, newIssue];
    setIssues(updatedIssues);
    
    // Save issue through service
    sessionRecordingService.reportIssue(sessionId, newIssue);
    
    if (onEventMarked) {
      onEventMarked(newIssue);
    }
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    if (playerRef.current) {
      if (!isFullscreen) {
        if (playerRef.current.requestFullscreen) {
          playerRef.current.requestFullscreen();
        } else if (playerRef.current.mozRequestFullScreen) {
          playerRef.current.mozRequestFullScreen();
        } else if (playerRef.current.webkitRequestFullscreen) {
          playerRef.current.webkitRequestFullscreen();
        } else if (playerRef.current.msRequestFullscreen) {
          playerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Export session data
  const handleExportSession = () => {
    sessionRecordingService.exportSessionData(sessionId);
  };

  // Format time display (mm:ss)
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter events based on selection
  const filteredEvents = () => {
    if (selectedFilter === 'all') {
      return [...markers, ...bookmarks, ...issues].sort((a, b) => a.timestamp - b.timestamp);
    } else if (selectedFilter === 'clicks') {
      return markers.filter(event => event.type === 'click');
    } else if (selectedFilter === 'scrolls') {
      return markers.filter(event => event.type === 'scroll');
    } else if (selectedFilter === 'inputs') {
      return markers.filter(event => event.type === 'input');
    } else if (selectedFilter === 'bookmarks') {
      return bookmarks;
    } else if (selectedFilter === 'issues') {
      return issues;
    }
    return [];
  };

  // Jump to a specific event
  const jumpToEvent = (event) => {
    setCurrentTime(event.timestamp);
    setCurrentEvent(event);
  };

  const handleZoomChange = (newZoom) => {
    setZoom(Math.max(0.5, Math.min(2, newZoom)));
  };

  // Load session data
  useEffect(() => {
    if (!selectedSessionId) {
      // Load available sessions if no specific session is selected
      sessionRecordingService.getAvailableSessions()
        .then(data => {
          setAvailableSessions(data);
          if (data.length > 0 && !sessionId) {
            setSelectedSessionId(data[0].id);
          }
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load available sessions');
          setLoading(false);
        });
      
      return;
    }
    
    setLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentFrameIndex(0);
    
    sessionRecordingService.getSessionById(selectedSessionId)
      .then(data => {
        setSession(data);
        setDuration(data.duration);
        setMarkers(data.events || []);
        setBookmarks(data.bookmarks || []);
        setIssues(data.issues || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load session recording');
        setLoading(false);
      });
      
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [selectedSessionId, sessionId]);
  
  // Playback logic
  useEffect(() => {
    if (isPlaying && session) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + (0.1 * playbackSpeed);
          
          // Check if we need to update the current frame
          if (session.frames && session.frames.length > 0) {
            const frameTimestamps = session.frames.map((frame, index) => ({
              index,
              time: (new Date(frame.timestamp).getTime() - new Date(session.startTime).getTime()) / 1000
            }));
            
            const nextFrameIndex = frameTimestamps.findIndex(frame => frame.time > newTime);
            if (nextFrameIndex > 0) {
              setCurrentFrameIndex(nextFrameIndex - 1);
            } else if (nextFrameIndex === -1 && newTime > frameTimestamps[frameTimestamps.length - 1].time) {
              setCurrentFrameIndex(frameTimestamps.length - 1);
            }
          }
          
          // If we reached the end, stop playback
          if (newTime >= session.duration) {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            return session.duration;
          }
          
          return newTime;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, session, playbackSpeed]);
  
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleNextFrame = () => {
    if (session && session.frames && currentFrameIndex < session.frames.length - 1) {
      const nextIndex = currentFrameIndex + 1;
      setCurrentFrameIndex(nextIndex);
      
      // Update current time based on frame timestamp
      const frameTime = (new Date(session.frames[nextIndex].timestamp).getTime() - new Date(session.startTime).getTime()) / 1000;
      setCurrentTime(frameTime);
    }
  };
  
  const handlePrevFrame = () => {
    if (session && session.frames && currentFrameIndex > 0) {
      const prevIndex = currentFrameIndex - 1;
      setCurrentFrameIndex(prevIndex);
      
      // Update current time based on frame timestamp
      const frameTime = (new Date(session.frames[prevIndex].timestamp).getTime() - new Date(session.startTime).getTime()) / 1000;
      setCurrentTime(frameTime);
    }
  };
  
  const handleSessionChange = (event) => {
    setSelectedSessionId(event.target.value);
  };

  const getCurrentEvents = () => {
    if (!session || !session.events) return [];
    
    // Get events within 2 seconds of current time
    const currentTimeMs = new Date(session.startTime).getTime() + (currentTime * 1000);
    const lowerBound = currentTimeMs - 2000;
    const upperBound = currentTimeMs + 2000;
    
    return session.events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= lowerBound && eventTime <= upperBound;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Session Recording
      </Typography>
      
      {session && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            User: {session.userId} • Duration: {formatTime(duration)} • Date: {new Date(session.timestamp).toLocaleString()}
          </Typography>
          
          {/* Session Replay Canvas */}
          <Box 
            ref={playerRef}
            sx={{
              position: 'relative',
              width: '100%',
              height: '500px',
              bgcolor: 'black',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <canvas 
              ref={canvasRef} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }}
            />
            
            {/* Current event overlay */}
            {currentEvent && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  p: 1,
                  borderRadius: 1,
                  maxWidth: '30%'
                }}
              >
                <Typography variant="body2">
                  {currentEvent.type}: {currentEvent.label || currentEvent.value}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Playback Controls */}
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <IconButton onClick={() => handleJump(-30)}>
                  <SkipPrevious />
                </IconButton>
              </Grid>
              <Grid item>
                <IconButton onClick={() => handleJump(-5)}>
                  <FastRewind />
                </IconButton>
              </Grid>
              <Grid item>
                <IconButton onClick={handlePlayPause} color="primary">
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Grid>
              <Grid item>
                <IconButton onClick={() => handleJump(5)}>
                  <FastForward />
                </IconButton>
              </Grid>
              <Grid item>
                <IconButton onClick={() => handleJump(30)}>
                  <SkipNext />
                </IconButton>
              </Grid>
              <Grid item xs>
                <Slider
                  value={currentTime}
                  min={0}
                  max={duration}
                  onChange={handleSeek}
                  sx={{ mx: 2 }}
                />
              </Grid>
              <Grid item>
                <Typography variant="body2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Typography>
              </Grid>
              <Grid item>
                <FormControl variant="standard" sx={{ minWidth: 80 }}>
                  <InputLabel id="speed-select-label">Speed</InputLabel>
                  <Select
                    labelId="speed-select-label"
                    value={playbackSpeed}
                    onChange={handleSpeedChange}
                    startAdornment={<Speed fontSize="small" sx={{ mr: 0.5 }} />}
                  >
                    <MenuItem value={0.5}>0.5x</MenuItem>
                    <MenuItem value={1}>1x</MenuItem>
                    <MenuItem value={1.5}>1.5x</MenuItem>
                    <MenuItem value={2}>2x</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <Tooltip title="Toggle fullscreen">
                  <IconButton onClick={handleToggleFullscreen}>
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {/* Analysis Tools */}
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Session Analysis
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<Bookmark />}
                    onClick={handleAddBookmark}
                    sx={{ mr: 1 }}
                  >
                    Add Bookmark
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<BugReport />}
                    onClick={handleReportIssue}
                    sx={{ mr: 1 }}
                  >
                    Report Issue
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<Download />}
                    onClick={handleExportSession}
                  >
                    Export Data
                  </Button>
                </Box>
                
                <Paper sx={{ p: 2, bgcolor: theme.palette.background.default }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Session Metrics
                    </Typography>
                    {session.metrics && (
                      <Chip 
                        label={`Score: ${session.metrics.overallScore}/100`}
                        color={
                          session.metrics.overallScore > 80 ? 'success' : 
                          session.metrics.overallScore > 60 ? 'info' : 'warning'
                        }
                      />
                    )}
                  </Box>
                  
                  {session.metrics && (
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Page Views</Typography>
                        <Typography variant="h6">{session.metrics.pageViews}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Time on Task</Typography>
                        <Typography variant="h6">{formatTime(session.metrics.timeOnTask)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Error Count</Typography>
                        <Typography variant="h6" color={session.metrics.errorCount > 2 ? 'error.main' : 'text.primary'}>
                          {session.metrics.errorCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Click Count</Typography>
                        <Typography variant="h6">{session.metrics.clickCount}</Typography>
                      </Grid>
                    </Grid>
                  )}
                </Paper>
              </Grid>
              
              {/* Event Timeline */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">
                    Event Timeline
                  </Typography>
                  <FormControl variant="standard" size="small">
                    <Select
                      value={selectedFilter}
                      onChange={handleFilterChange}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="all">All Events</MenuItem>
                      <MenuItem value="clicks">Clicks</MenuItem>
                      <MenuItem value="scrolls">Scrolls</MenuItem>
                      <MenuItem value="inputs">Inputs</MenuItem>
                      <MenuItem value="bookmarks">Bookmarks</MenuItem>
                      <MenuItem value="issues">Issues</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Paper 
                  sx={{ 
                    height: 300, 
                    overflow: 'auto',
                    p: 1,
                    bgcolor: theme.palette.background.default
                  }}
                >
                  {filteredEvents().length === 0 ? (
                    <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
                      No events found for the selected filter.
                    </Typography>
                  ) : (
                    filteredEvents().map((event) => (
                      <Box 
                        key={event.id}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                          bgcolor: 
                            event.type === 'issue' ? 'error.light' :
                            event.type === 'bookmark' ? 'info.light' : 'background.paper',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 
                              event.type === 'issue' ? 'error.main' :
                              event.type === 'bookmark' ? 'info.main' : 'action.hover',
                          }
                        }}
                        onClick={() => jumpToEvent(event)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {event.type === 'click' && <Flag fontSize="small" sx={{ mr: 1 }} />}
                          {event.type === 'scroll' && <Flag fontSize="small" sx={{ mr: 1 }} />}
                          {event.type === 'input' && <Flag fontSize="small" sx={{ mr: 1 }} />}
                          {event.type === 'bookmark' && <Bookmark fontSize="small" color="info" sx={{ mr: 1 }} />}
                          {event.type === 'issue' && <BugReport fontSize="small" color="error" sx={{ mr: 1 }} />}
                          <Typography variant="body2">
                            {event.label || event.type}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(event.timestamp)}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

SessionRecording.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onEventMarked: PropTypes.func,
  onAnalysisComplete: PropTypes.func,
  onBack: PropTypes.func
};

export default SessionRecording; 