import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Comment as CommentIcon,
  FilterList as FilterIcon,
  CloudDownload as DownloadIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  SentimentVerySatisfied as HappyIcon,
  SentimentNeutral as NeutralIcon,
  SentimentVeryDissatisfied as SadIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import AnalyticsService from '../../services/AnalyticsService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

/**
 * User Sentiment Dashboard
 * 
 * A dashboard for analyzing user sentiment from feedback, surveys,
 * and interactions across the application.
 */
const UserSentimentDashboard = () => {
  // State for main component
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [feedbackSource, setFeedbackSource] = useState('all');
  const [topKeywords, setTopKeywords] = useState([]);
  const [topIssues, setTopIssues] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [sentimentTrend, setSentimentTrend] = useState([]);
  
  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' }
  ];
  
  // Feedback source options
  const feedbackSourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'surveys', label: 'Surveys' },
    { value: 'in-app', label: 'In-App Feedback' },
    { value: 'support', label: 'Support Tickets' },
    { value: 'reviews', label: 'App Reviews' }
  ];
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [
          sentimentData,
          keywordsData,
          issuesData,
          feedbackData,
          trendData
        ] = await Promise.all([
          AnalyticsService.getSentimentOverview(timeRange, feedbackSource),
          AnalyticsService.getTopSentimentKeywords(timeRange, feedbackSource),
          AnalyticsService.getTopIssues(timeRange, feedbackSource),
          AnalyticsService.getRecentFeedback(feedbackSource, 10),
          AnalyticsService.getSentimentTrend(timeRange, feedbackSource)
        ]);
        
        setSentimentData(sentimentData);
        setTopKeywords(keywordsData);
        setTopIssues(issuesData);
        setRecentFeedback(feedbackData);
        setSentimentTrend(trendData);
      } catch (err) {
        console.error('Error fetching sentiment data:', err);
        setError('Failed to load sentiment data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, feedbackSource]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Handle feedback source change
  const handleFeedbackSourceChange = (event) => {
    setFeedbackSource(event.target.value);
  };
  
  // Handle export data
  const handleExportData = () => {
    // Implementation for data export would go here
    console.log('Exporting sentiment data...');
  };
  
  // Get appropriate icon for sentiment
  const getSentimentIcon = (sentiment) => {
    if (sentiment === 'positive') {
      return <HappyIcon color="success" />;
    } else if (sentiment === 'neutral') {
      return <NeutralIcon color="action" />;
    } else {
      return <SadIcon color="error" />;
    }
  };
  
  // Get appropriate icon for trend
  const getTrendIcon = (trend) => {
    if (trend === 'up') {
      return <TrendingUpIcon color="success" />;
    } else if (trend === 'down') {
      return <TrendingDownIcon color="error" />;
    } else {
      return <TrendingFlatIcon color="action" />;
    }
  };
  
  // Get color for sentiment
  const getSentimentColor = (sentiment) => {
    if (sentiment === 'positive') {
      return '#4CAF50'; // Green
    } else if (sentiment === 'neutral') {
      return '#FFC107'; // Yellow
    } else {
      return '#F44336'; // Red
    }
  };
  
  // Get background color for sentiment
  const getSentimentBgColor = (sentiment) => {
    if (sentiment === 'positive') {
      return 'rgba(76, 175, 80, 0.1)';
    } else if (sentiment === 'neutral') {
      return 'rgba(255, 193, 7, 0.1)';
    } else {
      return 'rgba(244, 67, 54, 0.1)';
    }
  };
  
  // Prepare chart data for sentiment distribution
  const getSentimentChartData = () => {
    if (!sentimentData) return null;
    
    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [
        {
          data: [
            sentimentData.positive,
            sentimentData.neutral,
            sentimentData.negative
          ],
          backgroundColor: [
            '#4CAF50', // Green for positive
            '#FFC107', // Yellow for neutral
            '#F44336'  // Red for negative
          ],
          borderColor: [
            '#388E3C',
            '#FFA000',
            '#D32F2F'
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Prepare chart data for sentiment trend
  const getTrendChartData = () => {
    if (!sentimentTrend || !sentimentTrend.dates) return null;
    
    return {
      labels: sentimentTrend.dates,
      datasets: [
        {
          label: 'Positive',
          data: sentimentTrend.positive,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Neutral',
          data: sentimentTrend.neutral,
          borderColor: '#FFC107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Negative',
          data: sentimentTrend.negative,
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };
  
  // Prepare chart data for topic sentiment
  const getTopicSentimentChartData = () => {
    if (!sentimentData || !sentimentData.topicSentiment) return null;
    
    const topics = Object.keys(sentimentData.topicSentiment);
    const positiveData = [];
    const neutralData = [];
    const negativeData = [];
    
    topics.forEach(topic => {
      const data = sentimentData.topicSentiment[topic];
      const total = data.positive + data.neutral + data.negative;
      
      positiveData.push((data.positive / total) * 100);
      neutralData.push((data.neutral / total) * 100);
      negativeData.push((data.negative / total) * 100);
    });
    
    return {
      labels: topics,
      datasets: [
        {
          label: 'Positive',
          data: positiveData,
          backgroundColor: '#4CAF50',
        },
        {
          label: 'Neutral',
          data: neutralData,
          backgroundColor: '#FFC107',
        },
        {
          label: 'Negative',
          data: negativeData,
          backgroundColor: '#F44336',
        }
      ]
    };
  };
  
  // Chart options for sentiment pie chart
  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };
  
  // Chart options for trend chart
  const trendChartOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}%`;
          }
        }
      }
    },
    scales: {
      y: {
        stacked: false,
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage'
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };
  
  // Chart options for topic sentiment chart
  const topicChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          User Sentiment Analysis
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            sx={{ ml: 1 }}
          >
            Export Data
          </Button>
        </Box>
      </Box>
      
      {/* Filter controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="time-range-label">Time Range</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                label="Time Range"
                onChange={handleTimeRangeChange}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="feedback-source-label">Feedback Source</InputLabel>
              <Select
                labelId="feedback-source-label"
                value={feedbackSource}
                label="Feedback Source"
                onChange={handleFeedbackSourceChange}
              >
                {feedbackSourceOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Sentiment summary cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderLeft: '4px solid', 
              borderColor: '#4CAF50',
              height: '100%'
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Positive Sentiment
                  </Typography>
                  <Typography variant="h4">
                    {sentimentData?.positivePercentage}%
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'success.light',
                    width: 40,
                    height: 40
                  }}
                >
                  <HappyIcon />
                </Avatar>
              </Box>
              
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(sentimentData?.positiveTrend)}
                <Typography variant="body2" ml={0.5}>
                  {sentimentData?.positiveTrendValue}% {sentimentData?.positiveTrend === 'up' ? 'increase' : sentimentData?.positiveTrend === 'down' ? 'decrease' : 'no change'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderLeft: '4px solid', 
              borderColor: '#FFC107',
              height: '100%'
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Neutral Sentiment
                  </Typography>
                  <Typography variant="h4">
                    {sentimentData?.neutralPercentage}%
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'warning.light',
                    width: 40,
                    height: 40
                  }}
                >
                  <NeutralIcon />
                </Avatar>
              </Box>
              
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(sentimentData?.neutralTrend)}
                <Typography variant="body2" ml={0.5}>
                  {sentimentData?.neutralTrendValue}% {sentimentData?.neutralTrend === 'up' ? 'increase' : sentimentData?.neutralTrend === 'down' ? 'decrease' : 'no change'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderLeft: '4px solid', 
              borderColor: '#F44336',
              height: '100%'
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Negative Sentiment
                  </Typography>
                  <Typography variant="h4">
                    {sentimentData?.negativePercentage}%
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'error.light',
                    width: 40,
                    height: 40
                  }}
                >
                  <SadIcon />
                </Avatar>
              </Box>
              
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(sentimentData?.negativeTrend)}
                <Typography variant="body2" ml={0.5}>
                  {sentimentData?.negativeTrendValue}% {sentimentData?.negativeTrend === 'up' ? 'increase' : sentimentData?.negativeTrend === 'down' ? 'decrease' : 'no change'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderLeft: '4px solid', 
              borderColor: 'primary.main',
              height: '100%'
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Overall Score
                  </Typography>
                  <Typography variant="h4">
                    {sentimentData?.overallScore.toFixed(1)}
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.light',
                    width: 40,
                    height: 40
                  }}
                >
                  <CommentIcon />
                </Avatar>
              </Box>
              
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(sentimentData?.scoreTrend)}
                <Typography variant="body2" ml={0.5}>
                  {sentimentData?.scoreTrendValue} points {sentimentData?.scoreTrend === 'up' ? 'increase' : sentimentData?.scoreTrend === 'down' ? 'decrease' : 'no change'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Main content tabs */}
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<PieChartIcon />} label="Overview" />
        <Tab icon={<TimelineIcon />} label="Trends" />
        <Tab icon={<CommentIcon />} label="Feedback" />
      </Tabs>
      
      {/* Overview tab */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Sentiment Distribution
              </Typography>
              
              <Box height={300} display="flex" alignItems="center" justifyContent="center">
                <Pie data={getSentimentChartData()} options={pieChartOptions} />
              </Box>
              
              <Box mt={2} display="flex" justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  Based on {sentimentData?.totalFeedback.toLocaleString()} pieces of feedback
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Topic Sentiment
              </Typography>
              
              <Box height={300}>
                <Bar data={getTopicSentimentChartData()} options={topicChartOptions} />
              </Box>
              
              <Box mt={2} display="flex" justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  Sentiment distribution across top topics mentioned in feedback
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Keywords
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Keyword</TableCell>
                      <TableCell align="center">Occurrences</TableCell>
                      <TableCell align="center">Sentiment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topKeywords.map((keyword, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {keyword.word}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {keyword.count}
                        </TableCell>
                        <TableCell align="center">
                          <Box 
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center"
                          >
                            {getSentimentIcon(keyword.sentiment)}
                            <Typography 
                              variant="body2" 
                              ml={0.5}
                              color={
                                keyword.sentiment === 'positive' ? 'success.main' : 
                                keyword.sentiment === 'negative' ? 'error.main' : 
                                'text.secondary'
                              }
                            >
                              {keyword.sentiment}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top User Issues
              </Typography>
              
              <List>
                {topIssues.map((issue, index) => (
                  <ListItem 
                    key={index}
                    sx={{ 
                      mb: 1, 
                      borderRadius: 1,
                      bgcolor: getSentimentBgColor(issue.sentiment),
                      border: '1px solid',
                      borderColor: getSentimentColor(issue.sentiment)
                    }}
                  >
                    <ListItemIcon>
                      {getSentimentIcon(issue.sentiment)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {issue.issue}
                        </Typography>
                      }
                      secondary={
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {issue.count} mentions
                          </Typography>
                          {issue.trend && (
                            <Box display="flex" alignItems="center" ml={1}>
                              {getTrendIcon(issue.trend)}
                              <Typography variant="body2" color="text.secondary" ml={0.5}>
                                {issue.trendValue}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    
                    <Chip 
                      label={issue.category} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Trends tab */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Sentiment Trend Over Time
              </Typography>
              
              <Box height={400} mt={2}>
                <Line data={getTrendChartData()} options={trendChartOptions} />
              </Box>
              
              <Box mt={2} display="flex" justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  Sentiment distribution changes over the selected time period
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Feedback Volume by Source
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source</TableCell>
                      <TableCell align="right">Volume</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Sentiment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sentimentData?.sourceStats?.map((source, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {source.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {source.volume.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {getTrendIcon(source.trend)}
                            <Typography variant="body2" ml={0.5}>
                              {source.trendValue}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={`${source.positive}% positive, ${source.neutral}% neutral, ${source.negative}% negative`}>
                            <Box sx={{ width: '100%', display: 'flex' }}>
                              <Box 
                                sx={{ 
                                  height: 8, 
                                  width: `${source.positive}%`,
                                  bgcolor: '#4CAF50',
                                  borderRadius: '4px 0 0 4px'
                                }} 
                              />
                              <Box 
                                sx={{ 
                                  height: 8, 
                                  width: `${source.neutral}%`,
                                  bgcolor: '#FFC107'
                                }} 
                              />
                              <Box 
                                sx={{ 
                                  height: 8, 
                                  width: `${source.negative}%`,
                                  bgcolor: '#F44336',
                                  borderRadius: '0 4px 4px 0'
                                }} 
                              />
                            </Box>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Impact Metrics
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Correlation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sentimentData?.impactMetrics?.map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {metric.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {metric.value}
                          {metric.unit && ` ${metric.unit}`}
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {getTrendIcon(metric.trend)}
                            <Typography variant="body2" ml={0.5}>
                              {metric.trendValue}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${metric.correlation}%`} 
                            size="small"
                            color={
                              Math.abs(metric.correlation) > 70 ? 'primary' :
                              Math.abs(metric.correlation) > 40 ? 'info' : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="body2" color="text.secondary" mt={2}>
                Correlation shows relationship between the metric and positive sentiment
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Feedback tab */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Feedback
              </Typography>
              
              <List>
                {recentFeedback.map((feedback, index) => (
                  <ListItem 
                    key={index}
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      borderRadius: 1,
                      bgcolor: getSentimentBgColor(feedback.sentiment),
                      border: '1px solid',
                      borderColor: getSentimentColor(feedback.sentiment)
                    }}
                  >
                    <Box width="100%">
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box display="flex" alignItems="center">
                          {getSentimentIcon(feedback.sentiment)}
                          <Typography variant="body2" fontWeight="medium" ml={1}>
                            {feedback.user || 'Anonymous User'}
                          </Typography>
                          <Chip 
                            label={feedback.source} 
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary">
                          {new Date(feedback.date).toLocaleString()}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body1" mt={1} sx={{ whiteSpace: 'pre-line' }}>
                        {feedback.text}
                      </Typography>
                      
                      {feedback.context && (
                        <Box 
                          mt={1} 
                          p={1} 
                          bgcolor="background.paper"
                          borderRadius={1}
                          border="1px solid"
                          borderColor="divider"
                        >
                          <Typography variant="caption" color="text.secondary">
                            Context: {feedback.context}
                          </Typography>
                        </Box>
                      )}
                      
                      {feedback.keywords && feedback.keywords.length > 0 && (
                        <Box mt={1}>
                          {feedback.keywords.map((tag, i) => (
                            <Chip 
                              key={i}
                              label={tag} 
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default UserSentimentDashboard; 