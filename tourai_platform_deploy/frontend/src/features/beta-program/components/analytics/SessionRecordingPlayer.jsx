import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Slider, 
  Stack,
  Skeleton,
  Chip,
  Tooltip,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  FastForward,
  FastRewind,
  Fullscreen,
  SpeedOutlined,
  FlagOutlined,
  Info,
  BugReport,
  SentimentDissatisfied,
  SentimentSatisfied
} from '@mui/icons-material';

const SessionRecordingPlayer = ({ sessionData, onTimelinePointClick }) => {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorPoints, setErrorPoints] = useState([]);
  const [eventMarkers, setEventMarkers] = useState([]);
  
  // Setup player when session data changes
  useEffect(() => {
    if (!sessionData) return;
    
    setLoading(true);
    
    // In a real implementation, we'd load the actual session recording data
    // For demo purposes, set up a simulated recording with a duration
    const timer = setTimeout(() => {
      setDuration(sessionData.duration || 300); // Default 5 minutes if not specified
      
      // Set up simulated error points and events
      if (sessionData.events) {
        const errors = sessionData.events.filter(e => e.type === 'error');
        const events = sessionData.events.filter(e => e.type !== 'error');
        
        setErrorPoints(errors);
        setEventMarkers(events);
      }
      
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [sessionData]);
  
  // Handle playback logic
  useEffect(() => {
    let interval;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prevTime => {
          const nextTime = prevTime + (1 * playbackRate);
          if (nextTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return nextTime;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, duration, playbackRate]);
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSliderChange = (_, newValue) => {
    setCurrentTime(newValue);
  };
  
  const handleFastForward = () => {
    setCurrentTime(prevTime => Math.min(prevTime + 10, duration));
  };
  
  const handleRewind = () => {
    setCurrentTime(prevTime => Math.max(prevTime - 10, 0));
  };
  
  const handlePlaybackRateChange = () => {
    // Cycle through playback rates: 1 -> 1.5 -> 2 -> 0.5 -> 1
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };
  
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const renderMarker = (event) => {
    const position = (event.timestamp / duration) * 100;
    
    let icon;
    switch(event.category) {
      case 'error':
        icon = <BugReport fontSize="small" color="error" />;
        break;
      case 'navigation':
        icon = <FlagOutlined fontSize="small" color="primary" />;
        break;
      case 'interaction':
        icon = <Info fontSize="small" color="action" />;
        break;
      case 'feedback':
        icon = event.sentiment > 0 
          ? <SentimentSatisfied fontSize="small" color="success" />
          : <SentimentDissatisfied fontSize="small" color="warning" />;
        break;
      default:
        icon = <Info fontSize="small" />;
    }
    
    return (
      <Tooltip 
        key={event.id} 
        title={`${event.description} (${formatTime(event.timestamp)})`}
        placement="top"
      >
        <Box
          sx={{
            position: 'absolute',
            left: `${position}%`,
            transform: 'translateX(-50%)',
            bottom: '10px',
            cursor: 'pointer',
            zIndex: 2
          }}
          onClick={() => onTimelinePointClick && onTimelinePointClick(event)}
        >
          {icon}
        </Box>
      </Tooltip>
    );
  };
  
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Typography variant="h6" component="h3" gutterBottom>
        {sessionData ? (
          <>Session Recording {sessionData.id}</>
        ) : 'No session selected'}
      </Typography>
      
      {loading ? (
        <>
          <Skeleton variant="rectangular" width="100%" height={320} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="100%" height={40} />
            <Skeleton variant="rectangular" width="100%" height={40} />
          </Box>
        </>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Box 
            ref={playerRef}
            sx={{ 
              width: '100%', 
              height: 320, 
              bgcolor: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
              position: 'relative',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            {/* This would be replaced with actual session replay */}
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0.1 
            }}>
              {/* Simulated page content */}
              <Box sx={{ 
                width: '100%', 
                height: '40px', 
                bgcolor: 'grey.300', 
                mb: 1 
              }} />
              <Box sx={{ 
                width: '80%', 
                height: '100px', 
                bgcolor: 'grey.100', 
                mb: 1, 
                mx: 'auto' 
              }} />
              <Box sx={{ 
                width: '90%', 
                height: '40px', 
                bgcolor: 'grey.300', 
                mb: 1, 
                mx: 'auto' 
              }} />
              <Box sx={{ 
                width: '60%', 
                height: '30px', 
                bgcolor: 'primary.light', 
                mb: 1, 
                mx: 'auto' 
              }} />
            </Box>
            
            {/* Simulated cursor position based on current time */}
            <Box 
              sx={{
                position: 'absolute',
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: 'error.main',
                transform: `translate(${Math.sin(currentTime/5) * 100}px, ${Math.cos(currentTime/3) * 80}px)`,
                transition: 'transform 0.5s ease',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                opacity: 0.8
              }}
            />
            
            <Typography variant="h6" color="white">
              {sessionData.browser} on {sessionData.device}
              <Typography component="span" display="block" variant="body2" color="grey.400">
                {sessionData.url}
              </Typography>
            </Typography>
          </Box>
          
          <Box sx={{ px: 2 }}>
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              sx={{ mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Slider
                  value={currentTime}
                  max={duration}
                  onChange={handleSliderChange}
                  aria-label="session timeline"
                  size="small"
                />
                
                {/* Render event markers on the timeline */}
                {eventMarkers.map(renderMarker)}
                {errorPoints.map(renderMarker)}
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {formatTime(duration)}
              </Typography>
            </Stack>
            
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center" 
              justifyContent="space-between"
            >
              <Box>
                <IconButton onClick={handleRewind} size="small">
                  <FastRewind />
                </IconButton>
                
                <IconButton onClick={handlePlayPause} size="small">
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
                
                <IconButton onClick={handleFastForward} size="small">
                  <FastForward />
                </IconButton>
                
                <Tooltip title={`Playback speed: ${playbackRate}x`}>
                  <IconButton onClick={handlePlaybackRateChange} size="small">
                    <Badge 
                      badgeContent={playbackRate + 'x'} 
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: '16px', minWidth: '16px' } }}
                    >
                      <SpeedOutlined />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Box>
                <Tooltip title="View fullscreen">
                  <IconButton size="small">
                    <Fullscreen />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                size="small" 
                icon={<FlagOutlined />} 
                label={`${eventMarkers.filter(e => e.category === 'navigation').length} Page Views`} 
              />
              <Chip 
                size="small" 
                icon={<Info />} 
                label={`${eventMarkers.filter(e => e.category === 'interaction').length} Interactions`} 
              />
              <Chip 
                size="small" 
                icon={<BugReport />} 
                label={`${errorPoints.length} Errors`} 
                color={errorPoints.length > 0 ? "error" : "default"}
              />
              <Chip 
                size="small" 
                icon={<SentimentSatisfied />} 
                label={`${eventMarkers.filter(e => e.category === 'feedback').length} Feedback`} 
              />
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

SessionRecordingPlayer.propTypes = {
  sessionData: PropTypes.shape({
    id: PropTypes.string,
    url: PropTypes.string,
    duration: PropTypes.number,
    browser: PropTypes.string,
    device: PropTypes.string,
    events: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        category: PropTypes.string.isRequired,
        timestamp: PropTypes.number.isRequired,
        description: PropTypes.string,
        sentiment: PropTypes.number
      })
    )
  }),
  onTimelinePointClick: PropTypes.func
};

export default SessionRecordingPlayer; 