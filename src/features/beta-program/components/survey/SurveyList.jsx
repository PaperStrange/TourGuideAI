import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  List,
  ListItem,
  ListItemSecondaryAction,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ContentCopy as DuplicateIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Poll as PollIcon,
  Share as ShareIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import SurveyBuilder from './SurveyBuilder';
import { format } from 'date-fns';
import SurveyService from '../../services/SurveyService';

/**
 * Survey List component
 * Displays and manages surveys for the beta program
 * 
 * @param {Object} props Component props
 * @param {Function} props.onSelect Callback when a survey is selected
 * @param {Object} props.surveyService Service for managing surveys
 */
const SurveyList = ({ onSelect, surveyService }) => {
  // State
  const [surveys, setSurveys] = useState([]);
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  
  const theme = useTheme();
  
  // Load surveys on component mount
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
  
  // Load surveys from API
  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await SurveyService.getSurveys();
      setSurveys(data);
      setFilteredSurveys(data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Failed to load surveys. Please try again.');
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (err) {
      return 'Invalid date';
    }
  };
  
  // Create a new survey
  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowBuilder(true);
  };
  
  // Edit an existing survey
  const handleEditSurvey = (survey) => {
    setEditingSurvey(survey);
    setShowBuilder(true);
    setActionMenuAnchor(null);
  };
  
  // Save survey (create or update)
  const handleSaveSurvey = async (survey) => {
    try {
      setLoading(true);
      
      // For demo purposes - would use surveyService methods in real implementation
      // if (editingSurvey) {
      //   await surveyService.updateSurvey(survey);
      // } else {
      //   await surveyService.createSurvey(survey);
      // }
      
      // Update local state for demo
      if (editingSurvey) {
        setSurveys(prevSurveys => 
          prevSurveys.map(s => s.id === survey.id ? survey : s)
        );
      } else {
        setSurveys(prevSurveys => [...prevSurveys, survey]);
      }
      
      setShowBuilder(false);
      setEditingSurvey(null);
    } catch (err) {
      console.error('Error saving survey:', err);
      // In real implementation, would show error notification
    } finally {
      setLoading(false);
    }
  };
  
  // Handle survey deletion confirmation
  const handleDeleteConfirm = (survey) => {
    setSurveyToDelete(survey);
    setDeleteDialogOpen(true);
    setActionMenuAnchor(null);
  };
  
  // Delete a survey
  const handleDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    
    try {
      await SurveyService.deleteSurvey(surveyToDelete.id);
      
      // Update local state for demo
      const updatedSurveys = surveys.filter(s => s.id !== surveyToDelete.id);
      setSurveys(updatedSurveys);
      setFilteredSurveys(
        filteredSurveys.filter(s => s.id !== surveyToDelete.id)
      );
      
      setDeleteDialogOpen(false);
      setSurveyToDelete(null);
    } catch (err) {
      console.error('Error deleting survey:', err);
      // In real implementation, would show error notification
    }
  };
  
  // View survey responses
  const handleViewResponses = (survey) => {
    if (onSelect) {
      onSelect(survey, 'responses');
    }
    setActionMenuAnchor(null);
  };
  
  // Duplicate a survey
  const handleDuplicateSurvey = (survey) => {
    const duplicate = {
      ...survey,
      id: `survey_${Date.now()}`,
      title: `${survey.title} (Copy)`,
      status: 'draft',
      responses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSurveys(prevSurveys => [...prevSurveys, duplicate]);
    setActionMenuAnchor(null);
  };
  
  // Open action menu
  const handleActionMenuOpen = (event, surveyId) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedSurveyId(surveyId);
  };
  
  // Close action menu
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedSurveyId(null);
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'draft':
        return theme.palette.warning.main;
      case 'completed':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading surveys...
        </Typography>
      </Box>
    );
  }
  
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBuilder(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Survey</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{surveyToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
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
      
      {/* Survey List Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Beta Program Surveys
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
      
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
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
      </Paper>
      
      {/* Survey List Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Survey Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Questions</TableCell>
              <TableCell>Responses</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(3)).map((_, index) => (
                <TableRow key={index}>
                  {Array.from(new Array(6)).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton animation="wave" height={24} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredSurveys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
              filteredSurveys.map((survey) => (
                <TableRow key={survey.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{survey.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {survey.description.length > 60
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
                  <TableCell>{survey.questions.length}</TableCell>
                  <TableCell>{survey.responses}</TableCell>
                  <TableCell>{formatDate(survey.updatedAt)}</TableCell>
                  <TableCell align="right">
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditSurvey(survey)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, survey.id)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {selectedSurveyId && (
          <>
            <MenuItem onClick={() => handleViewResponses(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <PollIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View Responses</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleDuplicateSurvey(surveys.find(s => s.id === selectedSurveyId))}>
              <ListItemIcon>
                <DuplicateIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share</ListItemText>
            </MenuItem>
            <MenuItem>
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

export default SurveyList; 