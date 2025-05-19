import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Paper,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  Divider,
  Chip,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import SurveyService from '../../services/SurveyService';

// Question types
const QUESTION_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SELECT: 'select',
  RATING: 'rating',
  EMAIL: 'email',
  NUMBER: 'number',
  DATE: 'date'
};

/**
 * Survey Builder component
 * Allows administrators to create customizable surveys with conditional logic
 * 
 * @param {Object} props Component props
 * @param {Object} props.initialSurvey Initial survey data (if editing)
 * @param {Function} props.onSave Callback function when a survey is saved
 */
const SurveyBuilder = ({ initialSurvey = null, onSave }) => {
  // Survey state
  const [survey, setSurvey] = useState({
    id: initialSurvey?.id || `survey_${Date.now()}`,
    title: initialSurvey?.title || 'Untitled Survey',
    description: initialSurvey?.description || '',
    questions: initialSurvey?.questions || [],
    settings: initialSurvey?.settings || {
      allowAnonymous: true,
      requireAllQuestions: false,
      showProgressBar: true,
      randomizeQuestions: false,
      showThankYouMessage: true,
      thankYouMessage: 'Thank you for completing the survey!'
    }
  });
  
  // UI state
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [validationError, setValidationError] = useState(null);
  
  // Initialize active question when editing existing survey
  useEffect(() => {
    if (survey.questions.length > 0 && activeQuestion === null) {
      setActiveQuestion(survey.questions[0]);
      setEditingQuestionIndex(0);
    }
  }, [survey.questions, activeQuestion]);
  
  // Create a new question
  const createNewQuestion = (type = QUESTION_TYPES.TEXT) => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type,
      title: 'New Question',
      required: false,
      options: type === QUESTION_TYPES.RADIO || type === QUESTION_TYPES.CHECKBOX || type === QUESTION_TYPES.SELECT 
        ? [{ id: `opt_${Date.now()}`, text: 'Option 1' }] 
        : [],
      conditions: []
    };
    
    setActiveQuestion(newQuestion);
    setEditingQuestionIndex(survey.questions.length);
    setSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };
  
  // Update survey title
  const handleSurveyTitleChange = (e) => {
    setSurvey(prev => ({
      ...prev,
      title: e.target.value
    }));
  };
  
  // Update survey description
  const handleSurveyDescriptionChange = (e) => {
    setSurvey(prev => ({
      ...prev,
      description: e.target.value
    }));
  };
  
  // Select a question for editing
  const handleSelectQuestion = (question, index) => {
    setActiveQuestion(question);
    setEditingQuestionIndex(index);
  };
  
  // Update active question
  const updateActiveQuestion = (updates) => {
    const updatedQuestion = { ...activeQuestion, ...updates };
    setActiveQuestion(updatedQuestion);
    
    setSurvey(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[editingQuestionIndex] = updatedQuestion;
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Update question title
  const handleQuestionTitleChange = (e) => {
    updateActiveQuestion({ title: e.target.value });
  };
  
  // Toggle question required flag
  const handleRequiredToggle = (e) => {
    updateActiveQuestion({ required: e.target.checked });
  };
  
  // Add new option to question
  const handleAddOption = () => {
    const newOption = {
      id: `opt_${Date.now()}`,
      text: `Option ${activeQuestion.options.length + 1}`
    };
    
    updateActiveQuestion({
      options: [...activeQuestion.options, newOption]
    });
  };
  
  // Update option text
  const handleOptionTextChange = (index, text) => {
    const updatedOptions = [...activeQuestion.options];
    updatedOptions[index] = { ...updatedOptions[index], text };
    
    updateActiveQuestion({ options: updatedOptions });
  };
  
  // Remove option
  const handleRemoveOption = (index) => {
    const updatedOptions = activeQuestion.options.filter((_, i) => i !== index);
    updateActiveQuestion({ options: updatedOptions });
  };
  
  // Handle question reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const questions = [...survey.questions];
    const [removed] = questions.splice(result.source.index, 1);
    questions.splice(result.destination.index, 0, removed);
    
    // Update editing index to follow the moved question
    const newEditingIndex = result.destination.index;
    setEditingQuestionIndex(newEditingIndex);
    setActiveQuestion(questions[newEditingIndex]);
    
    setSurvey(prev => ({
      ...prev,
      questions
    }));
  };
  
  // Remove a question
  const handleRemoveQuestion = (index) => {
    setSurvey(prev => {
      const updatedQuestions = prev.questions.filter((_, i) => i !== index);
      
      // Select a new active question if needed
      if (index === editingQuestionIndex) {
        if (updatedQuestions.length > 0) {
          const newIndex = Math.min(index, updatedQuestions.length - 1);
          setActiveQuestion(updatedQuestions[newIndex]);
          setEditingQuestionIndex(newIndex);
        } else {
          setActiveQuestion(null);
          setEditingQuestionIndex(-1);
        }
      } else if (index < editingQuestionIndex) {
        // If removed question was before the current one, adjust index
        setEditingQuestionIndex(editingQuestionIndex - 1);
      }
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Add conditional logic to a question
  const handleAddCondition = () => {
    // Find the first question that can be used as a condition
    const availableQuestions = survey.questions.filter((q, index) => 
      index < editingQuestionIndex && 
      (q.type === QUESTION_TYPES.RADIO || q.type === QUESTION_TYPES.SELECT || 
        q.type === QUESTION_TYPES.CHECKBOX)
    );
    
    if (availableQuestions.length === 0) {
      setValidationError('No questions available to create conditions. Add radio or select questions first.');
      return;
    }
    
    const sourceQuestion = availableQuestions[0];
    const newCondition = {
      id: `cond_${Date.now()}`,
      questionId: sourceQuestion.id,
      operator: 'equals',
      value: sourceQuestion.options[0]?.id || '',
      action: 'show'
    };
    
    updateActiveQuestion({
      conditions: [...activeQuestion.conditions, newCondition]
    });
  };
  
  // Update condition
  const handleUpdateCondition = (index, field, value) => {
    const updatedConditions = [...activeQuestion.conditions];
    updatedConditions[index] = { 
      ...updatedConditions[index], 
      [field]: value 
    };
    
    updateActiveQuestion({ conditions: updatedConditions });
  };
  
  // Remove condition
  const handleRemoveCondition = (index) => {
    const updatedConditions = activeQuestion.conditions.filter((_, i) => i !== index);
    updateActiveQuestion({ conditions: updatedConditions });
  };
  
  // Toggle survey settings
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Update survey settings
  const handleSettingChange = (setting, value) => {
    setSurvey(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  };
  
  // Toggle preview mode
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };
  
  // Validate survey before saving
  const validateSurvey = () => {
    if (!survey.title.trim()) {
      setValidationError('Please enter a survey title');
      return false;
    }
    
    if (survey.questions.length === 0) {
      setValidationError('Please add at least one question');
      return false;
    }
    
    // Check each question
    for (const question of survey.questions) {
      if (!question.title.trim()) {
        setValidationError('All questions must have a title');
        return false;
      }
      
      // Check options for multiple choice questions
      if ([QUESTION_TYPES.RADIO, QUESTION_TYPES.CHECKBOX, QUESTION_TYPES.SELECT].includes(question.type)) {
        if (question.options.length === 0) {
          setValidationError('Multiple choice questions must have at least one option');
          return false;
        }
        
        // Check that all options have text
        if (question.options.some(opt => !opt.text.trim())) {
          setValidationError('All options must have text');
          return false;
        }
      }
      
      // Validate conditions
      if (question.conditions.length > 0) {
        for (const condition of question.conditions) {
          if (!condition.questionId || !condition.value) {
            setValidationError('Conditions must have a source question and value');
            return false;
          }
        }
      }
    }
    
    return true;
  };
  
  // Handle survey save
  const handleSaveSurvey = async () => {
    if (!validateSurvey()) {
      return;
    }
    
    // Clear any previous validation errors
    setValidationError(null);
    
    // Add updated timestamp
    const updatedSurvey = {
      ...survey,
      updatedAt: new Date().toISOString()
    };
    
    try {
      let result;
      
      if (survey.id) {
        // Update existing
        result = await SurveyService.updateSurvey(survey.id, updatedSurvey);
      } else {
        // Create new
        result = await SurveyService.createSurvey(updatedSurvey);
      }
      
      if (onSave) {
        onSave(result);
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      setValidationError('Failed to save survey. Please try again.');
    }
  };
  
  // Duplicate a question
  const handleDuplicateQuestion = (question, index) => {
    const duplicatedQuestion = {
      ...question,
      id: `q_${Date.now()}`,
      title: `${question.title} (Copy)`
    };
    
    // Insert after the source question
    const updatedQuestions = [...survey.questions];
    updatedQuestions.splice(index + 1, 0, duplicatedQuestion);
    
    setSurvey(prev => ({
      ...prev,
      questions: updatedQuestions
    }));
    
    // Select the new question
    setActiveQuestion(duplicatedQuestion);
    setEditingQuestionIndex(index + 1);
  };
  
  // Change question type
  const handleChangeQuestionType = (e) => {
    const newType = e.target.value;
    
    // Create appropriate options for new type
    let options = [];
    if ([QUESTION_TYPES.RADIO, QUESTION_TYPES.CHECKBOX, QUESTION_TYPES.SELECT].includes(newType)) {
      // If previous type had options, try to keep them
      if (activeQuestion.options && activeQuestion.options.length > 0) {
        options = [...activeQuestion.options];
      } else {
        options = [{ id: `opt_${Date.now()}`, text: 'Option 1' }];
      }
    }
    
    updateActiveQuestion({
      type: newType,
      options
    });
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError(null)}>
          {validationError}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Survey Title"
              value={survey.title}
              onChange={handleSurveyTitleChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Survey Description"
              value={survey.description}
              onChange={handleSurveyDescriptionChange}
              variant="outlined"
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={toggleSettings}
                startIcon={<EditIcon />}
                sx={{ mr: 1 }}
              >
                {showSettings ? 'Hide Settings' : 'Survey Settings'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={togglePreview}
                startIcon={<PreviewIcon />}
              >
                {showPreview ? 'Back to Editor' : 'Preview Survey'}
              </Button>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSurvey}
              startIcon={<SaveIcon />}
            >
              Save Survey
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={toggleSettings} maxWidth="md" fullWidth>
        <DialogTitle>Survey Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={survey.settings.allowAnonymous}
                    onChange={(e) => handleSettingChange('allowAnonymous', e.target.checked)}
                  />
                }
                label="Allow anonymous responses"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={survey.settings.requireAllQuestions}
                    onChange={(e) => handleSettingChange('requireAllQuestions', e.target.checked)}
                  />
                }
                label="Make all questions required"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={survey.settings.showProgressBar}
                    onChange={(e) => handleSettingChange('showProgressBar', e.target.checked)}
                  />
                }
                label="Show progress bar"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={survey.settings.randomizeQuestions}
                    onChange={(e) => handleSettingChange('randomizeQuestions', e.target.checked)}
                  />
                }
                label="Randomize question order"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={survey.settings.showThankYouMessage}
                    onChange={(e) => handleSettingChange('showThankYouMessage', e.target.checked)}
                  />
                }
                label="Show thank you message"
              />
            </Grid>
            {survey.settings.showThankYouMessage && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Thank You Message"
                  value={survey.settings.thankYouMessage}
                  onChange={(e) => handleSettingChange('thankYouMessage', e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleSettings} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Survey Preview Mode */}
      {showPreview ? (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Preview Mode</Typography>
              <Button 
                variant="outlined" 
                startIcon={<CloseIcon />} 
                onClick={togglePreview}
              >
                Exit Preview
              </Button>
            </Box>
            
            <Typography variant="h4" gutterBottom>{survey.title}</Typography>
            {survey.description && (
              <Typography variant="body1" paragraph>{survey.description}</Typography>
            )}
            
            {survey.questions.map((question, index) => (
              <Box key={question.id} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{index + 1}. {question.title}</Typography>
                
                {question.type === QUESTION_TYPES.SELECT && question.options.length > 0 && (
                  <FormControl fullWidth>
                    <Select
                      displayEmpty
                      value=""
                      disabled
                    >
                      <MenuItem value="" disabled>Select an option</MenuItem>
                      {question.options.map((option, idx) => (
                        <MenuItem key={idx} value={option.id}>{option.text}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                
                {question.type === QUESTION_TYPES.TEXT && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Your answer"
                    disabled
                  />
                )}
                
                {question.type === QUESTION_TYPES.RATING && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Chip 
                        key={rating} 
                        label={rating} 
                        variant="outlined"
                        sx={{ width: 40, height: 40 }}
                      />
                    ))}
                  </Stack>
                )}
                
                {question.type === QUESTION_TYPES.RADIO && question.options.length > 0 && (
                  <FormControl fullWidth>
                    <RadioGroup
                      value={question.selectedOptionId || ''}
                      onChange={(e) => updateActiveQuestion({ selectedOptionId: e.target.value })}
                    >
                      {question.options.map((option) => (
                        <FormControlLabel
                          key={option.id}
                          value={option.id}
                          control={<Radio />}
                          label={option.text}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}
                
                {question.type === QUESTION_TYPES.CHECKBOX && question.options.length > 0 && (
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={question.selectedOptionIds.includes(question.options[0].id)}
                          onChange={(e) => {
                            const newSelectedOptionIds = e.target.checked
                              ? [...question.selectedOptionIds, question.options[0].id]
                              : question.selectedOptionIds.filter((id) => id !== question.options[0].id);
                            updateActiveQuestion({ selectedOptionIds: newSelectedOptionIds });
                          }}
                        />
                      }
                      label={question.options[0].text}
                    />
                  </FormControl>
                )}
              </Box>
            ))}
          </Paper>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Question List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Questions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => createNewQuestion()}
                >
                  Add Question
                </Button>
              </Box>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ minHeight: '50vh' }}
                    >
                      {survey.questions.length === 0 ? (
                        <Typography variant="body2" align="center" color="textSecondary" sx={{ mt: 4 }}>
                          No questions yet. Click "Add Question" to get started.
                        </Typography>
                      ) : (
                        survey.questions.map((question, index) => (
                          <Draggable key={question.id} draggableId={question.id} index={index}>
                            {(provided) => (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                elevation={editingQuestionIndex === index ? 3 : 1}
                                sx={{
                                  p: 2,
                                  mb: 2,
                                  borderLeft: theme => 
                                    editingQuestionIndex === index ? 
                                    `4px solid ${theme.palette.primary.main}` : 
                                    'none',
                                  cursor: 'pointer',
                                  background: editingQuestionIndex === index ? 
                                    'rgba(0, 0, 0, 0.02)' : 'inherit'
                                }}
                                onClick={() => handleSelectQuestion(question, index)}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                  <Box {...provided.dragHandleProps} sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                    <EditIcon color="action" />
                                  </Box>
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2" noWrap>
                                      {question.title || 'Untitled Question'}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      {question.type}
                                      {question.required && ' • Required'}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Tooltip title="Duplicate">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicateQuestion(question, index);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveQuestion(index);
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                {question.conditions.length > 0 && (
                                  <Chip 
                                    size="small" 
                                    label={`${question.conditions.length} condition(s)`} 
                                    color="primary" 
                                    variant="outlined" 
                                    sx={{ mt: 1 }}
                                  />
                                )}
                              </Paper>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Add Question Type:
                </Typography>
                <Grid container spacing={1}>
                  {Object.values(QUESTION_TYPES).map((type) => (
                    <Grid item key={type}>
                      <Chip
                        label={type}
                        onClick={() => createNewQuestion(type)}
                        clickable
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Paper>
          </Grid>
          
          {/* Question Editor */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              {activeQuestion ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Edit Question
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="Question Text"
                        value={activeQuestion.title}
                        onChange={handleQuestionTitleChange}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel id="question-type-label">Question Type</InputLabel>
                        <Select
                          labelId="question-type-label"
                          value={activeQuestion.type}
                          onChange={handleChangeQuestionType}
                          label="Question Type"
                        >
                          {Object.entries(QUESTION_TYPES).map(([key, value]) => (
                            <MenuItem key={value} value={value}>
                              {key.charAt(0) + key.slice(1).toLowerCase()}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={activeQuestion.required}
                            onChange={handleRequiredToggle}
                          />
                        }
                        label="Required Question"
                      />
                    </Grid>
                    
                    {/* Options for multiple choice questions */}
                    {[QUESTION_TYPES.RADIO, QUESTION_TYPES.CHECKBOX, QUESTION_TYPES.SELECT].includes(activeQuestion.type) && (
                      <Grid item xs={12}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Options
                          </Typography>
                          
                          {activeQuestion.options.map((option, index) => (
                            <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <TextField
                                fullWidth
                                value={option.text}
                                onChange={(e) => handleOptionTextChange(index, e.target.value)}
                                variant="outlined"
                                size="small"
                                placeholder={`Option ${index + 1}`}
                              />
                              <IconButton onClick={() => handleRemoveOption(index)} disabled={activeQuestion.options.length <= 1}>
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                          
                          <Button
                            startIcon={<AddIcon />}
                            onClick={handleAddOption}
                            sx={{ mt: 1 }}
                          >
                            Add Option
                          </Button>
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Conditional Logic */}
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Conditional Logic
                          <Tooltip title="Conditions determine when this question is shown based on answers to previous questions">
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Typography>
                        
                        {editingQuestionIndex > 0 ? (
                          <Box>
                            {activeQuestion.conditions.map((condition, index) => (
                              <Box key={condition.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <FormControl sx={{ mr: 1, minWidth: 200 }} size="small">
                                  <InputLabel>If Question</InputLabel>
                                  <Select
                                    value={condition.questionId}
                                    onChange={(e) => handleUpdateCondition(index, 'questionId', e.target.value)}
                                    label="If Question"
                                  >
                                    {survey.questions
                                      .filter((q, i) => i < editingQuestionIndex)
                                      .map(q => (
                                        <MenuItem key={q.id} value={q.id}>
                                          {q.title.length > 30 ? `${q.title.substring(0, 30)}...` : q.title}
                                        </MenuItem>
                                      ))
                                    }
                                  </Select>
                                </FormControl>
                                
                                <FormControl sx={{ mr: 1, minWidth: 120 }} size="small">
                                  <InputLabel>Operator</InputLabel>
                                  <Select
                                    value={condition.operator}
                                    onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                                    label="Operator"
                                  >
                                    <MenuItem value="equals">Equals</MenuItem>
                                    <MenuItem value="not_equals">Not Equals</MenuItem>
                                    <MenuItem value="contains">Contains</MenuItem>
                                  </Select>
                                </FormControl>
                                
                                <FormControl sx={{ mr: 1, minWidth: 140 }} size="small">
                                  <InputLabel>Value</InputLabel>
                                  <Select
                                    value={condition.value}
                                    onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                                    label="Value"
                                  >
                                    {survey.questions
                                      .find(q => q.id === condition.questionId)
                                      ?.options.map(opt => (
                                        <MenuItem key={opt.id} value={opt.id}>
                                          {opt.text}
                                        </MenuItem>
                                      ))
                                    }
                                  </Select>
                                </FormControl>
                                
                                <FormControl sx={{ mr: 1, minWidth: 120 }} size="small">
                                  <InputLabel>Action</InputLabel>
                                  <Select
                                    value={condition.action}
                                    onChange={(e) => handleUpdateCondition(index, 'action', e.target.value)}
                                    label="Action"
                                  >
                                    <MenuItem value="show">Show</MenuItem>
                                    <MenuItem value="hide">Hide</MenuItem>
                                  </Select>
                                </FormControl>
                                
                                <IconButton onClick={() => handleRemoveCondition(index)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            ))}
                            
                            <Button
                              startIcon={<AddIcon />}
                              onClick={handleAddCondition}
                              sx={{ mt: 1 }}
                            >
                              Add Condition
                            </Button>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Conditions can only be added to questions that follow other questions.
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                  <Typography variant="body1" color="textSecondary">
                    Select a question to edit or create a new one.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SurveyBuilder; 