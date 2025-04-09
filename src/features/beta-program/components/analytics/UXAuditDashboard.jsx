import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  Alert,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import HeatmapVisualization from './HeatmapVisualization';
import { AnalyticsService } from '../../services/analytics/AnalyticsService';
import { 
  Timeline, 
  PlayArrow, 
  Pause, 
  SkipNext, 
  SkipPrevious, 
  Speed 
} from '@mui/icons-material';

const analyticsService = new AnalyticsService();

const UXAuditDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getRecordedSessions();
        setSessions(data);
        
        if (data.length > 0) {
          setSelectedSession(data[0].id);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load session data. Please try again later.');
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchPages = async () => {
      if (!selectedSession) return;
      
      try {
        const data = await analyticsService.getSessionPages(selectedSession);
        setPages(data);
        
        if (data.length > 0) {
          setSelectedPage(data[0].url);
        }
      } catch (err) {
        setError('Failed to load page data for the selected session.');
      }
    };

    fetchPages();
  }, [selectedSession]);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      if (!selectedSession || !selectedPage) return;
      
      try {
        setLoading(true);
        const data = await analyticsService.getHeatmapData(selectedSession, selectedPage);
        setHeatmapData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load heatmap data.');
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [selectedSession, selectedPage]);

  useEffect(() => {
    if (selectedSession) {
      try {
        const session = sessions.find(s => s.id === selectedSession);
        if (session) {
          setSessionDuration(session.duration);
        }
      } catch (err) {
        console.error('Error setting session duration:', err);
      }
    }
  }, [selectedSession, sessions]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSessionChange = (event) => {
    setSelectedSession(event.target.value);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handlePageChange = (event) => {
    setSelectedPage(event.target.value);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (event) => {
    setPlaybackSpeed(event.target.value);
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(currentTime + 10, sessionDuration));
  };

  const handleSkipBackward = () => {
    setCurrentTime(Math.max(currentTime - 10, 0));
  };

  const handleTimelineChange = (event) => {
    setCurrentTime(Number(event.target.value));
  };

  useEffect(() => {
    let timer;
    if (isPlaying && currentTime < sessionDuration) {
      timer = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + (0.1 * playbackSpeed);
          if (newTime >= sessionDuration) {
            clearInterval(timer);
            setIsPlaying(false);
            return sessionDuration;
          }
          return newTime;
        });
      }, 100);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, sessionDuration]);

  if (loading && !heatmapData && !sessions.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        UX Audit Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Heatmap Visualization" />
          <Tab label="Session Recording" />
        </Tabs>
        
        <Box p={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Session</InputLabel>
                <Select
                  value={selectedSession || ''}
                  onChange={handleSessionChange}
                  label="Session"
                >
                  {sessions.map(session => (
                    <MenuItem key={session.id} value={session.id}>
                      {session.user} - {new Date(session.timestamp).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Page</InputLabel>
                <Select
                  value={selectedPage || ''}
                  onChange={handlePageChange}
                  label="Page"
                  disabled={!selectedSession || pages.length === 0}
                >
                  {pages.map(page => (
                    <MenuItem key={page.url} value={page.url}>
                      {page.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {activeTab === 0 && (
            <Box mt={2}>
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : heatmapData ? (
                <HeatmapVisualization data={heatmapData} pageUrl={selectedPage} />
              ) : (
                <Alert severity="info">
                  No heatmap data available for the selected session and page.
                </Alert>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box mt={2}>
              {selectedSession ? (
                <>
                  <Box 
                    sx={{ 
                      width: '100%', 
                      height: '400px', 
                      bgcolor: 'grey.100', 
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      mb: 2
                    }}
                  >
                    {loading ? (
                      <CircularProgress />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {selectedPage ? 
                          `Session playback at ${Math.floor(currentTime / 60)}:${(currentTime % 60).toFixed(0).padStart(2, '0')}` : 
                          'Select a page to view session recording'}
                      </Typography>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Button 
                      onClick={handleSkipBackward}
                      disabled={!selectedPage || currentTime <= 0}
                    >
                      <SkipPrevious />
                    </Button>
                    
                    <Button 
                      onClick={handlePlayPause}
                      disabled={!selectedPage}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </Button>
                    
                    <Button 
                      onClick={handleSkipForward}
                      disabled={!selectedPage || currentTime >= sessionDuration}
                    >
                      <SkipNext />
                    </Button>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                      <Speed sx={{ mr: 1 }} />
                      <Select
                        value={playbackSpeed}
                        onChange={handleSpeedChange}
                        size="small"
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value={0.5}>0.5x</MenuItem>
                        <MenuItem value={1}>1x</MenuItem>
                        <MenuItem value={1.5}>1.5x</MenuItem>
                        <MenuItem value={2}>2x</MenuItem>
                      </Select>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
                    </Typography>
                    
                    <Box sx={{ flexGrow: 1, mx: 2 }}>
                      <input
                        type="range"
                        min={0}
                        max={sessionDuration}
                        step={0.1}
                        value={currentTime}
                        onChange={handleTimelineChange}
                        style={{ width: '100%' }}
                        disabled={!selectedPage}
                      />
                    </Box>
                    
                    <Typography variant="body2">
                      {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toFixed(0).padStart(2, '0')}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Alert severity="info">
                  No sessions available. User interactions need to be recorded first.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default UXAuditDashboard; 