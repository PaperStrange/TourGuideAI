import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  IconButton, 
  Slider, 
  Stack, 
  ButtonGroup, 
  Tooltip, 
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BugReportIcon from '@mui/icons-material/BugReport';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SessionRecordingService from '../../services/SessionRecordingService';

/**
 * Component for playing back user session recordings
 */
const SessionPlayback = ({ 
  sessionId, 
  autoPlay = false,
  onBookmarkCreate,
  onIssueReport,
  onError
}) => {
  // Refs
  const canvasRef = useRef(null);
  const playbackContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentInteractions, setCurrentInteractions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [dialogInput, setDialogInput] = useState('');
  
  // Format time as mm:ss
  const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch session data
        const sessionData = await SessionRecordingService.getSessionById(sessionId);
        if (!sessionData) {
          throw new Error('Session not found');
        }
        
        setSession(sessionData);
        setDuration(sessionData.duration || 0);
        setBookmarks(sessionData.bookmarks || []);
        
        // Initialize the playback
        await SessionRecordingService.initializeCanvasPlayer(
          canvasRef.current, 
          sessionData
        );
        
      } catch (error) {
        console.error('Failed to load session recording:', error);
        setError('Could not load session recording');
        if (onError) onError(error);
      } finally {
        setLoading(false);
      }
    };
    
    if (sessionId) {
      loadSession();
    }
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [sessionId]);
  
  // Handle playback
  useEffect(() => {
    if (!session || loading) return;
    
    let lastTimestamp = null;
    let lastFrameTime = currentTime;
    
    const playbackLoop = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      
      // Calculate time elapsed since last frame, adjusted for playback speed
      const elapsed = (timestamp - lastTimestamp) * playbackSpeed;
      lastFrameTime += elapsed;
      
      // Keep time within bounds
      if (lastFrameTime > duration) {
        lastFrameTime = duration;
        setPlaying(false);
      }
      
      // Update current time
      setCurrentTime(lastFrameTime);
      
      // Draw the frame at the current time
      SessionRecordingService.drawFrameAtTime(
        canvasRef.current, 
        session, 
        lastFrameTime
      );
      
      // Get currently visible interactions
      const interactions = SessionRecordingService.getInteractionsAtTime(
        session, 
        lastFrameTime
      );
      setCurrentInteractions(interactions);
      
      // Update last timestamp
      lastTimestamp = timestamp;
      
      // Continue loop if still playing
      if (playing && lastFrameTime < duration) {
        animationFrameRef.current = requestAnimationFrame(playbackLoop);
      }
    };
    
    if (playing) {
      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playing, session, duration, playbackSpeed, loading]);
  
  // Update frame when current time changes due to seeking
  useEffect(() => {
    if (!session || loading || playing) return;
    
    // Only update frame if we're not playing (to avoid conflicts with the animation loop)
    SessionRecordingService.drawFrameAtTime(
      canvasRef.current, 
      session, 
      currentTime
    );
    
    // Update visible interactions
    const interactions = SessionRecordingService.getInteractionsAtTime(
      session, 
      currentTime
    );
    setCurrentInteractions(interactions);
  }, [currentTime, session, loading, playing]);
  
  // Handle fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Toggle play/pause
  const togglePlayback = () => {
    if (currentTime >= duration) {
      // If at the end, restart
      setCurrentTime(0);
    }
    setPlaying(!playing);
  };
  
  // Seek to time
  const seekTo = (newTime) => {
    // Pause if we were playing
    if (playing) {
      setPlaying(false);
    }
    
    // Update current time
    setCurrentTime(Math.max(0, Math.min(newTime, duration)));
  };
  
  // Seek to next/previous event
  const seekToEvent = (direction) => {
    if (!session || !session.events) return;
    
    const events = session.events.sort((a, b) => a.time - b.time);
    
    if (direction === 'next') {
      const nextEvent = events.find(event => event.time > currentTime);
      if (nextEvent) {
        seekTo(nextEvent.time);
      }
    } else if (direction === 'prev') {
      const prevEvents = events.filter(event => event.time < currentTime);
      if (prevEvents.length > 0) {
        seekTo(prevEvents[prevEvents.length - 1].time);
      }
    }
  };
  
  // Change playback speed
  const changePlaybackSpeed = (speed) => {
    setPlaybackSpeed(speed);
  };
  
  // Add bookmark at current time
  const addBookmark = () => {
    setDialogType('bookmark');
    setDialogInput('');
    setDialogOpen(true);
  };
  
  // Report issue at current time
  const reportIssue = () => {
    setDialogType('issue');
    setDialogInput('');
    setDialogOpen(true);
  };
  
  // Handle dialog save
  const handleDialogSave = async () => {
    try {
      if (dialogType === 'bookmark') {
        const newBookmark = {
          time: currentTime,
          label: dialogInput || `Bookmark at ${formatTime(currentTime)}`,
          createdAt: new Date().toISOString()
        };
        
        await SessionRecordingService.addBookmark(sessionId, newBookmark);
        
        setBookmarks([...bookmarks, newBookmark]);
        
        if (onBookmarkCreate) {
          onBookmarkCreate(newBookmark);
        }
      } else if (dialogType === 'issue') {
        const issue = {
          time: currentTime,
          description: dialogInput,
          screenshot: canvasRef.current.toDataURL(),
          createdAt: new Date().toISOString()
        };
        
        await SessionRecordingService.reportIssue(sessionId, issue);
        
        if (onIssueReport) {
          onIssueReport(issue);
        }
      }
    } catch (error) {
      console.error(`Failed to ${dialogType === 'bookmark' ? 'add bookmark' : 'report issue'}:`, error);
      setError(`Failed to ${dialogType === 'bookmark' ? 'add bookmark' : 'report issue'}`);
    } finally {
      setDialogOpen(false);
    }
  };
  
  // Handle clicking on a bookmark
  const jumpToBookmark = (time) => {
    seekTo(time);
  };
  
  // Handle download
  const downloadRecording = async () => {
    try {
      await SessionRecordingService.exportSessionData(sessionId);
    } catch (error) {
      console.error('Failed to download recording:', error);
      setError('Failed to download recording');
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!fullscreen) {
      playbackContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  
  // Share session
  const shareSession = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/sessions/${sessionId}`
      );
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy share link:', error);
      setError('Failed to copy share link');
    }
  };
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        ...(fullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          borderRadius: 0
        })
      }}
      ref={playbackContainerRef}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6">
          Session Recording {session && `- ${session.user?.username || 'Anonymous'}`}
        </Typography>
        <Box>
          <Tooltip title="Share">
            <IconButton onClick={shareSession} size="small">
              <ShareIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton onClick={downloadRecording} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton onClick={toggleFullscreen} size="small">
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <>
          {/* Session metadata */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {session && session.metadata && (
                <>
                  <Chip 
                    label={`Device: ${session.metadata.device || 'Unknown'}`} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Browser: ${session.metadata.browser || 'Unknown'}`} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Duration: ${formatTime(duration)}`} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Events: ${session.events?.length || 0}`} 
                    size="small" 
                    variant="outlined"
                  />
                </>
              )}
            </Stack>
          </Box>
          
          {/* Playback canvas */}
          <Box sx={{ 
            position: 'relative', 
            flexGrow: 1, 
            bgcolor: '#f5f5f5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            border: '1px solid #ddd',
            borderRadius: 1
          }}>
            <canvas 
              ref={canvasRef} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain'
              }}
            />
          </Box>
          
          {/* Playback controls */}
          <Box sx={{ mt: 2 }}>
            {/* Timeline */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                {formatTime(currentTime)}
              </Typography>
              <Slider
                value={currentTime}
                min={0}
                max={duration}
                onChange={(_, value) => seekTo(value)}
                sx={{ mx: 1 }}
              />
              <Typography variant="caption" sx={{ ml: 1 }}>
                {formatTime(duration)}
              </Typography>
            </Box>
            
            {/* Bookmarks on timeline */}
            {bookmarks.length > 0 && (
              <Box sx={{ position: 'relative', height: 16, mb: 1 }}>
                {bookmarks.map((bookmark, index) => (
                  <Tooltip 
                    key={index} 
                    title={bookmark.label}
                    placement="top"
                  >
                    <BookmarkIcon 
                      sx={{ 
                        position: 'absolute',
                        left: `${(bookmark.time / duration) * 100}%`,
                        transform: 'translateX(-50%)',
                        color: 'primary.main',
                        fontSize: 16,
                        cursor: 'pointer'
                      }}
                      onClick={() => jumpToBookmark(bookmark.time)}
                    />
                  </Tooltip>
                ))}
              </Box>
            )}
            
            {/* Controls */}
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center"
              justifyContent="space-between"
            >
              <ButtonGroup>
                <Tooltip title="Previous Event">
                  <IconButton onClick={() => seekToEvent('prev')}>
                    <SkipPreviousIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rewind 10s">
                  <IconButton onClick={() => seekTo(currentTime - 10000)}>
                    <FastRewindIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={playing ? "Pause" : "Play"}>
                  <IconButton onClick={togglePlayback} color="primary">
                    {playing ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Forward 10s">
                  <IconButton onClick={() => seekTo(currentTime + 10000)}>
                    <FastForwardIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next Event">
                  <IconButton onClick={() => seekToEvent('next')}>
                    <SkipNextIcon />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
              
              <Box>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Speed</InputLabel>
                  <Select
                    value={playbackSpeed}
                    onChange={(e) => changePlaybackSpeed(e.target.value)}
                    label="Speed"
                  >
                    <MenuItem value={0.5}>0.5x</MenuItem>
                    <MenuItem value={1}>1.0x</MenuItem>
                    <MenuItem value={1.5}>1.5x</MenuItem>
                    <MenuItem value={2}>2.0x</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box>
                <Tooltip title="Add Bookmark">
                  <IconButton onClick={addBookmark}>
                    <BookmarkBorderIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Report Issue">
                  <IconButton onClick={reportIssue} color="error">
                    <BugReportIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
          </Box>
          
          {/* Current interactions display */}
          {currentInteractions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Interactions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentInteractions.map((interaction, index) => (
                  <Chip 
                    key={index} 
                    label={`${interaction.type} - ${interaction.element || ''}`}
                    size="small"
                    color={interaction.type === 'click' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
      
      {/* Bookmark/Issue Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {dialogType === 'bookmark' ? 'Add Bookmark' : 'Report Issue'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={dialogType === 'bookmark' ? 'Bookmark Label' : 'Issue Description'}
            fullWidth
            multiline={dialogType === 'issue'}
            rows={dialogType === 'issue' ? 4 : 1}
            value={dialogInput}
            onChange={(e) => setDialogInput(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Time: {formatTime(currentTime)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDialogSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

SessionPlayback.propTypes = {
  sessionId: PropTypes.string.isRequired,
  autoPlay: PropTypes.bool,
  onBookmarkCreate: PropTypes.func,
  onIssueReport: PropTypes.func,
  onError: PropTypes.func
};

export default SessionPlayback; 