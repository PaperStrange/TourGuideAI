import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ButtonGroup,
  IconButton
} from '@mui/material';
import {
  DownloadOutlined as DownloadIcon,
  NotificationsActive as AlertIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  ArrowUpward as TrendUpIcon,
  ArrowDownward as TrendDownIcon,
  Info as InfoIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Person,
  Devices,
  BarChart,
  Ballot,
  Timeline,
  Map,
  VideoLibrary,
  Whatshot
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import analyticsService from '../../services/analytics/AnalyticsService';
import authService from '../../services/AuthService';
import UserActivityChart from './UserActivityChart';
import FeedbackSentimentChart from './FeedbackSentimentChart';
import FeatureUsageChart from './FeatureUsageChart';
import DeviceDistribution from './DeviceDistribution';
import SessionRecording from './SessionRecording';
import HeatmapVisualization from './HeatmapVisualization';

/**
 * Analytics Dashboard Component
 * Displays beta program usage metrics and insights
 */
const AnalyticsDashboard = () => {
  const theme = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [feedbackSentiment, setFeedbackSentiment] = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [geographicData, setGeographicData] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [browserData, setBrowserData] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [exportFormat, setExportFormat] = useState('json');
  const [timeRange, setTimeRange] = useState('7days');
  const [dashboardData, setDashboardData] = useState(null);
  const [showSessionRecordings, setShowSessionRecordings] = useState(false);
  const [showHeatmaps, setShowHeatmaps] = useState(false);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];
  const SENTIMENT_COLORS = {
    positive: '#4caf50',
    neutral: '#9e9e9e', 
    negative: '#f44336'
  };

  // Chart colors
  const colors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    pieColors: [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C',
      '#8884D8', '#83A6ED', '#8DD1E1', '#D0ED57', '#F7DC6F'
    ]
  };

  // Check admin status and initialize data
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await authService.isAdmin();
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          // Initialize analytics tracking
          analyticsService.initGA4();
          
          // Load dashboard data
          await loadDashboardData();
        } else {
          setError('Admin access required to view analytics');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin access');
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, []);

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [
        userActivityData,
        featureUsageData,
        feedbackSentimentData,
        retentionData,
        geographicData,
        deviceData,
        browserData,
        issueData,
        anomaliesData
      ] = await Promise.all([
        analyticsService.getUserActivity(),
        analyticsService.getFeatureUsage(),
        analyticsService.getFeedbackSentiment(),
        analyticsService.getRetentionData(),
        analyticsService.getGeographicData(),
        analyticsService.getDeviceData(),
        analyticsService.getBrowserData(),
        analyticsService.getIssueData(),
        analyticsService.detectAnomalies()
      ]);
      
      // Update state with data
      setUserActivity(userActivityData);
      setFeatureUsage(featureUsageData);
      setFeedbackSentiment(feedbackSentimentData);
      setRetentionData(retentionData);
      setGeographicData(geographicData);
      setDeviceData(deviceData);
      setBrowserData(browserData);
      setIssueData(issueData);
      setAnomalies(anomaliesData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load analytics data');
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle export format change
  const handleExportFormatChange = (event) => {
    setExportFormat(event.target.value);
  };

  // Handle export data
  const handleExportData = async () => {
    try {
      const exportData = await analyticsService.exportData(exportFormat);
      
      // Create a download link
      const dataStr = typeof exportData.data === 'string' 
        ? exportData.data 
        : JSON.stringify(exportData.data, null, 2);
      
      const blob = new Blob([dataStr], { type: exportData.contentType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    }
  };

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);
  
  // Load analytics data based on time range
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would be an API call
      // const data = await analyticsService.getAnalytics(timeRange);
      
      // Mock data for demo
      setTimeout(() => {
        // Generate data based on selected time range
        const data = generateMockData(timeRange);
        setDashboardData(data);
        setLoading(false);
      }, 800); // Simulate network delay
      
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Format number with K, M suffixes
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };
  
  // Get trend indicator component
  const TrendIndicator = ({ value, previousValue }) => {
    const percentChange = previousValue 
      ? ((value - previousValue) / previousValue) * 100
      : 0;
      
    if (Math.abs(percentChange) < 0.1) {
      return null;
    }
    
    const isPositive = percentChange > 0;
    
    return (
      <Box 
        component="span" 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          color: isPositive ? colors.success : colors.error,
          ml: 1,
          fontSize: '0.875rem'
        }}
      >
        {isPositive ? <TrendUpIcon fontSize="small" /> : <TrendDownIcon fontSize="small" />}
        {Math.abs(percentChange).toFixed(1)}%
      </Box>
    );
  };
  
  // Mock data generation
  const generateMockData = (timeRange) => {
    let days = 7;
    
    switch (timeRange) {
      case '30days':
        days = 30;
        break;
      case '90days':
        days = 90;
        break;
      case '7days':
      default:
        days = 7;
        break;
    }
    
    // User activity chart data
    const activityData = Array.from({ length: days }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activeUsers: Math.floor(Math.random() * 50) + 20,
        newUsers: Math.floor(Math.random() * 10) + 1,
        sessions: Math.floor(Math.random() * 100) + 50
      };
    });
    
    // Generate summary metrics
    const currentActiveUsers = activityData.reduce((sum, day) => sum + day.activeUsers, 0);
    const currentNewUsers = activityData.reduce((sum, day) => sum + day.newUsers, 0);
    
    // Previous period for comparison
    const previousActiveUsers = Math.floor(currentActiveUsers * (Math.random() * 0.4 + 0.8));
    const previousNewUsers = Math.floor(currentNewUsers * (Math.random() * 0.4 + 0.8));
    
    // Feedback data
    const feedbackData = [
      { category: 'UI/UX', count: Math.floor(Math.random() * 30) + 15 },
      { category: 'Features', count: Math.floor(Math.random() * 40) + 20 },
      { category: 'Performance', count: Math.floor(Math.random() * 25) + 10 },
      { category: 'Bugs', count: Math.floor(Math.random() * 20) + 5 },
      { category: 'Other', count: Math.floor(Math.random() * 15) + 5 },
    ];
    
    // Feature usage data
    const featureUsageData = [
      { name: 'Route Planning', usage: Math.floor(Math.random() * 80) + 50 },
      { name: 'Map Exploration', usage: Math.floor(Math.random() * 70) + 40 },
      { name: 'Itinerary Builder', usage: Math.floor(Math.random() * 60) + 30 },
      { name: 'Recommendations', usage: Math.floor(Math.random() * 50) + 30 },
      { name: 'Sharing', usage: Math.floor(Math.random() * 40) + 20 },
    ];
    
    // Device breakdown
    const deviceBreakdown = [
      { name: 'Desktop', value: Math.floor(Math.random() * 60) + 30 },
      { name: 'Mobile', value: Math.floor(Math.random() * 40) + 20 },
      { name: 'Tablet', value: Math.floor(Math.random() * 20) + 10 },
    ];
    
    // Top requested features
    const requestedFeatures = [
      { 
        id: 1, 
        feature: 'Offline Maps Support', 
        votes: Math.floor(Math.random() * 40) + 30,
        status: 'planned'
      },
      { 
        id: 2, 
        feature: 'Dark Mode', 
        votes: Math.floor(Math.random() * 35) + 25,
        status: 'in_progress'
      },
      { 
        id: 3, 
        feature: 'Route Sharing', 
        votes: Math.floor(Math.random() * 30) + 20,
        status: 'planned'
      },
      { 
        id: 4, 
        feature: 'Weather Integration', 
        votes: Math.floor(Math.random() * 25) + 15,
        status: 'under_review'
      },
      { 
        id: 5, 
        feature: 'Translation Support', 
        votes: Math.floor(Math.random() * 20) + 10,
        status: 'under_review'
      },
    ];
    
    // Geography data (country distribution)
    const geoData = [
      { country: 'United States', users: Math.floor(Math.random() * 100) + 50 },
      { country: 'United Kingdom', users: Math.floor(Math.random() * 50) + 20 },
      { country: 'Canada', users: Math.floor(Math.random() * 40) + 15 },
      { country: 'Australia', users: Math.floor(Math.random() * 30) + 10 },
      { country: 'Germany', users: Math.floor(Math.random() * 25) + 10 },
      { country: 'France', users: Math.floor(Math.random() * 20) + 10 },
      { country: 'Japan', users: Math.floor(Math.random() * 15) + 5 },
      { country: 'Other', users: Math.floor(Math.random() * 40) + 20 },
    ];
    
    return {
      activityData,
      feedbackData,
      featureUsageData,
      deviceBreakdown,
      requestedFeatures,
      geoData,
      summary: {
        activeUsers: {
          current: currentActiveUsers,
          previous: previousActiveUsers
        },
        newUsers: {
          current: currentNewUsers,
          previous: previousNewUsers
        },
        feedbackCount: feedbackData.reduce((sum, item) => sum + item.count, 0),
        surveyResponses: Math.floor(Math.random() * 200) + 50,
        avgSessionDuration: Math.floor(Math.random() * 15) + 5, // minutes
      }
    };
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'planned':
        return colors.info;
      case 'in_progress':
        return colors.success;
      case 'under_review':
        return colors.warning;
      case 'completed':
        return colors.primary;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'under_review':
        return 'Under Review';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const handleShowSessionRecordings = () => {
    setShowSessionRecordings(true);
    setShowHeatmaps(false);
  };

  const handleShowHeatmaps = () => {
    setShowHeatmaps(true);
    setShowSessionRecordings(false);
  };

  const handleBack = () => {
    setShowSessionRecordings(false);
    setShowHeatmaps(false);
  };

  if (showSessionRecordings) {
    return <SessionRecording onBack={handleBack} />;
  }

  if (showHeatmaps) {
    return <HeatmapVisualization onBack={handleBack} />;
  }

  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Beta Analytics Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Time Range Selector */}
          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              id="time-range-select"
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          
          {/* Refresh Button */}
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            size="small"
            onClick={loadAnalytics}
            disabled={loading}
          >
            Refresh
          </Button>
          
          {/* Export Button */}
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            size="small"
            sx={{ ml: 1 }}
            disabled={loading}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      {/* UX Audit Tools */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          UX Audit Tools
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<VideoLibrary />}
            onClick={handleShowSessionRecordings}
          >
            Session Recordings
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Whatshot />}
            onClick={handleShowHeatmaps}
          >
            Heatmap Visualization
          </Button>
        </Box>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : dashboardData ? (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Users
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="h4" component="div">
                      {formatNumber(dashboardData.summary.activeUsers.current)}
                    </Typography>
                    <TrendIndicator 
                      value={dashboardData.summary.activeUsers.current} 
                      previousValue={dashboardData.summary.activeUsers.previous} 
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    vs. previous period
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    New Users
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="h4" component="div">
                      {formatNumber(dashboardData.summary.newUsers.current)}
                    </Typography>
                    <TrendIndicator 
                      value={dashboardData.summary.newUsers.current} 
                      previousValue={dashboardData.summary.newUsers.previous} 
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    vs. previous period
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Feedback Submissions
                  </Typography>
                  <Typography variant="h4" component="div">
                    {formatNumber(dashboardData.summary.feedbackCount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    across all categories
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg. Session Duration
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardData.summary.avgSessionDuration} min
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    time spent per session
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Tabs for different analytics views */}
          <Paper sx={{ mb: 4 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab icon={<BarChart />} label="Overview" />
              <Tab icon={<Person />} label="User Activity" />
              <Tab icon={<Devices />} label="Devices" />
              <Tab icon={<Ballot />} label="Feedback" />
            </Tabs>
            
            {/* Tab Content */}
            <Box sx={{ p: 3 }}>
              {/* Overview Tab */}
              {activeTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      User Activity Trends
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dashboardData.activityData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="activeUsers"
                            name="Active Users"
                            stroke={colors.primary}
                            activeDot={{ r: 8 }}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="newUsers"
                            name="New Users"
                            stroke={colors.secondary}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="sessions"
                            name="Sessions"
                            stroke={colors.info}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Device Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dashboardData.deviceBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors.pieColors[index % colors.pieColors.length]} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Geographic Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={dashboardData.geoData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="country" 
                            type="category" 
                            tick={{ fontSize: 12 }}
                          />
                          <RechartsTooltip />
                          <RechartsBarChart.Bar 
                            dataKey="users" 
                            name="Users" 
                            fill={colors.primary}
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              
              {/* User Activity Tab */}
              {activeTab === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      User Activity Trends
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dashboardData.activityData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="activeUsers"
                            name="Active Users"
                            stroke={colors.primary}
                            activeDot={{ r: 8 }}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="newUsers"
                            name="New Users"
                            stroke={colors.secondary}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="sessions"
                            name="Sessions"
                            stroke={colors.info}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Device Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dashboardData.deviceBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors.pieColors[index % colors.pieColors.length]} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Geographic Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={dashboardData.geoData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="country" 
                            type="category" 
                            tick={{ fontSize: 12 }}
                          />
                          <RechartsTooltip />
                          <RechartsBarChart.Bar 
                            dataKey="users" 
                            name="Users" 
                            fill={colors.primary}
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              
              {/* Devices Tab */}
              {activeTab === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Device Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dashboardData.deviceBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors.pieColors[index % colors.pieColors.length]} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Geographic Distribution
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={dashboardData.geoData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="country" 
                            type="category" 
                            tick={{ fontSize: 12 }}
                          />
                          <RechartsTooltip />
                          <RechartsBarChart.Bar 
                            dataKey="users" 
                            name="Users" 
                            fill={colors.primary}
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              
              {/* Feedback Tab */}
              {activeTab === 3 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Feedback by Category
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.feedbackData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="category"
                            label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dashboardData.feedbackData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors.pieColors[index % colors.pieColors.length]} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Top Requested Features
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ height: 300 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Feature Request</TableCell>
                            <TableCell align="center">Votes</TableCell>
                            <TableCell align="right">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.requestedFeatures.map((row) => (
                            <TableRow key={row.id} hover>
                              <TableCell>{row.feature}</TableCell>
                              <TableCell align="center">{row.votes}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ 
                                  display: 'inline-block', 
                                  bgcolor: getStatusColor(row.status),
                                  color: '#fff',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.75rem'
                                }}>
                                  {getStatusLabel(row.status)}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Feedback Sentiment Analysis
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexDirection: 'column',
                        height: '100%',
                        color: 'text.secondary'
                      }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          Sentiment Analysis Coming Soon
                        </Typography>
                        <Typography variant="body2">
                          This feature will analyze the sentiment of user feedback to identify trends in user satisfaction.
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
          
          {/* Notes and Disclaimers */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
              This dashboard shows analytics for the beta program. Data is updated daily. For real-time analytics, please use the export feature.
            </Typography>
          </Paper>
        </>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>No data available</Typography>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard; 