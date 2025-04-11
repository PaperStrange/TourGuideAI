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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  ViewList as ViewListIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import analyticsService from '../../services/analytics/AnalyticsService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

/**
 * A/B Test Reporting Framework
 * 
 * Component for viewing and analyzing A/B test results with
 * statistical significance calculations and visualizations.
 */
const ABTestReporting = () => {
  // State for main component
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('all');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  
  // Time range options
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const testsData = await analyticsService.getABTests(showOnlyActive);
        setTests(testsData);
        
        if (testsData.length > 0) {
          setSelectedTest(testsData[0]);
        }
      } catch (err) {
        console.error('Error fetching A/B tests:', err);
        setError('Failed to load A/B test data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showOnlyActive]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Handle test selection
  const handleSelectTest = (test) => {
    setSelectedTest(test);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Handle toggling active tests filter
  const handleToggleActiveFilter = () => {
    setShowOnlyActive(!showOnlyActive);
  };
  
  // Handle exporting test data
  const handleExportData = () => {
    if (!selectedTest) return;
    
    // Implementation for data export would go here
    console.log('Exporting test data...');
  };
  
  // Get test status label and color
  const getTestStatus = (test) => {
    if (test.status === 'running') {
      return { label: 'Running', color: 'success' };
    } else if (test.status === 'paused') {
      return { label: 'Paused', color: 'warning' };
    } else if (test.status === 'completed') {
      return { label: 'Completed', color: 'info' };
    } else if (test.status === 'scheduled') {
      return { label: 'Scheduled', color: 'secondary' };
    }
    return { label: 'Draft', color: 'default' };
  };
  
  // Calculate relative improvement for a variant
  const calculateImprovement = (variant, baseline) => {
    if (!variant || !baseline || baseline.conversionRate === 0) return 0;
    
    return ((variant.conversionRate - baseline.conversionRate) / baseline.conversionRate) * 100;
  };
  
  // Determine if a result is statistically significant
  const isSignificant = (variant) => {
    return variant && variant.pValue < 0.05;
  };
  
  // Generate chart data for conversion rates
  const getConversionRateChartData = () => {
    if (!selectedTest || !selectedTest.variants) return null;
    
    const labels = selectedTest.variants.map(v => v.name);
    const data = selectedTest.variants.map(v => v.conversionRate * 100); // Convert to percentage
    const backgroundColor = selectedTest.variants.map(v => 
      v.isBaseline ? 'rgba(200, 200, 200, 0.7)' : 
        isSignificant(v) ? 
          (v.conversionRate > selectedTest.variants.find(bv => bv.isBaseline).conversionRate ? 
            'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)') : 
          'rgba(33, 150, 243, 0.7)'
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Conversion Rate (%)',
          data,
          backgroundColor
        }
      ]
    };
  };
  
  // Generate chart data for metrics over time
  const getTimeSeriesChartData = () => {
    if (!selectedTest || !selectedTest.timeSeriesData) return null;
    
    return {
      labels: selectedTest.timeSeriesData.dates,
      datasets: selectedTest.variants.map(variant => ({
        label: variant.name,
        data: selectedTest.timeSeriesData.conversionRates[variant.id],
        borderColor: variant.isBaseline ? 'rgb(100, 100, 100)' : 
          getVariantColor(variant, selectedTest.variants.find(v => v.isBaseline)),
        backgroundColor: 'transparent',
        tension: 0.1
      }))
    };
  };
  
  // Get color for a variant based on performance vs baseline
  const getVariantColor = (variant, baseline) => {
    if (variant.isBaseline) return 'rgb(100, 100, 100)';
    
    if (!baseline) return 'rgb(33, 150, 243)';
    
    const improvement = calculateImprovement(variant, baseline);
    
    if (!isSignificant(variant)) return 'rgb(33, 150, 243)';
    
    return improvement > 0 ? 'rgb(76, 175, 80)' : 'rgb(244, 67, 54)';
  };
  
  // Chart options for conversion rate
  const conversionChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Conversion Rate (%)'
        }
      }
    }
  };
  
  // Chart options for time series data
  const timeSeriesChartOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${(context.raw * 100).toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Conversion Rate (%)'
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
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
          A/B Test Reporting
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<FilterIcon />}
            onClick={handleToggleActiveFilter}
            sx={{ mr: 1 }}
          >
            {showOnlyActive ? 'Show All Tests' : 'Show Active Only'}
          </Button>
          
          {selectedTest && (
            <Button 
              variant="outlined" 
              startIcon={<DownloadIcon />}
              onClick={handleExportData}
              sx={{ mr: 1 }}
            >
              Export Data
            </Button>
          )}
        </Box>
      </Box>
      
      {tests.length === 0 ? (
        <Alert severity="info">
          No A/B tests found. {showOnlyActive && 'Try showing all tests.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Tests list */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%' }}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>
                  A/B Tests
                </Typography>
                
                <Box my={2}>
                  {tests.map(test => {
                    const status = getTestStatus(test);
                    
                    return (
                      <Card 
                        key={test.id} 
                        sx={{ 
                          mb: 2, 
                          cursor: 'pointer',
                          border: selectedTest?.id === test.id ? '2px solid #1976d2' : 'none',
                          '&:hover': {
                            boxShadow: 2
                          }
                        }}
                        onClick={() => handleSelectTest(test)}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle1" fontWeight="medium">
                              {test.name}
                            </Typography>
                            
                            <Chip 
                              label={status.label} 
                              color={status.color} 
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }} noWrap>
                            {test.description || 'No description'}
                          </Typography>
                          
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Start Date
                              </Typography>
                              <Typography variant="body2">
                                {new Date(test.startDate).toLocaleDateString()}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                End Date
                              </Typography>
                              <Typography variant="body2">
                                {test.endDate ? new Date(test.endDate).toLocaleDateString() : 'Ongoing'}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Variants
                              </Typography>
                              <Typography variant="body2">
                                {test.variants.length}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Traffic
                              </Typography>
                              <Typography variant="body2">
                                {test.trafficAllocation}%
                              </Typography>
                            </Grid>
                          </Grid>
                          
                          {test.winner && (
                            <Box mt={1} display="flex" alignItems="center">
                              <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                              <Typography variant="body2" color="success.main">
                                Winner: {test.winner}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* Test details */}
          <Grid item xs={12} md={8}>
            {selectedTest ? (
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6">{selectedTest.name}</Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedTest.description}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
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
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Participants
                        </Typography>
                        <Typography variant="h6">
                          {selectedTest.totalParticipants.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Conversions
                        </Typography>
                        <Typography variant="h6">
                          {selectedTest.totalConversions.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary">
                          Running Time
                        </Typography>
                        <Typography variant="h6">
                          {selectedTest.runningDays} days
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary">
                          Confidence Level
                        </Typography>
                        <Typography variant="h6">
                          {selectedTest.confidenceLevel ? 
                            `${(selectedTest.confidenceLevel * 100).toFixed(1)}%` : 
                            'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Tabs 
                  value={currentTab} 
                  onChange={handleTabChange}
                  sx={{ mb: 2 }}
                >
                  <Tab icon={<BarChartIcon />} label="Results" />
                  <Tab icon={<TimelineIcon />} label="Trends" />
                  <Tab icon={<ViewListIcon />} label="Data Table" />
                  <Tab icon={<InfoIcon />} label="Test Info" />
                </Tabs>
                
                {currentTab === 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Conversion Rates by Variant
                    </Typography>
                    
                    <Box height={300} mt={2} mb={4}>
                      <Bar data={getConversionRateChartData()} options={conversionChartOptions} />
                    </Box>
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Variant Performance
                    </Typography>
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Variant</TableCell>
                            <TableCell align="right">Participants</TableCell>
                            <TableCell align="right">Conversions</TableCell>
                            <TableCell align="right">Conversion Rate</TableCell>
                            <TableCell align="right">Change</TableCell>
                            <TableCell align="right">Significance</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedTest.variants.map(variant => {
                            const baseline = selectedTest.variants.find(v => v.isBaseline);
                            const improvement = variant.isBaseline ? 0 : calculateImprovement(variant, baseline);
                            const significant = isSignificant(variant);
                            
                            return (
                              <TableRow key={variant.id}>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <Typography 
                                      variant="body2" 
                                      fontWeight={variant.isBaseline ? 'bold' : 'regular'}
                                    >
                                      {variant.name}
                                    </Typography>
                                    {variant.isBaseline && (
                                      <Chip 
                                        label="Baseline" 
                                        size="small" 
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                    {selectedTest.winner === variant.name && (
                                      <Chip 
                                        label="Winner" 
                                        size="small" 
                                        color="success"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  {variant.participants.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                  {variant.conversions.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                  {(variant.conversionRate * 100).toFixed(2)}%
                                </TableCell>
                                <TableCell align="right">
                                  {variant.isBaseline ? (
                                    <Typography variant="body2">—</Typography>
                                  ) : (
                                    <Typography 
                                      variant="body2" 
                                      color={improvement > 0 ? 'success.main' : 
                                              improvement < 0 ? 'error.main' : 'text.secondary'}
                                      fontWeight="medium"
                                    >
                                      {improvement > 0 ? '+' : ''}{improvement.toFixed(2)}%
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {variant.isBaseline ? (
                                    <Typography variant="body2">—</Typography>
                                  ) : (
                                    <Chip 
                                      label={significant ? 'Significant' : 'Not Significant'} 
                                      size="small"
                                      color={significant ? 'success' : 'default'}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {selectedTest.insights && (
                      <Box mt={4}>
                        <Typography variant="subtitle1" gutterBottom>
                          Insights & Recommendations
                        </Typography>
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            {selectedTest.insights}
                          </Typography>
                        </Alert>
                      </Box>
                    )}
                  </Box>
                )}
                
                {currentTab === 1 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Conversion Rate Trends
                    </Typography>
                    
                    <Box height={400} mt={2}>
                      <Line data={getTimeSeriesChartData()} options={timeSeriesChartOptions} />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      This chart shows conversion rate trends over time for each variant. Significant fluctuations may indicate external factors affecting the test.
                    </Typography>
                  </Box>
                )}
                
                {currentTab === 2 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Daily Performance Data
                    </Typography>
                    
                    {selectedTest.dailyData && selectedTest.dailyData.length > 0 ? (
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Variant</TableCell>
                              <TableCell align="right">Participants</TableCell>
                              <TableCell align="right">Conversions</TableCell>
                              <TableCell align="right">Conversion Rate</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedTest.dailyData.map((record, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                <TableCell>{record.variantName}</TableCell>
                                <TableCell align="right">{record.participants}</TableCell>
                                <TableCell align="right">{record.conversions}</TableCell>
                                <TableCell align="right">
                                  {(record.conversionRate * 100).toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No daily data available for this test
                      </Typography>
                    )}
                  </Box>
                )}
                
                {currentTab === 3 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Test Information
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              Test Details
                            </Typography>
                            
                            <TableContainer>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell>Test ID</TableCell>
                                    <TableCell>{selectedTest.id}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Status</TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={getTestStatus(selectedTest).label} 
                                        size="small"
                                        color={getTestStatus(selectedTest).color}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>
                                      {new Date(selectedTest.startDate).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>
                                      {selectedTest.endDate ? 
                                        new Date(selectedTest.endDate).toLocaleDateString() : 
                                        'Ongoing'}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Traffic Allocation</TableCell>
                                    <TableCell>{selectedTest.trafficAllocation}%</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Target Goal</TableCell>
                                    <TableCell>{selectedTest.targetGoal}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Created By</TableCell>
                                    <TableCell>{selectedTest.createdBy}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              Test Configuration
                            </Typography>
                            
                            <TableContainer>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell>Target Audience</TableCell>
                                    <TableCell>{selectedTest.targetAudience || 'All Users'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Device Types</TableCell>
                                    <TableCell>
                                      {selectedTest.deviceTypes?.join(', ') || 'All Devices'}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Feature Flag</TableCell>
                                    <TableCell>{selectedTest.featureFlag || 'N/A'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Min. Sample Size</TableCell>
                                    <TableCell>
                                      {selectedTest.minSampleSize?.toLocaleString() || 'Auto'}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Target Confidence</TableCell>
                                    <TableCell>
                                      {selectedTest.targetConfidence ? 
                                        `${selectedTest.targetConfidence * 100}%` : 
                                        '95%'}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Minimum Detectable Effect</TableCell>
                                    <TableCell>
                                      {selectedTest.minDetectableEffect ? 
                                        `${selectedTest.minDetectableEffect * 100}%` : 
                                        'Auto'}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                        
                        {selectedTest.hypothesis && (
                          <Card variant="outlined" sx={{ mt: 2 }}>
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                Hypothesis
                              </Typography>
                              
                              <Typography variant="body2">
                                {selectedTest.hypothesis}
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper 
                sx={{ 
                  p: 5, 
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No A/B Test Selected
                </Typography>
                <Typography color="text.secondary">
                  Select a test from the list to view its results
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ABTestReporting; 