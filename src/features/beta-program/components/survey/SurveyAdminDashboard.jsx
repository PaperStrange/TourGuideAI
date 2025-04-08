import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import surveyService from '../../services/SurveyService';
import SurveyBuilder from './SurveyBuilder';
import SurveyAnalytics from './SurveyAnalytics';

/**
 * Survey Admin Dashboard Component
 * Dashboard for administrators to manage surveys
 */
const SurveyAdminDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedSurveyForAnalytics, setSelectedSurveyForAnalytics] = useState(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  // Filter surveys when search query changes
  useEffect(() => {
    if (!surveys) return;
    
    if (!searchQuery) {
      setFilteredSurveys(surveys);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = surveys.filter(survey => 
      survey.title.toLowerCase().includes(query) || 
      (survey.description && survey.description.toLowerCase().includes(query))
    );
    
    setFilteredSurveys(filtered);
  }, [searchQuery, surveys]);

  /**
   * Load all surveys
   */
  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await surveyService.getSurveys();
      setSurveys(data);
      setFilteredSurveys(data);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Failed to load surveys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  /**
   * Handle creating a new survey
   */
  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowBuilder(true);
  };

  /**
   * Handle editing a survey
   */
  const handleEditSurvey = (survey) => {
    setEditingSurvey(survey);
    setShowBuilder(true);
    setActionMenuAnchor(null);
  };

  /**
   * Handle saving a survey
   */
  const handleSaveSurvey = async (survey) => {
    try {
      setLoading(true);
      
      let savedSurvey;
      
      if (survey.id && editingSurvey) {
        // Update existing survey
        savedSurvey = await surveyService.updateSurvey(survey.id, survey);
        
        // Update local state
        setSurveys(prevSurveys => 
          prevSurveys.map(s => s.id === savedSurvey.id ? savedSurvey : s)
        );
      } else {
        // Create new survey
        savedSurvey = await surveyService.createSurvey(survey);
        
        // Update local state
        setSurveys(prevSurveys => [...prevSurveys, savedSurvey]);
      }
      
      setShowBuilder(false);
      setEditingSurvey(null);
      
      // Refresh the list
      loadSurveys();
    } catch (err) {
      console.error('Error saving survey:', err);
      setError('Failed to save survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle deletion confirmation
   */
  const handleDeleteConfirm = (survey) => {
    setSurveyToDelete(survey);
    setDeleteDialogOpen(true);
    setActionMenuAnchor(null);
  };

  /**
   * Handle deleting a survey
   */
  const handleDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    
    try {
      setLoading(true);
      
      await surveyService.deleteSurvey(surveyToDelete.id);
      
      // Update local state
      setSurveys(prevSurveys => prevSurveys.filter(s => s.id !== surveyToDelete.id));
      setFilteredSurveys(prevSurveys => prevSurveys.filter(s => s.id !== surveyToDelete.id));
      
      setDeleteDialogOpen(false);
      setSurveyToDelete(null);
    } catch (err) {
      console.error('Error deleting survey:', err);
      setError('Failed to delete survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle duplicating a survey
   */
  const handleDuplicateSurvey = async (survey) => {
    try {
      const duplicate = {
        ...survey,
        title: `${survey.title} (Copy)`,
        status: 'draft',
        responses: 0,
      };
      
      delete duplicate.id; // Remove ID to create a new one
      
      const savedSurvey = await surveyService.createSurvey(duplicate);
      
      // Update local state
      setSurveys(prevSurveys => [...prevSurveys, savedSurvey]);
      
      setActionMenuAnchor(null);
      
      // Refresh the list
      loadSurveys();
    } catch (err) {
      console.error('Error duplicating survey:', err);
      setError('Failed to duplicate survey. Please try again.');
    }
  };

  /**
   * Handle viewing analytics
   */
  const handleViewAnalytics = (survey) => {
    setSelectedSurveyForAnalytics(survey.id);
    setShowAnalytics(true);
    setActionMenuAnchor(null);
  };

  /**
   * Handle copying survey link
   */
  const handleCopyLink = (survey) => {
    const surveyUrl = `${window.location.origin}/beta/surveys/${survey.id}`;
    navigator.clipboard.writeText(surveyUrl);
    
    alert(`Survey link copied to clipboard: ${surveyUrl}`);
    setActionMenuAnchor(null);
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Open action menu
   */
  const handleActionMenuOpen = (event, surveyId) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedSurveyId(surveyId);
  };

  /**
   * Close action menu
   */
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedSurveyId(null);
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'draft':
        return theme.palette.warning.main;
      case 'closed':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  /**
   * Render loading state
   */
  if (loading && surveys.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading surveys...
        </Typography>
      </Box>
    );
  }

  /**
   * Render analytics view
   */
  if (showAnalytics && selectedSurveyForAnalytics) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              setShowAnalytics(false);
              setSelectedSurveyForAnalytics(null);
            }}
          >
            Back to Surveys
          </Button>
        </Box>
        
        <SurveyAnalytics surveyId={selectedSurveyForAnalytics} />
      </Box>
    );
  }

  /**
   * Render surveys table
   */
  return (
    <Box>
      {/* Survey Builder Dialog */}
      <Dialog 
        open={showBuilder} 
        onClose={() => setShowBuilder(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          {editingSurvey ? 'Edit Survey' : 'Create New Survey'}
        </DialogTitle>
        <DialogContent dividers>
          <SurveyBuilder 
            initialSurvey={editingSurvey}
            onSave={handleSaveSurvey}
            onCancel={() => setShowBuilder(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Survey</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{surveyToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSurvey} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Main Content */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Surveys Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateSurvey}
          >
            Create Survey
          </Button>
        </Box>
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="All Surveys" />
          <Tab label="Active" />
          <Tab label="Drafts" />
          <Tab label="Closed" />
        </Tabs>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search surveys..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            variant="outlined"
            size="small"
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Survey Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Responses</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSurveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      {searchQuery ? (
                        <Typography>No surveys match your search criteria.</Typography>
                      ) : (
                        <Typography>No surveys available. Create your first survey!</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSurveys
                  .filter(survey => {
                    if (tabValue === 0) return true;
                    if (tabValue === 1) return survey.status === 'active';
                    if (tabValue === 2) return survey.status === 'draft';
                    if (tabValue === 3) return survey.status === 'closed';
                    return true;
                  })
                  .map((survey) => (
                    <TableRow key={survey.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {survey.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {survey.description && survey.description.length > 60
                              ? `${survey.description.substring(0, 60)}...`
                              : survey.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={survey.status} 
                          size="small"
                          sx={{ 
                            backgroundColor: getStatusColor(survey.status),
                            color: '#fff',
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {survey.category && (
                          <Chip 
                            label={survey.category} 
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>{survey.responses || 0}</TableCell>
                      <TableCell>{formatDate(survey.createdAt)}</TableCell>
                      <TableCell>{formatDate(survey.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <Box>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditSurvey(survey)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="More Actions">
                            <IconButton 
                              size="small"
                              onClick={(e) => handleActionMenuOpen(e, survey.id)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {selectedSurveyId && (
          <>
            <MenuItem onClick={() => handleViewAnalytics(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <AssessmentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View Analytics</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleDuplicateSurvey(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleCopyLink(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <LinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Copy Link</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleDeleteConfirm(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default SurveyAdminDashboard; 