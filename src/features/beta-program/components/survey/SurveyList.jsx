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
  useTheme
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  
  const theme = useTheme();
  
  // Load surveys on component mount
  useEffect(() => {
    loadSurveys();
  }, []);
  
  // Load surveys from service
  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For demo purposes - using mock data
      // In real implementation, would use surveyService.getSurveys()
      const mockSurveys = [
        {
          id: 'survey_1',
          title: 'Beta Program Feedback Survey',
          description: 'Help us improve the beta program by sharing your feedback',
          questions: [
            { id: 'q1', title: 'How satisfied are you with the beta program so far?', type: 'rating' },
            { id: 'q2', title: 'What features would you like to see improved?', type: 'checkbox' }
          ],
          status: 'active',
          responses: 12,
          createdAt: '2023-03-25T14:32:01Z',
          updatedAt: '2023-03-26T09:15:22Z'
        },
        {
          id: 'survey_2',
          title: 'Travel Preferences Survey',
          description: 'Tell us about your travel preferences to help us improve tour recommendations',
          questions: [
            { id: 'q1', title: 'What types of destinations do you prefer?', type: 'checkbox' },
            { id: 'q2', title: 'How do you typically plan your trips?', type: 'radio' },
            { id: 'q3', title: 'What's your average budget for a week-long trip?', type: 'select' }
          ],
          status: 'draft',
          responses: 0,
          createdAt: '2023-03-28T11:45:33Z',
          updatedAt: '2023-03-28T11:45:33Z'
        },
        {
          id: 'survey_3',
          title: 'User Interface Evaluation',
          description: 'Provide feedback on our user interface and experience',
          questions: [
            { id: 'q1', title: 'Rate the ease of navigation', type: 'rating' },
            { id: 'q2', title: 'What aspects of the interface are confusing?', type: 'textarea' },
            { id: 'q3', title: 'How would you rate the overall design?', type: 'rating' }
          ],
          status: 'completed',
          responses: 28,
          createdAt: '2023-03-15T08:22:17Z',
          updatedAt: '2023-03-22T16:33:41Z'
        }
      ];
      
      setSurveys(mockSurveys);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Failed to load surveys. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      setLoading(true);
      
      // For demo purposes - would use surveyService in real implementation
      // await surveyService.deleteSurvey(surveyToDelete.id);
      
      // Update local state for demo
      setSurveys(prevSurveys => 
        prevSurveys.filter(s => s.id !== surveyToDelete.id)
      );
      
      setDeleteDialogOpen(false);
      setSurveyToDelete(null);
    } catch (err) {
      console.error('Error deleting survey:', err);
      // In real implementation, would show error notification
    } finally {
      setLoading(false);
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
  
  // Filter surveys based on search term
  const filteredSurveys = surveys.filter(survey => 
    survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                    {searchTerm ? (
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