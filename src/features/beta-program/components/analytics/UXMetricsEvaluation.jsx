import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  ButtonGroup,
  Button
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Timeline,
  AccessTime,
  Mouse,
  TouchApp,
  HelpOutline,
  ErrorOutline,
  Info,
  FilterAlt
} from '@mui/icons-material';

// Mock service that would fetch real data in production
const fetchMetricsData = (timeframe) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        timeToInteract: {
          value: 2.7,
          trend: -0.3,
          unit: 'seconds'
        },
        timeToFirstClick: {
          value: 4.2,
          trend: -0.5,
          unit: 'seconds'
        },
        pageLoadTime: {
          value: 1.8,
          trend: -0.2,
          unit: 'seconds'
        },
        userSatisfactionScore: {
          value: 8.2,
          trend: 0.4,
          unit: '/10'
        },
        errorRate: {
          value: 0.8,
          trend: -0.2,
          unit: '%'
        },
        sessionLength: {
          value: 5.4,
          trend: 0.7,
          unit: 'minutes'
        },
        formCompletionRate: {
          value: 87,
          trend: 3,
          unit: '%'
        },
        bounceRate: {
          value: 24,
          trend: -2,
          unit: '%'
        },
        interactionsPerSession: {
          value: 14.3,
          trend: 1.2,
          unit: ''
        },
        taskSuccessRate: {
          value: 92,
          trend: 1,
          unit: '%'
        },
        frictionPoints: [
          { page: '/onboarding/preferences', issue: 'Multiple form errors', count: 24 },
          { page: '/features/list', issue: 'No scroll indicator', count: 18 },
          { page: '/user/profile', issue: 'Slow image upload', count: 15 }
        ],
        userFlows: [
          { path: 'Home → Features → Documentation', conversion: 78, dropoff: 22 },
          { path: 'Home → Survey → Feedback', conversion: 65, dropoff: 35 },
          { path: 'Login → Profile → Settings', conversion: 92, dropoff: 8 }
        ]
      });
    }, 1200);
  });
};

const UXMetricsEvaluation = ({ dateRange, onInsightClick }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month'
  
  useEffect(() => {
    setLoading(true);
    fetchMetricsData(timeframe)
      .then(data => {
        setMetrics(data);
        setLoading(false);
      });
  }, [timeframe, dateRange]);
  
  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  const renderTrend = (trend) => {
    if (trend > 0) {
      return (
        <Box component="span" sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}>
          <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
          +{trend}
        </Box>
      );
    } else if (trend < 0) {
      return (
        <Box component="span" sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}>
          <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
          {trend}
        </Box>
      );
    }
    return null;
  };
  
  const renderMetricCard = (title, iconComponent, data, tooltipText) => {
    if (!data) return null;
    
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Tooltip title={tooltipText}>
              <HelpOutline fontSize="small" color="action" />
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {iconComponent}
            <Typography variant="h4" component="div" sx={{ ml: 1 }}>
              {data.value}<Typography variant="body2" component="span">{data.unit}</Typography>
            </Typography>
          </Box>
          
          {renderTrend(data.trend)}
        </CardContent>
      </Card>
    );
  };
  
  const renderPerformanceTab = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Time to First Interaction', 
          <Timeline color="primary" />, 
          metrics?.timeToInteract,
          'Average time until users first interact with the page after it loads'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Page Load Time', 
          <AccessTime color="primary" />, 
          metrics?.pageLoadTime,
          'Average time for the page to fully load and become interactive'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Error Rate', 
          <ErrorOutline color="error" />, 
          metrics?.errorRate,
          'Percentage of sessions with JavaScript errors or failed requests'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Time to First Click', 
          <Mouse color="primary" />, 
          metrics?.timeToFirstClick,
          'Average time until users make their first click after page load'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Form Completion Rate', 
          <Info color="primary" />, 
          metrics?.formCompletionRate,
          'Percentage of started forms that get completed and submitted'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Task Success Rate', 
          <Info color="primary" />, 
          metrics?.taskSuccessRate,
          'Percentage of user tasks completed successfully'
        )}
      </Grid>
    </Grid>
  );
  
  const renderEngagementTab = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'User Satisfaction', 
          <TouchApp color="primary" />, 
          metrics?.userSatisfactionScore,
          'Average user satisfaction score from feedback surveys'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Session Length', 
          <Timeline color="primary" />, 
          metrics?.sessionLength,
          'Average time users spend in a single session'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Bounce Rate', 
          <TrendingDown color="error" />, 
          metrics?.bounceRate,
          'Percentage of users who leave after viewing only one page'
        )}
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        {renderMetricCard(
          'Interactions Per Session', 
          <TouchApp color="primary" />, 
          metrics?.interactionsPerSession,
          'Average number of clicks, scrolls, and other interactions per session'
        )}
      </Grid>
    </Grid>
  );
  
  const renderInsightsTab = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Friction Points
            </Typography>
            <List>
              {metrics?.frictionPoints.map((point, index) => (
                <ListItem 
                  key={index}
                  secondaryAction={
                    <Typography variant="body2" color="error">
                      {point.count} issues
                    </Typography>
                  }
                  sx={{ 
                    px: 1, 
                    borderLeft: '4px solid',
                    borderColor: 'error.main', 
                    mb: 1,
                    bgcolor: 'error.light',
                    opacity: 0.8,
                    borderRadius: '4px'
                  }}
                >
                  <ListItemText
                    primary={point.page}
                    secondary={point.issue}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<FilterAlt />}
              onClick={() => onInsightClick && onInsightClick('friction')}
              sx={{ mt: 1 }}
            >
              View All Friction Points
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Flows
            </Typography>
            <List>
              {metrics?.userFlows.map((flow, index) => (
                <ListItem 
                  key={index}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="success.main" sx={{ mr: 1 }}>
                        {flow.conversion}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={flow.conversion} 
                        color="success"
                        sx={{ width: 60 }}
                      />
                    </Box>
                  }
                  sx={{ px: 1 }}
                >
                  <ListItemText
                    primary={flow.path}
                    secondary={`${flow.dropoff}% drop-off`}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
            </List>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<Timeline />}
              onClick={() => onInsightClick && onInsightClick('flows')}
              sx={{ mt: 1 }}
            >
              Analyze User Flows
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          UX Metrics Evaluation
        </Typography>
        
        <ButtonGroup size="small" variant="outlined">
          <Button 
            onClick={() => handleTimeframeChange('day')}
            variant={timeframe === 'day' ? 'contained' : 'outlined'}
          >
            Day
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('week')}
            variant={timeframe === 'week' ? 'contained' : 'outlined'}
          >
            Week
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('month')}
            variant={timeframe === 'month' ? 'contained' : 'outlined'}
          >
            Month
          </Button>
        </ButtonGroup>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Performance" />
            <Tab label="User Engagement" />
            <Tab label="Insights" />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderPerformanceTab()}
            {activeTab === 1 && renderEngagementTab()}
            {activeTab === 2 && renderInsightsTab()}
          </Box>
        </>
      )}
    </Paper>
  );
};

UXMetricsEvaluation.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.instanceOf(Date),
    endDate: PropTypes.instanceOf(Date)
  }),
  onInsightClick: PropTypes.func
};

export default UXMetricsEvaluation; 