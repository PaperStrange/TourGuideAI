import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import issuePrioritizationService from '../../services/IssuePrioritizationService';

/**
 * SLA Tracking Dashboard component
 * Shows SLA compliance metrics and visualization for beta program issues
 */
const SLATrackingDashboard = () => {
  // State for SLA data
  const [slaData, setSlaData] = useState({
    summary: {
      total: 0,
      breached: 0,
      atRisk: 0,
      onTrack: 0,
      complianceRate: 0
    },
    bySeverity: [],
    byComponent: [],
    recentBreaches: [],
    loading: true,
    error: null
  });
  
  // State for time filter
  const [timeRange, setTimeRange] = useState('30days');
  
  // Get severity levels
  const severityLevels = issuePrioritizationService.getSeverityLevels();
  
  // Chart colors
  const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#FF0000'];
  
  // Load SLA data
  const loadSlaData = async () => {
    try {
      // In a real implementation, this would fetch from an API
      // For demo, we'll simulate the data
      
      // Get issues from GitHub
      const issues = await issuePrioritizationService.getGitHubIssues({
        state: 'all'
      });
      
      // Calculate SLA metrics
      const now = new Date();
      let totalIssues = issues.length;
      let breachedCount = 0;
      let atRiskCount = 0;
      let onTrackCount = 0;
      
      // Process issues for SLA status
      const issuesWithSlaStatus = issues.map(issue => {
        const timeToSla = issuePrioritizationService.getTimeToSlaInHours(issue.slaTarget);
        let slaStatus;
        
        if (timeToSla < 0) {
          slaStatus = 'breached';
          breachedCount++;
        } else if (timeToSla < 24) {
          slaStatus = 'at-risk';
          atRiskCount++;
        } else {
          slaStatus = 'on-track';
          onTrackCount++;
        }
        
        return {
          ...issue,
          slaStatus,
          timeToSla
        };
      });
      
      // Calculate compliance rate
      const complianceRate = totalIssues > 0 
        ? Math.round(((totalIssues - breachedCount) / totalIssues) * 100) 
        : 100;
      
      // Group by severity
      const bySeverity = Object.values(severityLevels).map(severity => {
        const severityIssues = issuesWithSlaStatus.filter(
          issue => issue.severity && issue.severity.value === severity.value
        );
        
        const breached = severityIssues.filter(issue => issue.slaStatus === 'breached').length;
        const total = severityIssues.length;
        const compliance = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
        
        return {
          name: severity.label,
          total,
          breached,
          atRisk: severityIssues.filter(issue => issue.slaStatus === 'at-risk').length,
          onTrack: severityIssues.filter(issue => issue.slaStatus === 'on-track').length,
          compliance,
          color: severity.color
        };
      });
      
      // Group by component (simulated data)
      const componentsData = [
        { name: 'Map', total: 8, breached: 1, atRisk: 2, onTrack: 5 },
        { name: 'Authentication', total: 6, breached: 2, atRisk: 1, onTrack: 3 },
        { name: 'Profile', total: 5, breached: 0, atRisk: 1, onTrack: 4 },
        { name: 'API', total: 7, breached: 3, atRisk: 1, onTrack: 3 }
      ];
      
      // Calculate compliance for each component
      const byComponent = componentsData.map(component => ({
        ...component,
        compliance: Math.round(((component.total - component.breached) / component.total) * 100)
      }));
      
      // Recent breaches
      const recentBreaches = issuesWithSlaStatus
        .filter(issue => issue.slaStatus === 'breached')
        .sort((a, b) => new Date(b.slaTarget) - new Date(a.slaTarget))
        .slice(0, 5);
      
      // Update state with calculated data
      setSlaData({
        summary: {
          total: totalIssues,
          breached: breachedCount,
          atRisk: atRiskCount,
          onTrack: onTrackCount,
          complianceRate
        },
        bySeverity,
        byComponent,
        recentBreaches,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading SLA data:', error);
      setSlaData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load SLA data. Please try again.'
      }));
    }
  };
  
  // Load data on mount and when time range changes
  useEffect(() => {
    setSlaData(prev => ({ ...prev, loading: true }));
    loadSlaData();
  }, [timeRange]);
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Render SLA status chip
  const renderSlaStatusChip = (status) => {
    switch (status) {
      case 'breached':
        return <Chip size="small" label="Breached" color="error" />;
      case 'at-risk':
        return <Chip size="small" label="At Risk" color="warning" />;
      case 'on-track':
        return <Chip size="small" label="On Track" color="success" />;
      default:
        return null;
    }
  };
  
  // Prepare pie chart data
  const preparePieChartData = () => [
    { name: 'On Track', value: slaData.summary.onTrack, color: '#00C49F' },
    { name: 'At Risk', value: slaData.summary.atRisk, color: '#FFBB28' },
    { name: 'Breached', value: slaData.summary.breached, color: '#FF0000' }
  ];
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">SLA Tracking Dashboard</Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            value={timeRange}
            onChange={handleTimeRangeChange}
            label="Time Range"
          >
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {slaData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {slaData.error}
        </Alert>
      )}
      
      {slaData.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* SLA Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    SLA Compliance Rate
                  </Typography>
                  <Typography variant="h3" color={slaData.summary.complianceRate < 70 ? 'error' : 'primary'}>
                    {slaData.summary.complianceRate}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={slaData.summary.complianceRate} 
                    color={slaData.summary.complianceRate < 70 ? 'error' : 'primary'}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Total Issues
                  </Typography>
                  <Typography variant="h3">
                    {slaData.summary.total}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Chip 
                      size="small" 
                      label={`${slaData.summary.breached} Breached`} 
                      color="error"
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`${slaData.summary.atRisk} At Risk`} 
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Critical Issues
                  </Typography>
                  <Typography variant="h3">
                    {slaData.bySeverity.find(s => s.name === 'Critical')?.total || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Chip 
                      size="small" 
                      label={`${slaData.bySeverity.find(s => s.name === 'Critical')?.breached || 0} Breached`} 
                      color="error"
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`${slaData.bySeverity.find(s => s.name === 'Critical')?.compliance || 0}% Compliance`} 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Average Resolution Time
                  </Typography>
                  <Typography variant="h3">
                    32h
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Target: 48h (33% faster)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* SLA Status Distribution */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  SLA Status Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {preparePieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  SLA Compliance by Severity
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={slaData.bySeverity}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ width: 100 }}
                      />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar 
                        dataKey="compliance" 
                        name="Compliance %" 
                        stackId="a" 
                        fill="#8884d8" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Compliance by Component */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              SLA Compliance by Component
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Total Issues</TableCell>
                    <TableCell align="right">Breached</TableCell>
                    <TableCell align="right">At Risk</TableCell>
                    <TableCell align="right">On Track</TableCell>
                    <TableCell align="right">Compliance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slaData.byComponent.map((component) => (
                    <TableRow key={component.name} hover>
                      <TableCell component="th" scope="row">
                        {component.name}
                      </TableCell>
                      <TableCell align="right">{component.total}</TableCell>
                      <TableCell align="right">{component.breached}</TableCell>
                      <TableCell align="right">{component.atRisk}</TableCell>
                      <TableCell align="right">{component.onTrack}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          size="small" 
                          label={`${component.compliance}%`} 
                          color={component.compliance < 70 ? 'error' : 'primary'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Recent SLA Breaches */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent SLA Breaches
            </Typography>
            {slaData.recentBreaches.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No SLA breaches found in the selected time period.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Issue #</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>SLA Target</TableCell>
                      <TableCell>Time Exceeded</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slaData.recentBreaches.map((issue) => (
                      <TableRow key={issue.id} hover>
                        <TableCell>{issue.number}</TableCell>
                        <TableCell>{issue.title}</TableCell>
                        <TableCell>
                          <Chip 
                            label={issue.severity.label}
                            size="small"
                            sx={{ 
                              backgroundColor: issue.severity.color,
                              color: '#fff',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>{new Date(issue.slaTarget).toLocaleString()}</TableCell>
                        <TableCell>
                          {Math.abs(Math.round(issue.timeToSla))} hours
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default SLATrackingDashboard; 