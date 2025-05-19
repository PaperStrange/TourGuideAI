import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Slider,
  Divider,
  Link
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import issuePrioritizationService from '../../services/IssuePrioritizationService';

/**
 * Issue Prioritization Dashboard component
 * Admin interface for managing and prioritizing issues
 */
const IssuePrioritizationDashboard = () => {
  // State for issues data
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for sorting
  const [orderBy, setOrderBy] = useState('priorityScore');
  const [order, setOrder] = useState('desc');
  
  // State for filtering
  const [filters, setFilters] = useState({
    severity: '',
    status: 'open'
  });
  
  // State for new issue dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    component: '',
    type: 'bug',
    userPercentage: 10,
    frequency: 50,
    workaround: 50,
    businessImpact: 30
  });
  
  // State for impact assessment dialog
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [impactAssessment, setImpactAssessment] = useState({
    userPercentage: 10,
    frequency: 50,
    workaround: 50,
    businessImpact: 30
  });
  
  // Get severity levels
  const severityLevels = issuePrioritizationService.getSeverityLevels();
  
  // Get impact factors
  const impactFactors = issuePrioritizationService.getImpactFactors();
  
  // Fetch issues from GitHub
  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const githubIssues = await issuePrioritizationService.getGitHubIssues({
        state: filters.status,
        labels: filters.severity ? [`severity:${filters.severity.toLowerCase()}`] : []
      });
      
      // Add priority scores to issues
      const issuesWithPriority = githubIssues.map(issue => ({
        ...issue,
        priorityScore: issuePrioritizationService.getPriorityScore(issue)
      }));
      
      // Sort issues by priority score
      const sortedIssues = sortIssues(issuesWithPriority, 'priorityScore', 'desc');
      
      setIssues(sortedIssues);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError('Failed to load issues. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load issues on mount and when filters change
  useEffect(() => {
    fetchIssues();
  }, [filters]);
  
  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrder(newOrder);
    setOrderBy(property);
    
    setIssues(sortIssues(issues, property, newOrder));
  };
  
  // Sort issues helper function
  const sortIssues = (issueList, property, sortOrder) => {
    return [...issueList].sort((a, b) => {
      const valueA = a[property];
      const valueB = b[property];
      
      const compareResult = 
        (valueA < valueB) ? -1 : 
        (valueA > valueB) ? 1 : 0;
      
      return sortOrder === 'asc' ? compareResult : -compareResult;
    });
  };
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };
  
  // Handle new issue dialog open
  const handleOpenNewIssueDialog = () => {
    setIsDialogOpen(true);
  };
  
  // Handle new issue dialog close
  const handleCloseNewIssueDialog = () => {
    setIsDialogOpen(false);
  };
  
  // Handle new issue input change
  const handleNewIssueChange = (event) => {
    const { name, value } = event.target;
    setNewIssue(prevIssue => ({
      ...prevIssue,
      [name]: value
    }));
  };
  
  // Handle slider change for impact factors
  const handleSliderChange = (name) => (event, newValue) => {
    if (isAssessmentDialogOpen) {
      setImpactAssessment(prev => ({
        ...prev,
        [name]: newValue
      }));
    } else {
      setNewIssue(prev => ({
        ...prev,
        [name]: newValue
      }));
    }
  };
  
  // Create new issue
  const handleCreateIssue = async () => {
    try {
      // Get severity classification based on impact assessment
      const classification = issuePrioritizationService.classifyIssueSeverity({
        userPercentage: newIssue.userPercentage,
        frequency: newIssue.frequency,
        workaround: newIssue.workaround,
        businessImpact: newIssue.businessImpact
      });
      
      // Prepare issue data
      const issueData = {
        ...newIssue,
        severity: classification.severity,
        slaTarget: classification.slaTarget
      };
      
      // Create GitHub issue
      await issuePrioritizationService.createGitHubIssue(issueData);
      
      // Close dialog and refresh issues
      setIsDialogOpen(false);
      fetchIssues();
      
      // Reset new issue form
      setNewIssue({
        title: '',
        description: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
        component: '',
        type: 'bug',
        userPercentage: 10,
        frequency: 50,
        workaround: 50,
        businessImpact: 30
      });
    } catch (err) {
      console.error('Error creating issue:', err);
      setError('Failed to create issue. Please try again.');
    }
  };
  
  // Open assessment dialog for an issue
  const handleOpenAssessmentDialog = (issue) => {
    setSelectedIssue(issue);
    setImpactAssessment({
      userPercentage: issue.userPercentage || 10,
      frequency: issue.frequency || 50,
      workaround: issue.workaround || 50,
      businessImpact: issue.businessImpact || 30
    });
    setIsAssessmentDialogOpen(true);
  };
  
  // Close assessment dialog
  const handleCloseAssessmentDialog = () => {
    setIsAssessmentDialogOpen(false);
    setSelectedIssue(null);
  };
  
  // Update issue assessment
  const handleUpdateAssessment = async () => {
    try {
      // Get severity classification based on impact assessment
      const classification = issuePrioritizationService.classifyIssueSeverity(impactAssessment);
      
      // Prepare issue data
      const updatedIssue = {
        ...selectedIssue,
        ...impactAssessment,
        severity: classification.severity,
        slaTarget: classification.slaTarget
      };
      
      // Update issue in GitHub
      // In a real app, this would update the GitHub issue
      // For demo, just update the local state
      const updatedIssues = issues.map(issue => 
        issue.id === selectedIssue.id ? updatedIssue : issue
      );
      
      setIssues(updatedIssues);
      
      // Close dialog
      setIsAssessmentDialogOpen(false);
      setSelectedIssue(null);
    } catch (err) {
      console.error('Error updating issue assessment:', err);
      setError('Failed to update issue assessment. Please try again.');
    }
  };
  
  // Render severity chip
  const renderSeverityChip = (severity) => {
    if (!severity) return null;
    
    return (
      <Chip 
        label={severity.label}
        size="small"
        sx={{ 
          backgroundColor: severity.color,
          color: '#fff',
          fontWeight: 'bold'
        }}
      />
    );
  };
  
  // Render SLA status
  const renderSlaStatus = (issue) => {
    if (!issue.slaTarget) return null;
    
    const timeToSla = issuePrioritizationService.getTimeToSlaInHours(issue.slaTarget);
    const slaDate = new Date(issue.slaTarget).toLocaleString();
    
    if (timeToSla < 0) {
      // SLA breached
      return (
        <Tooltip title={`SLA breached! Target: ${slaDate}`}>
          <Chip
            icon={<WarningIcon />}
            label="SLA Breached"
            color="error"
            size="small"
          />
        </Tooltip>
      );
    } else if (timeToSla < 24) {
      // Within 24 hours
      return (
        <Tooltip title={`SLA approaching: ${slaDate}`}>
          <Chip
            label="Urgent"
            color="warning"
            size="small"
          />
        </Tooltip>
      );
    } else {
      // Normal
      return (
        <Tooltip title={`SLA target: ${slaDate}`}>
          <Chip
            label={`${Math.floor(timeToSla / 24)}d ${Math.floor(timeToSla % 24)}h`}
            color="info"
            size="small"
            variant="outlined"
          />
        </Tooltip>
      );
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Issue Prioritization</Typography>
        
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleOpenNewIssueDialog}
            sx={{ mr: 1 }}
          >
            New Issue
          </Button>
          <IconButton onClick={fetchIssues}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="severity-filter-label">Severity</InputLabel>
              <Select
                labelId="severity-filter-label"
                name="severity"
                value={filters.severity}
                label="Severity"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(severityLevels).map((level) => (
                  <MenuItem key={level.value} value={level.label}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                name="status"
                value={filters.status}
                label="Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Button 
              variant="outlined" 
              startIcon={<FilterListIcon />}
              onClick={() => setFilters({ severity: '', status: 'open' })}
              fullWidth
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'number'}
                  direction={orderBy === 'number' ? order : 'asc'}
                  onClick={() => handleRequestSort('number')}
                >
                  #
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={() => handleRequestSort('title')}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'severity.value'}
                  direction={orderBy === 'severity.value' ? order : 'asc'}
                  onClick={() => handleRequestSort('severity.value')}
                >
                  Severity
                </TableSortLabel>
              </TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'priorityScore'}
                  direction={orderBy === 'priorityScore' ? order : 'asc'}
                  onClick={() => handleRequestSort('priorityScore')}
                >
                  Priority Score
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading issues...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
                    No issues found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell>{issue.number}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {issue.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{renderSeverityChip(issue.severity)}</TableCell>
                  <TableCell>{renderSlaStatus(issue)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {Math.round(issue.priorityScore)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 100,
                          height: 6,
                          bgcolor: '#e0e0e0',
                          borderRadius: 3,
                          mr: 1,
                          position: 'relative'
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            borderRadius: 3,
                            backgroundImage: 'linear-gradient(to right, #ff0000, #ffcc00, #00cc00)',
                            width: `${Math.min(issue.priorityScore, 100)}%`
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Assess Impact">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenAssessmentDialog(issue)}
                      >
                        <AssessmentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="View on GitHub">
                      <IconButton
                        size="small"
                        component="a"
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener"
                      >
                        <GitHubIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* New Issue Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseNewIssueDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Issue</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Issue Title"
                value={newIssue.title}
                onChange={handleNewIssueChange}
                fullWidth
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={newIssue.description}
                onChange={handleNewIssueChange}
                fullWidth
                multiline
                rows={3}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="stepsToReproduce"
                label="Steps to Reproduce"
                value={newIssue.stepsToReproduce}
                onChange={handleNewIssueChange}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="expectedBehavior"
                label="Expected Behavior"
                value={newIssue.expectedBehavior}
                onChange={handleNewIssueChange}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="actualBehavior"
                label="Actual Behavior"
                value={newIssue.actualBehavior}
                onChange={handleNewIssueChange}
                fullWidth
                multiline
                rows={2}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Issue Type</InputLabel>
                <Select
                  name="type"
                  value={newIssue.type}
                  label="Issue Type"
                  onChange={handleNewIssueChange}
                >
                  <MenuItem value="bug">Bug</MenuItem>
                  <MenuItem value="feature">Feature Request</MenuItem>
                  <MenuItem value="improvement">Improvement</MenuItem>
                  <MenuItem value="documentation">Documentation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="component"
                label="Component"
                value={newIssue.component}
                onChange={handleNewIssueChange}
                fullWidth
                margin="normal"
                placeholder="e.g., Map, Authentication, Profile"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Impact Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                These factors determine the issue's severity and priority.
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography id="user-percentage-slider" gutterBottom>
                User Percentage Affected: {newIssue.userPercentage}%
              </Typography>
              <Slider
                value={newIssue.userPercentage}
                onChange={handleSliderChange('userPercentage')}
                aria-labelledby="user-percentage-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={100}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography id="frequency-slider" gutterBottom>
                Frequency of Occurrence: {newIssue.frequency}%
              </Typography>
              <Slider
                value={newIssue.frequency}
                onChange={handleSliderChange('frequency')}
                aria-labelledby="frequency-slider"
                valueLabelDisplay="auto"
                step={25}
                marks
                min={0}
                max={100}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography id="workaround-slider" gutterBottom>
                Workaround Difficulty: {newIssue.workaround}%
              </Typography>
              <Slider
                value={newIssue.workaround}
                onChange={handleSliderChange('workaround')}
                aria-labelledby="workaround-slider"
                valueLabelDisplay="auto"
                step={25}
                marks
                min={0}
                max={100}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography id="business-impact-slider" gutterBottom>
                Business Impact: {newIssue.businessImpact}%
              </Typography>
              <Slider
                value={newIssue.businessImpact}
                onChange={handleSliderChange('businessImpact')}
                aria-labelledby="business-impact-slider"
                valueLabelDisplay="auto"
                step={25}
                marks
                min={0}
                max={100}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Calculated Severity:
                </Typography>
                {renderSeverityChip(
                  issuePrioritizationService.classifyIssueSeverity({
                    userPercentage: newIssue.userPercentage,
                    frequency: newIssue.frequency,
                    workaround: newIssue.workaround,
                    businessImpact: newIssue.businessImpact
                  }).severity
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewIssueDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateIssue} 
            variant="contained" 
            disabled={!newIssue.title}
          >
            Create Issue
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Impact Assessment Dialog */}
      <Dialog 
        open={isAssessmentDialogOpen} 
        onClose={handleCloseAssessmentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Impact Assessment
          {selectedIssue && (
            <Typography variant="subtitle2" color="text.secondary">
              Issue #{selectedIssue.number}: {selectedIssue.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedIssue && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" paragraph>
                  Adjust the impact factors to recalculate issue severity and priority.
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography id="user-percentage-slider" gutterBottom>
                  User Percentage Affected: {impactAssessment.userPercentage}%
                </Typography>
                <Slider
                  value={impactAssessment.userPercentage}
                  onChange={handleSliderChange('userPercentage')}
                  aria-labelledby="user-percentage-slider"
                  valueLabelDisplay="auto"
                  step={5}
                  marks
                  min={0}
                  max={100}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography id="frequency-slider" gutterBottom>
                  Frequency of Occurrence: {impactAssessment.frequency}%
                </Typography>
                <Slider
                  value={impactAssessment.frequency}
                  onChange={handleSliderChange('frequency')}
                  aria-labelledby="frequency-slider"
                  valueLabelDisplay="auto"
                  step={25}
                  marks
                  min={0}
                  max={100}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography id="workaround-slider" gutterBottom>
                  Workaround Difficulty: {impactAssessment.workaround}%
                </Typography>
                <Slider
                  value={impactAssessment.workaround}
                  onChange={handleSliderChange('workaround')}
                  aria-labelledby="workaround-slider"
                  valueLabelDisplay="auto"
                  step={25}
                  marks
                  min={0}
                  max={100}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography id="business-impact-slider" gutterBottom>
                  Business Impact: {impactAssessment.businessImpact}%
                </Typography>
                <Slider
                  value={impactAssessment.businessImpact}
                  onChange={handleSliderChange('businessImpact')}
                  aria-labelledby="business-impact-slider"
                  valueLabelDisplay="auto"
                  step={25}
                  marks
                  min={0}
                  max={100}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Severity:
                  </Typography>
                  {renderSeverityChip(selectedIssue.severity)}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    New Calculated Severity:
                  </Typography>
                  {renderSeverityChip(
                    issuePrioritizationService.classifyIssueSeverity({
                      userPercentage: impactAssessment.userPercentage,
                      frequency: impactAssessment.frequency,
                      workaround: impactAssessment.workaround,
                      businessImpact: impactAssessment.businessImpact
                    }).severity
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssessmentDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateAssessment} 
            variant="contained"
          >
            Update Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssuePrioritizationDashboard; 