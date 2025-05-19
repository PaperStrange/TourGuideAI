import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  LinearProgress,
  useTheme
} from '@mui/material';
import SurveyQuestion from './SurveyQuestion';
import surveyService from '../../services/SurveyService';

/**
 * Survey Component
 * Displays a survey with conditional logic support
 */
const Survey = ({ 
  survey,
  onComplete,
  onError
}) => {
  const theme = useTheme();
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Initialize visible questions based on conditional logic
  useEffect(() => {
    if (survey && survey.questions && survey.questions.length > 0) {
      // Determine which questions should be visible initially
      updateVisibleQuestions();
    }
  }, [survey]);

  /**
   * Update the list of visible questions based on current responses
   */
  const updateVisibleQuestions = () => {
    if (!survey || !survey.questions) return;

    const newVisibleQuestions = survey.questions.filter(question => 
      surveyService.evaluateConditionalLogic(question, responses)
    );
    
    setVisibleQuestions(newVisibleQuestions);
    
    // Update progress
    if (newVisibleQuestions.length > 0) {
      const answeredCount = newVisibleQuestions.filter(q => 
        responses[q.id] !== undefined && responses[q.id] !== null
      ).length;
      
      setProgress(Math.floor((answeredCount / newVisibleQuestions.length) * 100));
    }
  };

  /**
   * Handle response to a question
   */
  const handleQuestionResponse = (questionId, value) => {
    // Update responses
    const newResponses = {
      ...responses,
      [questionId]: value
    };
    
    setResponses(newResponses);
    
    // Re-evaluate which questions should be visible
    updateVisibleQuestions();
    
    // Advance to the next question if in sequence mode
    if (survey.sequentialDisplay) {
      const currentIndex = visibleQuestions.findIndex(q => q.id === questionId);
      if (currentIndex < visibleQuestions.length - 1) {
        setActiveQuestion(currentIndex + 1);
      }
    }
  };

  /**
   * Handle the submission of the entire survey
   */
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if all required questions have been answered
      const requiredQuestions = visibleQuestions.filter(q => q.required);
      const unansweredRequired = requiredQuestions.filter(q => 
        responses[q.id] === undefined || responses[q.id] === null || 
        (Array.isArray(responses[q.id]) && responses[q.id].length === 0)
      );
      
      if (unansweredRequired.length > 0) {
        setError(`Please answer all required questions (${unansweredRequired.length} remaining)`);
        
        // Focus on the first unanswered question
        const firstUnansweredIndex = visibleQuestions.findIndex(q => 
          q.id === unansweredRequired[0].id
        );
        
        if (firstUnansweredIndex !== -1) {
          setActiveQuestion(firstUnansweredIndex);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Prepare response data
      const responseData = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value
      }));
      
      // Submit the responses
      const result = await surveyService.submitSurveyResponses(survey.id, responseData);
      
      // Handle success
      setSuccess(true);
      setIsLoading(false);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Failed to submit survey');
      
      if (onError) {
        onError(err);
      }
    }
  };

  // Render loading state
  if (!survey || !survey.questions) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Render success message
  if (success) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Typography variant="h5" gutterBottom>
              Thank you for completing the survey!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your feedback is valuable and will help us improve the product.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Survey Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            {survey.title}
          </Typography>
          
          {survey.description && (
            <Typography variant="body1" color="text.secondary">
              {survey.description}
            </Typography>
          )}
          
          <Box mt={2} mb={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">
                  {`${progress}%`}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
        
        {/* Survey Questions */}
        {survey.sequentialDisplay ? (
          // Sequential display mode - show one question at a time
          visibleQuestions.length > 0 ? (
            <Box>
              <Stepper 
                activeStep={activeQuestion} 
                alternativeLabel
                sx={{ mb: 4 }}
              >
                {visibleQuestions.map((q, index) => (
                  <Step key={q.id} completed={responses[q.id] !== undefined}>
                    <StepLabel>{`Question ${index + 1}`}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              {activeQuestion < visibleQuestions.length && (
                <SurveyQuestion
                  question={visibleQuestions[activeQuestion]}
                  value={responses[visibleQuestions[activeQuestion].id]}
                  onChange={(value) => handleQuestionResponse(visibleQuestions[activeQuestion].id, value)}
                  required={visibleQuestions[activeQuestion].required}
                  onSubmit={
                    activeQuestion < visibleQuestions.length - 1
                      ? () => setActiveQuestion(activeQuestion + 1)
                      : null
                  }
                />
              )}
              
              <Box display="flex" justifyContent="space-between" mt={3}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}
                  disabled={activeQuestion === 0 || isLoading}
                >
                  Previous
                </Button>
                
                {activeQuestion === visibleQuestions.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={24} /> : 'Submit'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setActiveQuestion(Math.min(visibleQuestions.length - 1, activeQuestion + 1))}
                    disabled={
                      visibleQuestions[activeQuestion]?.required && 
                      !responses[visibleQuestions[activeQuestion]?.id] &&
                      responses[visibleQuestions[activeQuestion]?.id] !== false
                    }
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Typography>No questions to display</Typography>
          )
        ) : (
          // All questions at once mode
          <Box>
            {visibleQuestions.map((question) => (
              <SurveyQuestion
                key={question.id}
                question={question}
                value={responses[question.id]}
                onChange={(value) => handleQuestionResponse(question.id, value)}
                required={question.required}
              />
            ))}
            
            <Box display="flex" justifyContent="flex-end" mt={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? <CircularProgress size={24} /> : 'Submit Survey'}
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default Survey; 