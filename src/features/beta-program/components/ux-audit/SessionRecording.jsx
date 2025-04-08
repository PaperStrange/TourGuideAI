import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Pagination
} from '@mui/material';
import {
  PlayArrow,
  FilterList,
  Refresh,
  OndemandVideo,
  OpenInNew,
  Search as SearchIcon,
  AccessTime,
  Person,
  Devices,
  Flag,
  Check,
  Clear,
  InfoOutlined,
  CloudDownload
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import hotjarService from '../../services/analytics/HotjarService';
import analyticsService from '../../services/analytics/AnalyticsService';

/**
 * SessionRecording component
 * Displays and manages Hotjar session recordings
 */
const SessionRecording = () => {
  const theme = useTheme();
  
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // State for filtering options
  const [filters, setFilters] = useState({
    userType: 'all',
    duration: 'all',
    device: 'all',
    page: 'all',
    search: ''
  });
  
  // State for recording data
  const [recordings, setRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  
  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // State for consent management
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentStatus, setConsentStatus] = useState({
    consentGiven: false,
    lastUpdated: null
  });
  
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHotjarInitialized, setIsHotjarInitialized] = useState(false);
  
  // State for recording dialog
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  
  // User types for filtering
  const userTypes = [
    { id: 'all', name: 'All Users' },
    { id: 'new', name: 'New Users' },
    { id: 'returning', name: 'Returning Users' },
    { id: 'beta', name: 'Beta Testers' }
  ];
  
  // Duration filters
  const durationFilters = [
    { id: 'all', name: 'All Durations' },
    { id: 'short', name: 'Short (< 1 min)' },
    { id: 'medium', name: 'Medium (1-5 min)' },
    { id: 'long', name: 'Long (> 5 min)' }
  ];
  
  // Device filters
  const deviceFilters = [
    { id: 'all', name: 'All Devices' },
    { id: 'desktop', name: 'Desktop' },
    { id: 'mobile', name: 'Mobile' },
    { id: 'tablet', name: 'Tablet' }
  ];
  
  // Page filters
  const pageFilters = [
    { id: 'all', name: 'All Pages' },
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'search', name: 'Search' },
    { id: 'profile', name: 'Profile' },
    { id: 'settings', name: 'Settings' },
    { id: 'tour_creation', name: 'Tour Creation' }
  ];
  
  // Effect to initialize Hotjar
  useEffect(() => {
    const initHotjar = async () => {
      const initialized = hotjarService.init();
      setIsHotjarInitialized(initialized);
      
      // Check if user has previously given consent
      const storedConsent = localStorage.getItem('hotjar_consent');
      if (storedConsent) {
        const parsedConsent = JSON.parse(storedConsent);
        setConsentStatus({
          consentGiven: parsedConsent.consentGiven,
          lastUpdated: parsedConsent.lastUpdated
        });
        
        if (parsedConsent.consentGiven) {
          hotjarService.optIn();
        } else {
          hotjarService.optOut();
        }
      } else {
        // Show consent dialog if no stored preference
        setConsentDialogOpen(true);
      }
    };
    
    initHotjar();
  }, []);
  
  // Effect to fetch recordings when filters change
  useEffect(() => {
    if (isHotjarInitialized && consentStatus.consentGiven) {
      fetchRecordings();
    }
  }, [
    dateRange.startDate, 
    dateRange.endDate, 
    filters.userType, 
    filters.duration, 
    filters.device, 
    filters.page, 
    pagination.currentPage, 
    isHotjarInitialized, 
    consentStatus.consentGiven
  ]);
  
  // Function to fetch recordings from API
  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the Hotjar API
      // For now, we'll simulate it with analytics service
      const data = await analyticsService.getSessionRecordings(
        dateRange.startDate,
        dateRange.endDate,
        {
          userType: filters.userType,
          duration: filters.duration,
          device: filters.device,
          page: filters.page,
          search: filters.search,
          page: pagination.currentPage,
          limit: pagination.itemsPerPage
        }
      );
      
      setRecordings(data.recordings);
      setPagination({
        ...pagination,
        totalPages: Math.ceil(data.total / pagination.itemsPerPage),
        totalItems: data.total
      });
    } catch (err) {
      console.error('Error fetching session recordings:', err);
      setError('Failed to load session recordings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle date change
  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };
  
  // Handle search
  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      setFilters(prev => ({
        ...prev,
        search: event.target.value
      }));
      
      // Reset to first page when search changes
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
    }
  };
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPagination(prev => ({
      ...prev,
      currentPage: value
    }));
  };
  
  // Handle consent decision
  const handleConsent = (consent) => {
    const consentData = {
      consentGiven: consent,
      lastUpdated: new Date().toISOString()
    };
    
    setConsentStatus(consentData);
    localStorage.setItem('hotjar_consent', JSON.stringify(consentData));
    
    if (consent) {
      hotjarService.optIn();
    } else {
      hotjarService.optOut();
    }
    
    setConsentDialogOpen(false);
    
    if (consent) {
      fetchRecordings();
    }
  };
  
  // Handle recording selection
  const handleRecordingSelect = (recording) => {
    setSelectedRecording(recording);
    setRecordingDialogOpen(true);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchRecordings();
  };
  
  // Open Hotjar dashboard in new tab
  const openHotjarDashboard = () => {
    const url = hotjarService.getRecordingsUrl(dateRange.startDate, dateRange.endDate);
    window.open(url, '_blank');
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Render device icon based on device type
  const renderDeviceIcon = (device) => {
    switch (device.toLowerCase()) {
      case 'desktop':
        return <Tooltip title="Desktop"><Devices sx={{ color: theme.palette.info.main }} /></Tooltip>;
      case 'mobile':
        return <Tooltip title="Mobile"><Devices sx={{ color: theme.palette.warning.main }} /></Tooltip>;
      case 'tablet':
        return <Tooltip title="Tablet"><Devices sx={{ color: theme.palette.success.main }} /></Tooltip>;
      default:
        return <Tooltip title="Unknown Device"><Devices sx={{ color: theme.palette.grey[500] }} /></Tooltip>;
    }
  };
  
  return (
    <Box sx={{ py: 3 }}>
      {/* Consent Dialog */}
      <Dialog open={consentDialogOpen} onClose={() => setConsentDialogOpen(false)}>
        <DialogTitle>Session Recording Consent</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            We use Hotjar to record user sessions to improve our application. This helps us understand how users 
            interact with our application and identify usability issues.
          </Typography>
          <Typography variant="body1" gutterBottom>
            No personally identifiable information is collected. You can opt out at any time.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            By consenting, you agree to allow us to record your sessions and collect anonymized usage data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConsent(false)} color="error">
            Opt Out
          </Button>
          <Button onClick={() => handleConsent(true)} variant="contained" color="primary">
            I Consent
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Recording Player Dialog */}
      <Dialog 
        open={recordingDialogOpen} 
        onClose={() => setRecordingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRecording && (
          <>
            <DialogTitle>
              Session Recording: {selectedRecording.id}
              <Typography variant="body2" color="text.secondary">
                {new Date(selectedRecording.date).toLocaleString()} • {formatDuration(selectedRecording.duration)}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                {/* This would be an iframe to the actual Hotjar recording */}
                <Box
                  component="iframe"
                  src={`https://insights.hotjar.com/record/${selectedRecording.id}`}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              </Box>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Recording Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">User</Typography>
                  <Typography variant="body1">{selectedRecording.userId || 'Anonymous'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Device</Typography>
                  <Typography variant="body1">{selectedRecording.device}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Browser</Typography>
                  <Typography variant="body1">{selectedRecording.browser}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Country</Typography>
                  <Typography variant="body1">{selectedRecording.country}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Pages Visited</Typography>
                  <Box sx={{ mt: 1 }}>
                    {selectedRecording.pages.map((page, index) => (
                      <Chip 
                        key={index} 
                        label={page} 
                        sx={{ mr: 1, mb: 1 }} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                startIcon={<CloudDownload />}
                onClick={() => window.open(`https://insights.hotjar.com/record/${selectedRecording.id}/download`, '_blank')}
              >
                Download
              </Button>
              <Button 
                startIcon={<OpenInNew />}
                onClick={() => window.open(`https://insights.hotjar.com/record/${selectedRecording.id}`, '_blank')}
              >
                Open in Hotjar
              </Button>
              <Button onClick={() => setRecordingDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">Session Recordings</Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<OpenInNew />}
              onClick={openHotjarDashboard}
            >
              Open in Hotjar
            </Button>
            <IconButton color="primary" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>
        
        {!isHotjarInitialized && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Hotjar integration is not initialized. Session recording features may be limited.
          </Alert>
        )}
        
        {!consentStatus.consentGiven && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => setConsentDialogOpen(true)}
              >
                Manage Consent
              </Button>
            }
          >
            Session recording is currently disabled. Please provide consent to enable this feature.
          </Alert>
        )}
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <TextField
              label="Search"
              name="search"
              onKeyDown={handleSearch}
              placeholder="Search by URL, user ID, or action..."
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="user-type-select-label">User Type</InputLabel>
              <Select
                labelId="user-type-select-label"
                id="user-type-select"
                name="userType"
                value={filters.userType}
                label="User Type"
                onChange={handleFilterChange}
              >
                {userTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="duration-select-label">Duration</InputLabel>
              <Select
                labelId="duration-select-label"
                id="duration-select"
                name="duration"
                value={filters.duration}
                label="Duration"
                onChange={handleFilterChange}
              >
                {durationFilters.map(duration => (
                  <MenuItem key={duration.id} value={duration.id}>{duration.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="device-select-label">Device</InputLabel>
              <Select
                labelId="device-select-label"
                id="device-select"
                name="device"
                value={filters.device}
                label="Device"
                onChange={handleFilterChange}
              >
                {deviceFilters.map(device => (
                  <MenuItem key={device.id} value={device.id}>{device.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="page-select-label">Page</InputLabel>
              <Select
                labelId="page-select-label"
                id="page-select"
                name="page"
                value={filters.page}
                label="Page"
                onChange={handleFilterChange}
              >
                {pageFilters.map(page => (
                  <MenuItem key={page.id} value={page.id}>{page.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="5%"></TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Device</TableCell>
                    <TableCell>Pages</TableCell>
                    <TableCell width="10%">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recordings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No recordings found. Try adjusting your filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recordings.map((recording) => (
                      <TableRow key={recording.id} hover>
                        <TableCell>
                          <IconButton 
                            color="primary" 
                            size="small"
                            onClick={() => handleRecordingSelect(recording)}
                          >
                            <PlayArrow />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(recording.date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(recording.date).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Person sx={{ mr: 1, color: recording.userType === 'new' ? theme.palette.success.main : theme.palette.info.main }} />
                            <Box>
                              <Typography variant="body2">
                                {recording.userId || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {recording.userType === 'new' ? 'New User' : 'Returning User'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTime sx={{ mr: 1, fontSize: '1rem', color: theme.palette.text.secondary }} />
                            <Typography variant="body2">
                              {formatDuration(recording.duration)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {renderDeviceIcon(recording.device)}
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {recording.device}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {recording.pages.slice(0, 2).map((page, index) => (
                              <Chip 
                                key={index} 
                                label={page} 
                                size="small" 
                                variant="outlined"
                              />
                            ))}
                            {recording.pages.length > 2 && (
                              <Chip 
                                label={`+${recording.pages.length - 2}`} 
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Recording">
                            <IconButton 
                              color="primary" 
                              size="small"
                              onClick={() => handleRecordingSelect(recording)}
                            >
                              <OndemandVideo />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open in Hotjar">
                            <IconButton 
                              size="small"
                              onClick={() => window.open(`https://insights.hotjar.com/record/${recording.id}`, '_blank')}
                            >
                              <OpenInNew />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {recordings.length} of {pagination.totalItems} recordings
              </Typography>
              <Pagination 
                count={pagination.totalPages} 
                page={pagination.currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>About Session Recordings</Typography>
        <Typography variant="body2" paragraph>
          Session recordings capture how users interact with your application. They help identify usability issues,
          understand user behavior, and improve the overall user experience.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Privacy Considerations:</Typography>
          <ul>
            <li>
              <Typography variant="body2">
                All sensitive information is automatically masked.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                User consent is required before recording sessions.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Recordings do not capture passwords, payment information, or other sensitive data.
              </Typography>
            </li>
          </ul>
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined"
            color="primary"
            startIcon={<InfoOutlined />}
            onClick={() => window.open('https://help.hotjar.com/hc/en-us/articles/115011639927-What-is-Session-Recording-', '_blank')}
          >
            Learn More About Hotjar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SessionRecording; 