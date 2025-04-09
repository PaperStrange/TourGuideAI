import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Alert,
  TextField,
  Button,
  Tooltip,
  IconButton,
  Grid
} from '@mui/material';
import { InfoOutlined, FileDownload, Refresh } from '@mui/icons-material';
import h337 from 'heatmap.js'; // Note: This library would need to be installed

// Corrected path for AnalyticsService
import { analyticsService } from '../../services/analytics/AnalyticsService';

const UXHeatmap = () => {
  // Refs
  const heatmapRef = useRef(null);
  const heatmapInstanceRef = useRef(null);
  
  // State for view selection
  const [selectedView, setSelectedView] = useState('dashboard');
  const [interactionType, setInteractionType] = useState('clicks');
  const [timeframe, setTimeframe] = useState('7days');
  const [userSegment, setUserSegment] = useState('all');
  
  // State for custom dates
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for heatmap data
  const [heatmapData, setHeatmapData] = useState({
    screenshot: '',
    interactions: []
  });
  
  // State for metrics
  const [metrics, setMetrics] = useState({
    totalInteractions: 0,
    uniqueUsers: 0,
    averageTimeSpent: 0,
    mostInteractedElement: ''
  });
  
  // Available views
  const views = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'search', name: 'Search Page' },
    { id: 'profile', name: 'User Profile' },
    { id: 'settings', name: 'Settings' },
    { id: 'tour_creation', name: 'Tour Creation' },
    { id: 'tour_details', name: 'Tour Details' },
    { id: 'checkout', name: 'Checkout' }
  ];
  
  // Interaction types
  const interactionTypes = [
    { id: 'clicks', name: 'Mouse Clicks' },
    { id: 'moves', name: 'Mouse Movement' },
    { id: 'scrolls', name: 'Scrolling' },
    { id: 'hovers', name: 'Hover Time' },
    { id: 'taps', name: 'Mobile Taps' }
  ];
  
  // Timeframes
  const timeframes = [
    { id: '24hours', name: 'Last 24 Hours' },
    { id: '7days', name: 'Last 7 Days' },
    { id: '30days', name: 'Last 30 Days' },
    { id: 'custom', name: 'Custom Range' }
  ];
  
  // User segments
  const userSegments = [
    { id: 'all', name: 'All Users' },
    { id: 'new', name: 'New Users' },
    { id: 'returning', name: 'Returning Users' },
    { id: 'beta', name: 'Beta Users' },
    { id: 'power', name: 'Power Users' }
  ];
  
  // Effect to initialize heatmap and load data
  useEffect(() => {
    if (heatmapRef.current && !heatmapInstanceRef.current) {
      // Initialize the heatmap instance
      heatmapInstanceRef.current = h337.create({
        container: heatmapRef.current,
        radius: 20,
        maxOpacity: 0.7,
        minOpacity: 0.1,
        blur: 0.75
      });
    }
    
    fetchHeatmapData();
  }, [selectedView, interactionType, timeframe, userSegment, 
      timeframe === 'custom' && customDateRange.startDate, 
      timeframe === 'custom' && customDateRange.endDate]);
  
  // Function to fetch heatmap data
  const fetchHeatmapData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Determine date range based on timeframe
      let startDate, endDate;
      
      if (timeframe === 'custom') {
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
      } else if (timeframe === '24hours') {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      } else if (timeframe === '7days') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      } else if (timeframe === '30days') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      }
      
      // Fetch the data
      const data = await analyticsService.getHeatmapData(
        selectedView, 
        interactionType, 
        startDate, 
        endDate, 
        userSegment
      );
      
      const interactionMetrics = await analyticsService.getInteractionMetrics(
        selectedView, 
        interactionType, 
        startDate, 
        endDate, 
        userSegment
      );
      
      setHeatmapData(data);
      setMetrics(interactionMetrics);
      
      // Update the heatmap
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current.setData({
          max: data.interactions.length > 0 ? Math.max(...data.interactions.map(point => point.value)) : 10,
          data: data.interactions
        });
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError('Failed to load heatmap data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle view change
  const handleViewChange = (event) => {
    setSelectedView(event.target.value);
  };
  
  // Handle interaction type change
  const handleInteractionTypeChange = (event) => {
    setInteractionType(event.target.value);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };
  
  // Handle user segment change
  const handleUserSegmentChange = (event) => {
    setUserSegment(event.target.value);
  };
  
  // Handle custom date change
  const handleCustomDateChange = (event) => {
    const { name, value } = event.target;
    setCustomDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchHeatmapData();
  };
  
  // Handle download button click
  const handleDownload = () => {
    // This would typically generate a report or download the heatmap image
    const canvas = document.querySelector('#heatmap-container canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `ux-heatmap-${selectedView}-${interactionType}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">UX Interaction Heatmap</Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} color="primary" size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Heatmap">
              <IconButton onClick={handleDownload} color="primary" size="small">
                <FileDownload />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="view-select-label">View</InputLabel>
              <Select
                labelId="view-select-label"
                id="view-select"
                value={selectedView}
                label="View"
                onChange={handleViewChange}
              >
                {views.map(view => (
                  <MenuItem key={view.id} value={view.id}>{view.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="interaction-type-select-label">Interaction Type</InputLabel>
              <Select
                labelId="interaction-type-select-label"
                id="interaction-type-select"
                value={interactionType}
                label="Interaction Type"
                onChange={handleInteractionTypeChange}
              >
                {interactionTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-select-label"
                id="timeframe-select"
                value={timeframe}
                label="Timeframe"
                onChange={handleTimeframeChange}
              >
                {timeframes.map(tf => (
                  <MenuItem key={tf.id} value={tf.id}>{tf.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="user-segment-select-label">User Segment</InputLabel>
              <Select
                labelId="user-segment-select-label"
                id="user-segment-select"
                value={userSegment}
                label="User Segment"
                onChange={handleUserSegmentChange}
              >
                {userSegments.map(segment => (
                  <MenuItem key={segment.id} value={segment.id}>{segment.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {timeframe === 'custom' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  name="startDate"
                  value={customDateRange.startDate}
                  onChange={handleCustomDateChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  name="endDate"
                  value={customDateRange.endDate}
                  onChange={handleCustomDateChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
            </>
          )}
        </Grid>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="h6">{metrics.totalInteractions.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Total Interactions</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="h6">{metrics.uniqueUsers.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Unique Users</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="h6">{metrics.averageTimeSpent}s</Typography>
                <Typography variant="body2" color="text.secondary">Avg. Time Spent</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="h6" noWrap sx={{ maxWidth: '100%' }} title={metrics.mostInteractedElement}>
                  {metrics.mostInteractedElement.length > 15 
                    ? `${metrics.mostInteractedElement.substring(0, 15)}...` 
                    : metrics.mostInteractedElement}
                </Typography>
                <Typography variant="body2" color="text.secondary">Most Interacted Element</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        <Box 
          id="heatmap-container"
          ref={heatmapRef} 
          sx={{ 
            position: 'relative', 
            width: '100%', 
            height: 600, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Screenshot of the interface as background */}
              <Box 
                component="img" 
                src={heatmapData.screenshot} 
                alt={`${selectedView} screenshot`}
                sx={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  filter: 'brightness(0.8)'
                }} 
              />
              
              {/* Heatmap is rendered on top of this element */}
            </>
          )}
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Heatmap shows the intensity of user interactions. Red areas indicate high activity, blue areas indicate low activity.">
            <IconButton size="small">
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default UXHeatmap; 