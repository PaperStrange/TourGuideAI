import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  FormGroup,
  FormHelperText,
  RadioGroup,
  Radio,
  Checkbox,
  Slider,
  Rating,
  Button,
  Chip,
  Stack,
  Paper
} from '@mui/material';

/**
 * Survey Question Component
 * Renders different types of questions based on the question type
 */
const SurveyQuestion = ({ 
  question, 
  value, 
  onChange, 
  onSubmit,
  required = false,
  error = null,
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [localError, setLocalError] = useState(error);
  
  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);
  
  // Update local error when prop changes
  useEffect(() => {
    setLocalError(error);
  }, [error]);
  
  /**
   * Handle change for all question types
   */
  const handleChange = (newValue) => {
    setLocalValue(newValue);
    setLocalError(null);
    
    if (onChange) {
      onChange(newValue);
    }
  };
  
  /**
   * Validate the current answer
   */
  const validateAnswer = () => {
    if (required && (localValue === '' || localValue === null || 
        (Array.isArray(localValue) && localValue.length === 0))) {
      setLocalError('This question requires an answer');
      return false;
    }
    
    return true;
  };
  
  /**
   * Handle submission of this question
   */
  const handleSubmit = () => {
    const isValid = validateAnswer();
    
    if (isValid && onSubmit) {
      onSubmit(localValue);
    }
  };
  
  /**
   * Render the appropriate input based on question type
   */
  const renderQuestionInput = () => {
    const { type, options, min, max, step, placeholder } = question;
    
    switch (type) {
      case 'text':
        return (
          <TextField
            fullWidth
            multiline={question.multiline}
            rows={question.multiline ? 4 : 1}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder || 'Enter your answer...'}
            variant="outlined"
            error={!!localError}
            helperText={localError}
            sx={{ mt: 2 }}
          />
        );
        
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            inputProps={{ 
              min: min !== undefined ? min : null,
              max: max !== undefined ? max : null,
              step: step || 1
            }}
            value={localValue}
            onChange={(e) => handleChange(Number(e.target.value))}
            placeholder={placeholder || 'Enter a number...'}
            variant="outlined"
            error={!!localError}
            helperText={localError}
            sx={{ mt: 2 }}
          />
        );
        
      case 'single_choice':
        return (
          <FormControl component="fieldset" error={!!localError} sx={{ mt: 2, width: '100%' }}>
            <RadioGroup
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
            >
              {options && options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {localError && <FormHelperText>{localError}</FormHelperText>}
          </FormControl>
        );
        
      case 'multiple_choice':
        return (
          <FormControl component="fieldset" error={!!localError} sx={{ mt: 2, width: '100%' }}>
            <FormGroup>
              {options && options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={Array.isArray(localValue) && localValue.includes(option.value)}
                      onChange={(e) => {
                        const currentValues = Array.isArray(localValue) ? [...localValue] : [];
                        if (e.target.checked) {
                          handleChange([...currentValues, option.value]);
                        } else {
                          handleChange(currentValues.filter(val => val !== option.value));
                        }
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
            {localError && <FormHelperText>{localError}</FormHelperText>}
          </FormControl>
        );
        
      case 'rating':
        return (
          <Box sx={{ mt: 3, mb: 2 }}>
            <Rating
              name={`question-${question.id}`}
              value={Number(localValue) || 0}
              onChange={(e, newValue) => handleChange(newValue)}
              precision={0.5}
              size="large"
            />
            {localError && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                {localError}
              </Typography>
            )}
          </Box>
        );
        
      case 'slider':
        return (
          <Box sx={{ mt: 3, mb: 2, px: 1 }}>
            <Slider
              value={Number(localValue) || min || 0}
              onChange={(e, newValue) => handleChange(newValue)}
              min={min || 0}
              max={max || 100}
              step={step || 1}
              valueLabelDisplay="auto"
              marks={question.marks || [
                { value: min || 0, label: String(min || 0) },
                { value: max || 100, label: String(max || 100) }
              ]}
            />
            {localError && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                {localError}
              </Typography>
            )}
          </Box>
        );
        
      case 'boolean':
        return (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button 
              variant={localValue === true ? "contained" : "outlined"} 
              onClick={() => handleChange(true)}
              color="primary"
              fullWidth
            >
              {question.yesLabel || "Yes"}
            </Button>
            <Button 
              variant={localValue === false ? "contained" : "outlined"} 
              onClick={() => handleChange(false)}
              color="primary"
              fullWidth
            >
              {question.noLabel || "No"}
            </Button>
            {localError && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                {localError}
              </Typography>
            )}
          </Stack>
        );
        
      case 'tags':
        const tags = Array.isArray(localValue) ? localValue : [];
        const [inputValue, setInputValue] = useState('');
        
        return (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add a tag..."
                variant="outlined"
                size="small"
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    e.preventDefault();
                    if (!tags.includes(inputValue.trim())) {
                      handleChange([...tags, inputValue.trim()]);
                    }
                    setInputValue('');
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  if (inputValue.trim() && !tags.includes(inputValue.trim())) {
                    handleChange([...tags, inputValue.trim()]);
                    setInputValue('');
                  }
                }}
              >
                Add
              </Button>
            </Stack>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleChange(tags.filter((_, i) => i !== index))}
                />
              ))}
            </Box>
            
            {localError && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                {localError}
              </Typography>
            )}
          </Box>
        );
        
      default:
        return (
          <Typography color="error">
            Unknown question type: {type}
          </Typography>
        );
    }
  };
  
  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {question.text}
        {required && <Typography component="span" color="error">*</Typography>}
      </Typography>
      
      {question.description && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {question.description}
        </Typography>
      )}
      
      {renderQuestionInput()}
      
      {onSubmit && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={required && !localValue && localValue !== false}
          >
            Next
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default SurveyQuestion; 