import React, { useState, useEffect } from 'react';
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
  Chip
} from '@mui/material';
import {
  DownloadOutlined as DownloadIcon,
  NotificationsActive as AlertIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import analyticsService from '../../services/analytics/AnalyticsService';
import authService from '../../services/AuthService';

/**
 * Analytics Dashboard Component
 * Displays beta program usage metrics and insights
 */
const AnalyticsDashboard = () => {
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

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];
  const SENTIMENT_COLORS = {
    positive: '#4caf50',
    neutral: '#9e9e9e', 
    negative: '#f44336'
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

  // If loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If error
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // If not admin
  if (!isAdmin) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Admin access required to view analytics
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Beta Program Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl variant="outlined" size="small" sx={{ mr: 2, minWidth: 120 }}>
            <InputLabel id="export-format-label">Format</InputLabel>
            <Select
              labelId="export-format-label"
              id="export-format"
              value={exportFormat}
              onChange={handleExportFormatChange}
              label="Format"
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={handleExportData}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AlertIcon sx={{ mr: 1 }} color="warning" />
            Anomaly Alerts
          </Typography>
          <Grid container spacing={2}>
            {anomalies.map((anomaly, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert severity={anomaly.severity || 'warning'}>
                  {anomaly.message}
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dashboard Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="User Activity" />
          <Tab label="Feature Usage" />
          <Tab label="Feedback Analysis" />
          <Tab label="Technical" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* User Activity Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Activity
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Daily active users in the beta program
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={userActivity}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Feature Usage Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Features
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Most used features in the beta program
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={featureUsage}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="feature" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="usage" fill="#82ca9d" name="Usage Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Feedback Sentiment Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback Sentiment
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Distribution of feedback sentiment by category
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={feedbackSentiment}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="positive" name="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                      <Bar dataKey="neutral" name="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                      <Bar dataKey="negative" name="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Retention Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Retention
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Beta user retention rates over time
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={retentionData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#ff7300" name="Retention Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Issue Resolution Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Issue Resolution Status
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Tracking issue reports and resolution rates
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={issueData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Total" />
                      <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* User Activity Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            User Activity Analysis
          </Typography>
          
          {/* Activity Growth Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Daily Active Users
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={userActivity}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          
          {/* Growth Metrics */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" display="block" color="text.secondary">
                    Current Users
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {userActivity.length > 0 ? userActivity[userActivity.length - 1].count : 0}
                  </Typography>
                  <Chip 
                    icon={<TrendingUpIcon />} 
                    label="Active" 
                    color="success" 
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" display="block" color="text.secondary">
                    Growth Rate
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {userActivity.length >= 2 
                      ? `${(((userActivity[userActivity.length - 1].count - userActivity[0].count) / userActivity[0].count) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </Typography>
                  <Chip 
                    icon={<TrendingUpIcon />} 
                    label="Overall" 
                    color="primary" 
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" display="block" color="text.secondary">
                    Daily Average
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {userActivity.length > 0 
                      ? Math.round(userActivity.reduce((acc, item) => acc + item.count, 0) / userActivity.length) 
                      : 0
                    }
                  </Typography>
                  <Chip 
                    label="Users per day" 
                    color="default" 
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" display="block" color="text.secondary">
                    Retention
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {retentionData.length > 0 ? `${retentionData[retentionData.length - 1].rate}%` : '0%'}
                  </Typography>
                  <Chip 
                    label="Current" 
                    color={retentionData.length > 0 && retentionData[retentionData.length - 1].rate > 60 ? "success" : "warning"} 
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Feature Usage Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Feature Usage Analysis
          </Typography>
          
          {/* Feature Usage Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Most Used Features
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={featureUsage}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="usage" fill="#8884d8" name="Usage Count" />
                    <Bar dataKey="growth" fill="#82ca9d" name="Growth %" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          
          {/* Feature Metrics */}
          <Grid container spacing={3}>
            {featureUsage.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="overline" display="block" color="text.secondary">
                      {feature.feature}
                    </Typography>
                    <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                      {feature.usage} uses
                    </Typography>
                    <Chip 
                      icon={<TrendingUpIcon />} 
                      label={`${feature.growth}% growth`} 
                      color={feature.growth > 15 ? "success" : "primary"} 
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Feedback Analysis Tab */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Feedback Analysis
          </Typography>
          
          {/* Sentiment Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Feedback Sentiment by Category
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={feedbackSentiment}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="positive" name="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                    <Bar dataKey="neutral" name="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                    <Bar dataKey="negative" name="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          
          {/* Overall Sentiment */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Overall Sentiment
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: feedbackSentiment.reduce((acc, item) => acc + item.positive, 0) },
                        { name: 'Neutral', value: feedbackSentiment.reduce((acc, item) => acc + item.neutral, 0) },
                        { name: 'Negative', value: feedbackSentiment.reduce((acc, item) => acc + item.negative, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill={SENTIMENT_COLORS.positive} />
                      <Cell fill={SENTIMENT_COLORS.neutral} />
                      <Cell fill={SENTIMENT_COLORS.negative} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Technical Tab */}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Technical Metrics
          </Typography>
          
          <Grid container spacing={3}>
            {/* Device Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Device Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="percentage"
                          nameKey="type"
                          label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Browser Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Browser Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={browserData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="percentage"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {browserData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Geographic Distribution */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Geographic Distribution
                  </Typography>
                  <Box sx={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={geographicData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="region" type="category" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="users" name="Users" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard; 