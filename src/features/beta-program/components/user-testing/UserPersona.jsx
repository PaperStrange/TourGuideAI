import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Grid,
  Chip,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import userSegmentService from '../../services/UserSegmentService';

/**
 * User Persona component for defining target user profiles for testing
 */
const UserPersona = () => {
  const [personas, setPersonas] = useState([
    {
      id: 'persona-1',
      name: 'Business Traveler',
      description: 'Frequent business travelers who use the app to plan efficient business trips',
      demographics: {
        age: '35-44',
        gender: 'All',
        occupation: 'Professional',
        income: '$100k-$150k',
        education: 'Bachelor\'s or higher'
      },
      behaviors: {
        travelFrequency: '6+ trips/year',
        deviceUsage: 'Mobile',
        techSavviness: 'Advanced'
      },
      goals: [
        'Find efficient routes between meetings',
        'Discover dining options near meeting locations',
        'Keep track of travel expenses'
      ],
      painPoints: [
        'Limited time for planning trips',
        'Need for reliable recommendations',
        'Keeping track of multiple destinations'
      ],
      createdAt: new Date('2023-04-22').toISOString()
    },
    {
      id: 'persona-2',
      name: 'Leisure Explorer',
      description: 'Vacation travelers who want to discover unique experiences in new destinations',
      demographics: {
        age: '25-34',
        gender: 'All',
        occupation: 'Various',
        income: '$60k-$100k',
        education: 'Various'
      },
      behaviors: {
        travelFrequency: '1-2 trips/year',
        deviceUsage: 'Multiple devices',
        techSavviness: 'Intermediate'
      },
      goals: [
        'Discover hidden gems in new locations',
        'Create memorable travel experiences',
        'Balance popular attractions with unique adventures'
      ],
      painPoints: [
        'Overwhelmed by too many options',
        'Difficulty finding authentic experiences',
        'Balancing budget with experiences'
      ],
      createdAt: new Date('2023-04-23').toISOString()
    }
  ]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [currentPersona, setCurrentPersona] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    demographics: {
      age: '',
      gender: '',
      occupation: '',
      income: '',
      education: ''
    },
    behaviors: {
      travelFrequency: '',
      deviceUsage: '',
      techSavviness: ''
    },
    goals: [''],
    painPoints: ['']
  });
  const [error, setError] = useState(null);
  
  const handleOpenDialog = (persona = null) => {
    if (persona) {
      // Edit existing persona
      setCurrentPersona(persona);
      setFormData({
        name: persona.name,
        description: persona.description,
        demographics: { ...persona.demographics },
        behaviors: { ...persona.behaviors },
        goals: [...persona.goals],
        painPoints: [...persona.painPoints]
      });
    } else {
      // Create new persona
      setCurrentPersona(null);
      setFormData({
        name: '',
        description: '',
        demographics: {
          age: '',
          gender: '',
          occupation: '',
          income: '',
          education: ''
        },
        behaviors: {
          travelFrequency: '',
          deviceUsage: '',
          techSavviness: ''
        },
        goals: [''],
        painPoints: ['']
      });
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleDemographicChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      demographics: {
        ...formData.demographics,
        [name]: value
      }
    });
  };
  
  const handleBehaviorChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      behaviors: {
        ...formData.behaviors,
        [name]: value
      }
    });
  };
  
  const handleGoalChange = (index, value) => {
    const updatedGoals = [...formData.goals];
    updatedGoals[index] = value;
    setFormData({
      ...formData,
      goals: updatedGoals
    });
  };
  
  const handlePainPointChange = (index, value) => {
    const updatedPainPoints = [...formData.painPoints];
    updatedPainPoints[index] = value;
    setFormData({
      ...formData,
      painPoints: updatedPainPoints
    });
  };
  
  const handleAddGoal = () => {
    setFormData({
      ...formData,
      goals: [...formData.goals, '']
    });
  };
  
  const handleAddPainPoint = () => {
    setFormData({
      ...formData,
      painPoints: [...formData.painPoints, '']
    });
  };
  
  const handleRemoveGoal = (index) => {
    const updatedGoals = formData.goals.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      goals: updatedGoals
    });
  };
  
  const handleRemovePainPoint = (index) => {
    const updatedPainPoints = formData.painPoints.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      painPoints: updatedPainPoints
    });
  };
  
  const handleSavePersona = () => {
    // Validate form
    if (!formData.name.trim()) {
      setError('Persona name is required');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Persona description is required');
      return;
    }
    
    // Remove empty goals and pain points
    const goals = formData.goals.filter(goal => goal.trim() !== '');
    const painPoints = formData.painPoints.filter(point => point.trim() !== '');
    
    if (goals.length === 0) {
      setError('At least one goal is required');
      return;
    }
    
    if (painPoints.length === 0) {
      setError('At least one pain point is required');
      return;
    }
    
    const personaData = {
      ...formData,
      goals,
      painPoints
    };
    
    if (currentPersona) {
      // Update existing persona
      const updatedPersonas = personas.map(p => 
        p.id === currentPersona.id 
          ? { ...currentPersona, ...personaData, updatedAt: new Date().toISOString() } 
          : p
      );
      setPersonas(updatedPersonas);
    } else {
      // Create new persona
      const newPersona = {
        id: `persona-${Date.now()}`,
        ...personaData,
        createdAt: new Date().toISOString()
      };
      setPersonas([...personas, newPersona]);
      
      // In a real app, we would call the service
      // userSegmentService.createPersona(personaData);
    }
    
    handleCloseDialog();
  };
  
  const handleDeletePersona = (personaId) => {
    const updatedPersonas = personas.filter(p => p.id !== personaId);
    setPersonas(updatedPersonas);
  };
  
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };
  
  const getRandomColor = (id) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'
    ];
    const hash = id.split('-')[1] % colors.length;
    return colors[hash];
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          User Personas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create New Persona
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {personas.map(persona => (
          <Grid item xs={12} md={6} key={persona.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: getRandomColor(persona.id), 
                      mr: 2 
                    }}
                  >
                    {getInitials(persona.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="h3">
                      {persona.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(persona.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body1" paragraph>
                  {persona.description}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Demographics
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(persona.demographics).map(([key, value]) => (
                    value && (
                      <Chip 
                        key={key} 
                        label={`${key}: ${value}`} 
                        size="small" 
                        variant="outlined" 
                      />
                    )
                  ))}
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Behaviors
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(persona.behaviors).map(([key, value]) => (
                    value && (
                      <Chip 
                        key={key} 
                        label={`${key}: ${value}`} 
                        size="small" 
                        variant="outlined" 
                      />
                    )
                  ))}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Goals
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                  {persona.goals.map((goal, index) => (
                    <Typography component="li" key={index} variant="body2">
                      {goal}
                    </Typography>
                  ))}
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Pain Points
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  {persona.painPoints.map((point, index) => (
                    <Typography component="li" key={index} variant="body2">
                      {point}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(persona)}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeletePersona(persona.id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Empty state */}
      {personas.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" paragraph>
            No user personas defined yet. Create your first persona to help define target users.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create First Persona
          </Button>
        </Paper>
      )}
      
      {/* Persona Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {currentPersona ? `Edit Persona: ${currentPersona.name}` : 'Create New User Persona'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Persona Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={2}
              required
            />
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Demographics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Age Range</InputLabel>
                  <Select
                    name="age"
                    value={formData.demographics.age}
                    onChange={handleDemographicChange}
                    label="Age Range"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="18-24">18-24</MenuItem>
                    <MenuItem value="25-34">25-34</MenuItem>
                    <MenuItem value="35-44">35-44</MenuItem>
                    <MenuItem value="45-54">45-54</MenuItem>
                    <MenuItem value="55-64">55-64</MenuItem>
                    <MenuItem value="65+">65+</MenuItem>
                    <MenuItem value="All">All ages</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    name="gender"
                    value={formData.demographics.gender}
                    onChange={handleDemographicChange}
                    label="Gender"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Non-binary">Non-binary</MenuItem>
                    <MenuItem value="All">All genders</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Occupation</InputLabel>
                  <Select
                    name="occupation"
                    value={formData.demographics.occupation}
                    onChange={handleDemographicChange}
                    label="Occupation"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="Student">Student</MenuItem>
                    <MenuItem value="Professional">Professional</MenuItem>
                    <MenuItem value="Self-employed">Self-employed</MenuItem>
                    <MenuItem value="Retired">Retired</MenuItem>
                    <MenuItem value="Various">Various</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Income</InputLabel>
                  <Select
                    name="income"
                    value={formData.demographics.income}
                    onChange={handleDemographicChange}
                    label="Income"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="<$30k">Less than $30k</MenuItem>
                    <MenuItem value="$30k-$60k">$30k-$60k</MenuItem>
                    <MenuItem value="$60k-$100k">$60k-$100k</MenuItem>
                    <MenuItem value="$100k-$150k">$100k-$150k</MenuItem>
                    <MenuItem value=">$150k">More than $150k</MenuItem>
                    <MenuItem value="Various">Various</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Education</InputLabel>
                  <Select
                    name="education"
                    value={formData.demographics.education}
                    onChange={handleDemographicChange}
                    label="Education"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="High School">High School</MenuItem>
                    <MenuItem value="Bachelor's">Bachelor's</MenuItem>
                    <MenuItem value="Master's">Master's</MenuItem>
                    <MenuItem value="PhD">PhD</MenuItem>
                    <MenuItem value="Bachelor's or higher">Bachelor's or higher</MenuItem>
                    <MenuItem value="Various">Various</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Behaviors
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Travel Frequency</InputLabel>
                  <Select
                    name="travelFrequency"
                    value={formData.behaviors.travelFrequency}
                    onChange={handleBehaviorChange}
                    label="Travel Frequency"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="Rarely">Rarely</MenuItem>
                    <MenuItem value="1-2 trips/year">1-2 trips/year</MenuItem>
                    <MenuItem value="3-5 trips/year">3-5 trips/year</MenuItem>
                    <MenuItem value="6+ trips/year">6+ trips/year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Device Usage</InputLabel>
                  <Select
                    name="deviceUsage"
                    value={formData.behaviors.deviceUsage}
                    onChange={handleBehaviorChange}
                    label="Device Usage"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="Desktop">Desktop</MenuItem>
                    <MenuItem value="Mobile">Mobile</MenuItem>
                    <MenuItem value="Tablet">Tablet</MenuItem>
                    <MenuItem value="Multiple devices">Multiple devices</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Tech Savviness</InputLabel>
                  <Select
                    name="techSavviness"
                    value={formData.behaviors.techSavviness}
                    onChange={handleBehaviorChange}
                    label="Tech Savviness"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                    <MenuItem value="Expert">Expert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Goals
              <IconButton 
                size="small" 
                color="primary" 
                onClick={handleAddGoal}
                sx={{ ml: 1 }}
              >
                <AddIcon />
              </IconButton>
            </Typography>
            {formData.goals.map((goal, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Goal ${index + 1}`}
                  value={goal}
                  onChange={(e) => handleGoalChange(index, e.target.value)}
                  required={index === 0}
                />
                <IconButton 
                  color="error" 
                  onClick={() => handleRemoveGoal(index)}
                  disabled={formData.goals.length <= 1 && index === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Pain Points
              <IconButton 
                size="small" 
                color="primary" 
                onClick={handleAddPainPoint}
                sx={{ ml: 1 }}
              >
                <AddIcon />
              </IconButton>
            </Typography>
            {formData.painPoints.map((point, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Pain Point ${index + 1}`}
                  value={point}
                  onChange={(e) => handlePainPointChange(index, e.target.value)}
                  required={index === 0}
                />
                <IconButton 
                  color="error" 
                  onClick={() => handleRemovePainPoint(index)}
                  disabled={formData.painPoints.length <= 1 && index === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSavePersona} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserPersona; 