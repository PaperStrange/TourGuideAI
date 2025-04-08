import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  InfoOutlined, 
  Assessment, 
  AccessTime, 
  CheckCircleOutline,
  ErrorOutline,
  Refresh 
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

// Register Chart.js components
ChartJS.register(...registerables);

// Placeholder for actual service
import { analyticsService } from '../../services/AnalyticsService';

const UXMetricsEvaluation = ({ 
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
  endDate = new Date().toISOString().split('T')[0]
}) => {
  const theme = useTheme();
  
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate,
    endDate
  });
  
  // State for metrics
  const [metrics, setMetrics] = useState({
    timeOnTask: { value: 0, trend: 'stable', loading: true, error: null },
    successRate: { value: 0, trend: 'up', loading: true, error: null },
    errorRate: { value: 0, trend: 'down', loading: true, error: null }, 
    satisfactionScore: { value: 0, trend: 'up', loading: true, error: null },
    taskCompletionTime: { value: 0, trend: 'down', loading: true, error: null }
  });
  
  // State for UI component usage statistics
  const [componentUsage, setComponentUsage] = useState([]);
  
  // State for benchmark comparison
  const [benchmark, setBenchmark] = useState('industry');
  
  // State for overall loading and error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  // Effect to fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all metrics data
        const metricsData = await analyticsService.getUXMetrics(dateRange.startDate, dateRange.endDate);
        const componentData = await analyticsService.getComponentUsageStats(dateRange.startDate, dateRange.endDate);
        const chartData = await analyticsService.getUXMetricsTimeSeries(dateRange.startDate, dateRange.endDate);
        
        // Update state with fetched data
        setMetrics(metricsData);
        setComponentUsage(componentData);
        setChartData(chartData);
      } catch (err) {
        console.error('Error fetching UX metrics:', err);
        setError('Failed to load UX metrics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [dateRange.startDate, dateRange.endDate, benchmark]);
  
  // Handle date change
  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle benchmark change
  const handleBenchmarkChange = (event) => {
    setBenchmark(event.target.value);
  };
  
  // Refresh data
  const handleRefresh = () => {
    // Re-fetch data with current parameters
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all metrics data
        const metricsData = await analyticsService.getUXMetrics(dateRange.startDate, dateRange.endDate, benchmark);
        const componentData = await analyticsService.getComponentUsageStats(dateRange.startDate, dateRange.endDate);
        const chartData = await analyticsService.getUXMetricsTimeSeries(dateRange.startDate, dateRange.endDate);
        
        // Update state with fetched data
        setMetrics(metricsData);
        setComponentUsage(componentData);
        setChartData(chartData);
      } catch (err) {
        setError('Failed to refresh UX metrics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  };
  
  // Helper to render trend indicator
  const renderTrendIndicator = (trend) => {
    switch(trend) {
      case 'up':
        return <CheckCircleOutline color="success" />;
      case 'down':
        return <ErrorOutline color="error" />;
      default:
        return <AccessTime color="warning" />;
    }
  };
  
  // Mock chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme.palette.text.primary,
        }
      },
      tooltip: {
        enabled: true,
      }
    }
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">UX Metrics Evaluation</Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel id="benchmark-select-label">Benchmark</InputLabel>
              <Select
                labelId="benchmark-select-label"
                id="benchmark-select"
                value={benchmark}
                label="Benchmark"
                onChange={handleBenchmarkChange}
              >
                <MenuItem value="industry">Industry Average</MenuItem>
                <MenuItem value="competitors">Competitors</MenuItem>
                <MenuItem value="previous">Previous Version</MenuItem>
                <MenuItem value="target">Target Goals</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.default }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Task Success Rate</Typography>
                    {renderTrendIndicator(metrics.successRate.trend)}
                  </Box>
                  <Typography variant="h3" sx={{ color: metrics.successRate.trend === 'up' ? 'success.main' : metrics.successRate.trend === 'down' ? 'error.main' : 'warning.main' }}>
                    {metrics.successRate.value}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentage of users completing tasks successfully
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.default }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Task Completion Time</Typography>
                    {renderTrendIndicator(metrics.taskCompletionTime.trend)}
                  </Box>
                  <Typography variant="h3" sx={{ color: metrics.taskCompletionTime.trend === 'down' ? 'success.main' : metrics.taskCompletionTime.trend === 'up' ? 'error.main' : 'warning.main' }}>
                    {metrics.taskCompletionTime.value}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average time to complete key user tasks
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.default }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Satisfaction Score</Typography>
                    {renderTrendIndicator(metrics.satisfactionScore.trend)}
                  </Box>
                  <Typography variant="h3" sx={{ color: metrics.satisfactionScore.trend === 'up' ? 'success.main' : metrics.satisfactionScore.trend === 'down' ? 'error.main' : 'warning.main' }}>
                    {metrics.satisfactionScore.value}/10
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average user satisfaction rating
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Paper sx={{ p: 2, mb: 4, bgcolor: theme.palette.background.default }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Metrics Over Time</Typography>
              <Box sx={{ height: 300 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </Paper>
            
            <Paper sx={{ p: 2, bgcolor: theme.palette.background.default }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Component Performance</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Usage Count</TableCell>
                      <TableCell>Average Time Spent</TableCell>
                      <TableCell>Error Rate</TableCell>
                      <TableCell>User Satisfaction</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {componentUsage.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell>{component.name}</TableCell>
                        <TableCell>{component.usageCount}</TableCell>
                        <TableCell>{component.avgTimeSpent}s</TableCell>
                        <TableCell sx={{ color: component.errorRate > 5 ? 'error.main' : 'success.main' }}>
                          {component.errorRate}%
                        </TableCell>
                        <TableCell>{component.satisfaction}/10</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default UXMetricsEvaluation; 