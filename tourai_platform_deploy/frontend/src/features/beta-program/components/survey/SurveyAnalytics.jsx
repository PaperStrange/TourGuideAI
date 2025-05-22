import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  useTheme
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsightsIcon from '@mui/icons-material/Insights';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import surveyService from '../../services/SurveyService';

/**
 * Survey Analytics Component
 * Displays analytics for survey responses (admin only)
 */
const SurveyAnalytics = ({ surveyId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    loadSurveyData();
  }, [surveyId]);

  /**
   * Load all survey data and analytics
   */
  const loadSurveyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load the survey details, statistics, and report
      const surveyData = await surveyService.getSurveyById(surveyId);
      const statsData = await surveyService.getSurveyStatistics(surveyId);
      const reportData = await surveyService.generateSurveyReport(surveyId);
      const sentimentData = await surveyService.analyzeSentiment(surveyId);

      setSurvey(surveyData);
      setStats(statsData);
      setReport(reportData);
      setSentiment(sentimentData);
    } catch (err) {
      console.error('Error loading survey analytics:', err);
      setError('Failed to load survey analytics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  /**
   * Export survey responses to CSV
   */
  const handleExportCSV = async () => {
    try {
      const csvData = await surveyService.exportResponsesToCSV(surveyId);
      
      // Create a blob and download it
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `survey_${surveyId}_responses.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      alert('Failed to export survey responses. Please try again.');
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading survey analytics...
        </Typography>
      </Box>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
        {error}
      </Alert>
    );
  }

  /**
   * Render dashboard content
   */
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h1">
            Analytics: {survey?.title}
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export Responses
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={2}>
          {survey?.description}
        </Typography>
        
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Responses
                  </Typography>
                  <PeopleIcon color="primary" />
                </Box>
                <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
                  {stats?.totalResponses}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (stats?.totalResponses / 50) * 100)} 
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle2" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <AssessmentIcon color="primary" />
                </Box>
                <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
                  {Math.round(stats?.completionRate * 100)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.completionRate * 100} 
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle2" color="text.secondary">
                    Avg. Time to Complete
                  </Typography>
                  <InsightsIcon color="primary" />
                </Box>
                <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
                  {stats?.averageTimeToCompleteMinutes} min
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (stats?.averageTimeToCompleteMinutes / 10) * 100)} 
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle2" color="text.secondary">
                    Overall Sentiment
                  </Typography>
                  {sentiment?.overallSentiment > 0 ? (
                    <EmojiEmotionsIcon sx={{ color: theme.palette.success.main }} />
                  ) : (
                    <SentimentVeryDissatisfiedIcon sx={{ color: theme.palette.error.main }} />
                  )}
                </Box>
                <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
                  {Math.round(sentiment?.overallSentiment * 100)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(sentiment?.overallSentiment + 1) * 50} 
                  color={sentiment?.overallSentiment > 0 ? "success" : "error"}
                  sx={{ mb: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Summary" />
          <Tab label="Response Details" />
          <Tab label="Insights" />
          <Tab label="Sentiment Analysis" />
        </Tabs>
      </Paper>
      
      {/* Summary Tab */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Response Distribution
              </Typography>
              <Box sx={{ mt: 3 }}>
                {stats?.questionStats?.q1?.distribution?.map(item => (
                  <Box key={item.value} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">
                        Rating: {item.value}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {Math.round((item.count / stats.totalResponses) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(item.count / stats.totalResponses) * 100}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 
                            item.value > 3 ? theme.palette.success.main :
                            item.value === 3 ? theme.palette.warning.main :
                            theme.palette.error.main
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Key Takeaways
              </Typography>
              <Box sx={{ mt: 3 }}>
                {report?.keyTakeaways?.map((takeaway, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      backgroundColor: 'background.default'
                    }}
                  >
                    <Typography variant="body1">
                      {takeaway}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Popular Topics
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {report?.wordCloudData?.map((word, index) => (
                  <Chip 
                    key={index}
                    label={word.text}
                    sx={{ 
                      fontSize: 14 + (word.weight / 3),
                      fontWeight: word.weight > 10 ? 'bold' : 'normal',
                      color: word.text.match(/slow|buggy|confusing/) ? 'error.main' : 'text.primary'
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Response Details Tab */}
      {currentTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Question Responses
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            {/* Rating Question */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                How satisfied are you with our new feature?
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average rating: {stats?.questionStats?.q1?.averageRating}/5
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rating</TableCell>
                        <TableCell>Count</TableCell>
                        <TableCell>Percentage</TableCell>
                        <TableCell>Distribution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats?.questionStats?.q1?.distribution?.map(item => (
                        <TableRow key={item.value}>
                          <TableCell>{item.value} stars</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>
                            {Math.round((item.count / stats.totalResponses) * 100)}%
                          </TableCell>
                          <TableCell sx={{ width: '40%' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={(item.count / stats.totalResponses) * 100}
                              sx={{ 
                                height: 10, 
                                borderRadius: 5,
                                backgroundColor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 
                                    item.value > 3 ? theme.palette.success.main :
                                    item.value === 3 ? theme.palette.warning.main :
                                    theme.palette.error.main
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Multiple Choice Question */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Which aspects of the feature did you find most useful?
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Multiple selection allowed
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Option</TableCell>
                        <TableCell>Count</TableCell>
                        <TableCell>Percentage</TableCell>
                        <TableCell>Distribution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats?.questionStats?.q2?.optionCounts?.map(item => (
                        <TableRow key={item.optionId}>
                          <TableCell>{item.text}</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>
                            {Math.round((item.count / stats.totalResponses) * 100)}%
                          </TableCell>
                          <TableCell sx={{ width: '40%' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={(item.count / stats.totalResponses) * 100}
                              sx={{ 
                                height: 10, 
                                borderRadius: 5 
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Boolean Question */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Would you recommend this feature to others?
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="success.main">
                    {stats?.questionStats?.q4?.yesPercentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Yes ({stats?.questionStats?.q4?.yesCount})
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="error.main">
                    {100 - stats?.questionStats?.q4?.yesPercentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No ({stats?.questionStats?.q4?.noCount})
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Insights Tab */}
      {currentTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Survey Insights
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            {report?.insights?.map((insight, index) => (
              <Card key={index} sx={{ mb: 3, borderLeft: '4px solid', borderColor: getInsightColor(insight) }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {insight.sentimentScore >= 0.5 ? (
                      <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                    ) : insight.sentimentScore <= -0.3 ? (
                      <TrendingDownIcon sx={{ color: theme.palette.error.main, mr: 1 }} />
                    ) : (
                      <InsightsIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
                    )}
                    
                    <Chip 
                      label={insight.type} 
                      size="small" 
                      color={getInsightChipColor(insight)} 
                    />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {insight.text}
                  </Typography>
                  
                  {insight.relatedQuestions && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Based on responses to question {insight.relatedQuestions.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                User Segments
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderTop: `4px solid ${theme.palette.success.main}` }}>
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        {report?.segments?.highRaters}
                      </Typography>
                      <Typography variant="body1">
                        High Raters (4-5)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Math.round((report?.segments?.highRaters / stats?.totalResponses) * 100)}% of total responses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderTop: `4px solid ${theme.palette.warning.main}` }}>
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        {report?.segments?.mediumRaters}
                      </Typography>
                      <Typography variant="body1">
                        Medium Raters (3)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Math.round((report?.segments?.mediumRaters / stats?.totalResponses) * 100)}% of total responses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderTop: `4px solid ${theme.palette.error.main}` }}>
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        {report?.segments?.lowRaters}
                      </Typography>
                      <Typography variant="body1">
                        Low Raters (1-2)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {Math.round((report?.segments?.lowRaters / stats?.totalResponses) * 100)}% of total responses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Sentiment Analysis Tab */}
      {currentTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sentiment Analysis
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Overall Sentiment Score
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mt: 2
                    }}>
                      {sentiment?.overallSentiment > 0 ? (
                        <EmojiEmotionsIcon 
                          sx={{ 
                            fontSize: 40, 
                            color: theme.palette.success.main,
                            mr: 2
                          }} 
                        />
                      ) : (
                        <SentimentVeryDissatisfiedIcon 
                          sx={{ 
                            fontSize: 40, 
                            color: theme.palette.error.main,
                            mr: 2
                          }} 
                        />
                      )}
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h4">
                          {Math.round(sentiment?.overallSentiment * 100)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sentiment?.overallSentiment > 0.7 ? 'Very Positive' :
                           sentiment?.overallSentiment > 0.3 ? 'Positive' :
                           sentiment?.overallSentiment > -0.3 ? 'Neutral' :
                           sentiment?.overallSentiment > -0.7 ? 'Negative' : 'Very Negative'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Top Themes
                  </Typography>
                  
                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Positive Themes
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        {sentiment?.topPositiveThemes?.map((theme, index) => (
                          <Chip 
                            key={index}
                            label={theme}
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                  
                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Negative Themes
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        {sentiment?.topNegativeThemes?.map((theme, index) => (
                          <Chip 
                            key={index}
                            label={theme}
                            color="error"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Keyword Sentiment Analysis
                    </Typography>
                    
                    <TableContainer sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Keyword</TableCell>
                            <TableCell>Mentions</TableCell>
                            <TableCell>Sentiment</TableCell>
                            <TableCell>Score</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sentiment?.questionSentiments?.q3?.keywords?.map((keyword, index) => (
                            <TableRow key={index}>
                              <TableCell>{keyword.text}</TableCell>
                              <TableCell>{keyword.count}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={keyword.score > 0 ? 'Positive' : keyword.score < 0 ? 'Negative' : 'Neutral'}
                                  size="small"
                                  color={keyword.score > 0 ? 'success' : keyword.score < 0 ? 'error' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                {Math.round(keyword.score * 100)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

/**
 * Helper to get insight color based on sentiment
 */
const getInsightColor = (insight) => {
  if (insight.sentimentScore >= 0.5) return 'success.main';
  if (insight.sentimentScore <= -0.3) return 'error.main';
  if (insight.type === 'highlight') return 'primary.main';
  if (insight.type === 'trend') return 'info.main';
  return 'grey.500';
};

/**
 * Helper to get insight chip color
 */
const getInsightChipColor = (insight) => {
  if (insight.sentimentScore >= 0.5) return 'success';
  if (insight.sentimentScore <= -0.3) return 'error';
  if (insight.type === 'highlight') return 'primary';
  if (insight.type === 'trend') return 'info';
  return 'default';
};

export default SurveyAnalytics; 