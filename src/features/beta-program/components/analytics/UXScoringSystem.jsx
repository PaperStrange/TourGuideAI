import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Restore as RestoreIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  InfoOutlined as InfoIcon,
  FilterList as FilterIcon,
  Print as PrintIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  RadialLinearScale,
  ArcElement
} from 'chart.js';
import AnalyticsService from '../../services/AnalyticsService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

/**
 * UX Scoring System Component
 * 
 * A comprehensive tool for scoring and analyzing user experience across
 * different metrics and categories with weighted scoring algorithms.
 */
const UXScoringSystem = () => {
  // State variables for main component
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState('');
  const [features, setFeatures] = useState([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [scoreData, setScoreData] = useState(null);
  const [showWeights, setShowWeights] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [openMetricDialog, setOpenMetricDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [userSegments, setUserSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [benchmark, setBenchmark] = useState(null);
  const [compareToBenchmark, setCompareToBenchmark] = useState(false);
  
  // State for metric dialog
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricCategory, setNewMetricCategory] = useState('');
  const [newMetricWeight, setNewMetricWeight] = useState(1);
  const [newMetricDescription, setNewMetricDescription] = useState('');
  const [newMetricTargetScore, setNewMetricTargetScore] = useState(80);

  // Constants for scoring visualization
  const scoreRanges = {
    excellent: { min: 90, color: '#4CAF50', label: 'Excellent' },
    good: { min: 70, color: '#8BC34A', label: 'Good' },
    average: { min: 50, color: '#FFC107', label: 'Average' },
    poor: { min: 30, color: '#FF9800', label: 'Poor' },
    critical: { min: 0, color: '#F44336', label: 'Critical' }
  };

  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' }
  ];

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [
          metricsData,
          categoriesData,
          featuresData,
          segmentsData,
          benchmarkData
        ] = await Promise.all([
          AnalyticsService.getUXMetrics(),
          AnalyticsService.getUXCategories(),
          AnalyticsService.getFeatures(),
          AnalyticsService.getUserSegments(),
          AnalyticsService.getUXBenchmark()
        ]);
        
        setMetrics(metricsData);
        setCategories(categoriesData);
        setFeatures(featuresData);
        setUserSegments(segmentsData);
        setBenchmark(benchmarkData);
        
        if (featuresData.length > 0) {
          setSelectedFeature(featuresData[0].id);
          fetchScoreData(featuresData[0].id, timeRange, 'all');
        }
      } catch (err) {
        console.error('Error fetching UX scoring data:', err);
        setError('Failed to load UX metrics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch score data when selections change
  useEffect(() => {
    if (selectedFeature) {
      fetchScoreData(selectedFeature, timeRange, selectedSegment);
    }
  }, [selectedFeature, timeRange, selectedSegment]);

  // Fetch score data from API
  const fetchScoreData = async (featureId, timeRange, segmentId) => {
    try {
      setIsLoading(true);
      const data = await AnalyticsService.getUXScores(featureId, timeRange, segmentId);
      setScoreData(data);
    } catch (err) {
      console.error('Error fetching score data:', err);
      setError('Failed to load score data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate the overall score based on weighted metrics
  const calculateOverallScore = (scores) => {
    if (!scores || !metrics.length) return 0;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    metrics.forEach(metric => {
      if (scores[metric.id] !== undefined) {
        weightedSum += scores[metric.id] * metric.weight;
        totalWeight += metric.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };

  // Get score level based on score value
  const getScoreLevel = (score) => {
    if (score >= scoreRanges.excellent.min) return scoreRanges.excellent;
    if (score >= scoreRanges.good.min) return scoreRanges.good;
    if (score >= scoreRanges.average.min) return scoreRanges.average;
    if (score >= scoreRanges.poor.min) return scoreRanges.poor;
    return scoreRanges.critical;
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Open dialog to add a new metric
  const handleAddMetric = () => {
    setEditingMetric(null);
    setNewMetricName('');
    setNewMetricCategory('');
    setNewMetricWeight(1);
    setNewMetricDescription('');
    setNewMetricTargetScore(80);
    setOpenMetricDialog(true);
  };

  // Open dialog to edit an existing metric
  const handleEditMetric = (metric) => {
    setEditingMetric(metric);
    setNewMetricName(metric.name);
    setNewMetricCategory(metric.categoryId);
    setNewMetricWeight(metric.weight);
    setNewMetricDescription(metric.description);
    setNewMetricTargetScore(metric.targetScore);
    setOpenMetricDialog(true);
  };

  // Save a new or edited metric
  const handleSaveMetric = async () => {
    try {
      const metricData = {
        name: newMetricName,
        categoryId: newMetricCategory,
        weight: newMetricWeight,
        description: newMetricDescription,
        targetScore: newMetricTargetScore
      };
      
      let updatedMetric;
      
      if (editingMetric) {
        // Update existing metric
        updatedMetric = await AnalyticsService.updateUXMetric(editingMetric.id, metricData);
        setMetrics(prev => prev.map(m => m.id === updatedMetric.id ? updatedMetric : m));
      } else {
        // Create new metric
        updatedMetric = await AnalyticsService.createUXMetric(metricData);
        setMetrics(prev => [...prev, updatedMetric]);
      }
      
      setOpenMetricDialog(false);
    } catch (err) {
      console.error('Error saving metric:', err);
      setError('Failed to save metric. Please try again.');
    }
  };

  // Delete a metric
  const handleDeleteMetric = async (metricId) => {
    if (!window.confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      await AnalyticsService.deleteUXMetric(metricId);
      setMetrics(prev => prev.filter(m => m.id !== metricId));
    } catch (err) {
      console.error('Error deleting metric:', err);
      setError('Failed to delete metric. Please try again.');
    }
  };

  // Export data as CSV
  const handleExportData = () => {
    // Implementation for data export would go here
    console.log('Exporting data...');
  };

  // Toggle benchmark comparison
  const handleToggleBenchmark = () => {
    setCompareToBenchmark(prev => !prev);
  };

  // Prepare chart data for category scores
  const prepareCategoryChartData = () => {
    if (!scoreData || !categories.length) return null;
    
    const categoryScores = {};
    
    // Calculate category scores
    metrics.forEach(metric => {
      if (scoreData.scores[metric.id] !== undefined) {
        if (!categoryScores[metric.categoryId]) {
          categoryScores[metric.categoryId] = {
            totalScore: 0,
            count: 0,
            totalWeight: 0
          };
        }
        
        categoryScores[metric.categoryId].totalScore += scoreData.scores[metric.id] * metric.weight;
        categoryScores[metric.categoryId].totalWeight += metric.weight;
        categoryScores[metric.categoryId].count++;
      }
    });
    
    // Calculate averages and prepare chart data
    const labels = [];
    const data = [];
    const benchmarkData = compareToBenchmark && benchmark ? [] : null;
    const backgroundColors = [];
    
    categories.forEach(category => {
      labels.push(category.name);
      
      const categoryData = categoryScores[category.id];
      if (categoryData && categoryData.totalWeight > 0) {
        const score = Math.round(categoryData.totalScore / categoryData.totalWeight);
        data.push(score);
        
        if (benchmarkData) {
          benchmarkData.push(benchmark.categoryScores[category.id] || 0);
        }
        
        backgroundColors.push(getScoreLevel(score).color);
      } else {
        data.push(0);
        if (benchmarkData) benchmarkData.push(0);
        backgroundColors.push(scoreRanges.critical.color);
      }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Category Scores',
          data,
          backgroundColor: backgroundColors,
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1
        },
        ...(benchmarkData ? [{
          label: 'Benchmark',
          data: benchmarkData,
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderColor: 'rgba(0,0,0,0.5)',
          borderWidth: 1,
          type: 'line'
        }] : [])
      ]
    };
  };

  // Prepare chart data for metric trends
  const prepareMetricTrendChartData = () => {
    if (!scoreData || !scoreData.history) return null;
    
    return {
      labels: scoreData.history.dates,
      datasets: [{
        label: 'Overall Score Trend',
        data: scoreData.history.scores,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
      }]
    };
  };

  // Prepare chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'UX Category Scores'
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: value => `${value}%`
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

  // Calculate overall score if data is available
  const overallScore = scoreData ? calculateOverallScore(scoreData.scores) : 0;
  const scoreLevel = getScoreLevel(overallScore);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          UX Scoring System
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            sx={{ mr: 1 }}
          >
            Export Data
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddMetric}
          >
            Add Metric
          </Button>
        </Box>
      </Box>
      
      {/* Filter and selection controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="feature-select-label">Feature / Section</InputLabel>
              <Select
                labelId="feature-select-label"
                value={selectedFeature}
                label="Feature / Section"
                onChange={(e) => setSelectedFeature(e.target.value)}
              >
                {features.map(feature => (
                  <MenuItem key={feature.id} value={feature.id}>
                    {feature.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="time-range-label">Time Range</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="segment-select-label">User Segment</InputLabel>
              <Select
                labelId="segment-select-label"
                value={selectedSegment}
                label="User Segment"
                onChange={(e) => setSelectedSegment(e.target.value)}
              >
                <MenuItem value="all">All Users</MenuItem>
                {userSegments.map(segment => (
                  <MenuItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch 
                  checked={compareToBenchmark}
                  onChange={handleToggleBenchmark}
                  disabled={!benchmark}
                />
              }
              label="Compare to Benchmark"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Score card and summary data */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall UX Score
              </Typography>
              
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center"
                py={2}
              >
                <Box 
                  sx={{ 
                    width: 150, 
                    height: 150, 
                    borderRadius: '50%', 
                    bgcolor: `${scoreLevel.color}20`,
                    border: `8px solid ${scoreLevel.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    mb: 2
                  }}
                >
                  <Typography variant="h3" fontWeight="bold">
                    {overallScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    out of 100
                  </Typography>
                </Box>
                
                <Chip 
                  label={scoreLevel.label} 
                  sx={{ 
                    bgcolor: scoreLevel.color, 
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    px: 2
                  }}
                />
                
                {benchmark && (
                  <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Benchmark: {benchmark.overallScore}
                      {overallScore > benchmark.overallScore ? 
                        ` (+${overallScore - benchmark.overallScore})` : 
                        ` (${overallScore - benchmark.overallScore})`}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Score Breakdown
              </Typography>
              
              <Box>
                {categories.map(category => {
                  const categoryMetrics = metrics.filter(m => m.categoryId === category.id);
                  
                  // Calculate weighted average for category
                  let totalWeight = 0;
                  let weightedSum = 0;
                  
                  categoryMetrics.forEach(metric => {
                    if (scoreData?.scores[metric.id] !== undefined) {
                      weightedSum += scoreData.scores[metric.id] * metric.weight;
                      totalWeight += metric.weight;
                    }
                  });
                  
                  const categoryScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
                  const catScoreLevel = getScoreLevel(categoryScore);
                  
                  return (
                    <Box key={category.id} mb={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                          {category.name}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <Box 
                            sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              bgcolor: catScoreLevel.color,
                              mr: 1
                            }} 
                          />
                          <Typography variant="body2" fontWeight="medium">
                            {categoryScore}
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={categoryScore} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 1,
                          mt: 0.5,
                          bgcolor: 'rgba(0,0,0,0.05)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: catScoreLevel.color
                          }
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Score Visualization
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={showWeights}
                      onChange={() => setShowWeights(prev => !prev)}
                      size="small"
                    />
                  }
                  label="Show Weights"
                />
              </Box>
              
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                sx={{ mb: 2 }}
              >
                <Tab label="Categories" />
                <Tab label="Trends" />
                <Tab label="Metrics" />
              </Tabs>
              
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={10}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {currentTab === 0 && (
                    <Box height={300}>
                      <Chart type="bar" data={prepareCategoryChartData()} options={chartOptions} />
                    </Box>
                  )}
                  
                  {currentTab === 1 && (
                    <Box height={300}>
                      <Chart type="line" data={prepareMetricTrendChartData()} />
                    </Box>
                  )}
                  
                  {currentTab === 2 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Metric</TableCell>
                            <TableCell>Category</TableCell>
                            {showWeights && <TableCell align="center">Weight</TableCell>}
                            <TableCell align="center">Score</TableCell>
                            <TableCell align="center">Target</TableCell>
                            <TableCell align="center">Gap</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {metrics.map(metric => {
                            const score = scoreData?.scores[metric.id] || 0;
                            const category = categories.find(c => c.id === metric.categoryId);
                            const gap = score - metric.targetScore;
                            
                            return (
                              <TableRow key={metric.id}>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <Typography variant="body2">
                                      {metric.name}
                                    </Typography>
                                    <Tooltip title={metric.description} arrow>
                                      <InfoIcon 
                                        fontSize="small" 
                                        color="action" 
                                        sx={{ ml: 0.5, fontSize: '1rem' }} 
                                      />
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {category?.name || '-'}
                                </TableCell>
                                {showWeights && (
                                  <TableCell align="center">
                                    {metric.weight}x
                                  </TableCell>
                                )}
                                <TableCell align="center">
                                  <Box 
                                    sx={{ 
                                      display: 'inline-block',
                                      bgcolor: getScoreLevel(score).color,
                                      color: 'white',
                                      borderRadius: '4px',
                                      px: 1,
                                      py: 0.5,
                                      minWidth: 40
                                    }}
                                  >
                                    {score}
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  {metric.targetScore}
                                </TableCell>
                                <TableCell align="center">
                                  <Typography 
                                    variant="body2" 
                                    color={gap >= 0 ? 'success.main' : 'error.main'}
                                    fontWeight="medium"
                                  >
                                    {gap >= 0 ? `+${gap}` : gap}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditMetric(metric)}
                                    sx={{ mr: 0.5 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteMetric(metric.id)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Improvement recommendations */}
      {scoreData?.recommendations && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Improvement Recommendations
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Based on the analysis of your UX metrics, here are the top recommendations to improve your user experience:
          </Typography>
          
          <Grid container spacing={2} mt={1}>
            {scoreData.recommendations.map((recommendation, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {index + 1}. {recommendation.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recommendation.description}
                    </Typography>
                    
                    {recommendation.impactAreas && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Impact Areas:
                        </Typography>
                        <Box mt={0.5}>
                          {recommendation.impactAreas.map(area => (
                            <Chip 
                              key={area.id} 
                              label={area.name} 
                              size="small" 
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {recommendation.potentialImprovement && (
                      <Box mt={1} display="flex" alignItems="center">
                        <Typography variant="caption" color="text.secondary" mr={1}>
                          Potential Score Improvement:
                        </Typography>
                        <Chip 
                          label={`+${recommendation.potentialImprovement}`} 
                          size="small"
                          color="success"
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Dialog for adding/editing metrics */}
      <Dialog
        open={openMetricDialog}
        onClose={() => setOpenMetricDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMetric ? 'Edit Metric' : 'Add New Metric'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Metric Name"
            fullWidth
            variant="outlined"
            value={newMetricName}
            onChange={(e) => setNewMetricName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="metric-category-label">Category</InputLabel>
            <Select
              labelId="metric-category-label"
              value={newMetricCategory}
              label="Category"
              onChange={(e) => setNewMetricCategory(e.target.value)}
            >
              {categories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newMetricDescription}
            onChange={(e) => setNewMetricDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Weight: {newMetricWeight}x
          </Typography>
          <Slider
            value={newMetricWeight}
            onChange={(e, newValue) => setNewMetricWeight(newValue)}
            step={0.1}
            min={0.1}
            max={3}
            valueLabelDisplay="auto"
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Target Score: {newMetricTargetScore}
          </Typography>
          <Slider
            value={newMetricTargetScore}
            onChange={(e, newValue) => setNewMetricTargetScore(newValue)}
            step={5}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMetricDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMetric}
            variant="contained"
            disabled={!newMetricName || !newMetricCategory}
          >
            {editingMetric ? 'Update' : 'Add'} Metric
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UXScoringSystem; 