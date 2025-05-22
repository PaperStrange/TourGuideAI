import React, { useState, useContext } from 'react';
import { RouteGenerator } from './RouteGenerator';
import { RoutePreview } from './RoutePreview';
import { ItineraryBuilder } from './ItineraryBuilder';
import { routeManagementService } from '../services';
import { AuthContext } from '../../../contexts/AuthContext';
import { NotificationContext } from '../../../contexts/NotificationContext';

/**
 * Top-level component that orchestrates the travel planning workflow
 * Manages state transitions between generating, previewing, and editing routes
 * 
 * @returns {JSX.Element}
 */
export const TravelPlanningWorkflow = () => {
  // Workflow states
  const [currentStep, setCurrentStep] = useState('generate'); // generate, preview, edit
  const [currentRoute, setCurrentRoute] = useState(null);
  const [savedRouteId, setSavedRouteId] = useState(null);
  
  // Context for user authentication and notifications
  const { user, isAuthenticated } = useContext(AuthContext);
  const { showNotification } = useContext(NotificationContext);
  
  // Whether the user needs to sign in to proceed
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  /**
   * Handle when a route is generated
   * @param {Object} route - The generated route
   */
  const handleRouteGenerated = (route) => {
    setCurrentRoute(route);
    setCurrentStep('preview');
  };
  
  /**
   * Handle saving a route
   * @param {Object} route - The route to save
   */
  const handleSaveRoute = async (route) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    
    try {
      const savedRoute = await routeManagementService.saveRoute(route, user.id);
      setSavedRouteId(savedRoute.id);
      showNotification({
        message: 'Route saved successfully!',
        type: 'success'
      });
    } catch (error) {
      showNotification({
        message: `Error saving route: ${error.message}`,
        type: 'error'
      });
    }
  };
  
  /**
   * Handle editing an itinerary
   * @param {string} routeId - The ID of the route to edit
   */
  const handleEditItinerary = (routeId) => {
    setSavedRouteId(routeId);
    setCurrentStep('edit');
  };
  
  /**
   * Return to the route preview from the itinerary editor
   */
  const handleBackToPreview = async () => {
    try {
      const updatedRoute = await routeManagementService.getRouteById(savedRouteId);
      setCurrentRoute(updatedRoute);
      setCurrentStep('preview');
    } catch (error) {
      showNotification({
        message: `Error retrieving updated route: ${error.message}`,
        type: 'error'
      });
    }
  };
  
  /**
   * Start over with a new route
   */
  const handleStartOver = () => {
    setCurrentRoute(null);
    setSavedRouteId(null);
    setCurrentStep('generate');
  };
  
  return (
    <div className="travel-planning-workflow">
      {/* Route Generation Step */}
      {currentStep === 'generate' && (
        <RouteGenerator onRouteGenerated={handleRouteGenerated} />
      )}
      
      {/* Route Preview Step */}
      {currentStep === 'preview' && currentRoute && (
        <div className="preview-container">
          <div className="preview-actions">
            <button onClick={handleStartOver}>← Generate New Route</button>
          </div>
          <RoutePreview 
            route={currentRoute}
            onSaveRoute={handleSaveRoute}
            onEditItinerary={handleEditItinerary}
          />
        </div>
      )}
      
      {/* Itinerary Builder Step */}
      {currentStep === 'edit' && savedRouteId && (
        <div className="builder-container">
          <div className="builder-actions">
            <button onClick={handleBackToPreview}>← Back to Preview</button>
          </div>
          <h2>Edit Your Itinerary</h2>
          <ItineraryBuilder routeId={savedRouteId} />
        </div>
      )}
      
      {/* Authentication Prompt */}
      {showAuthPrompt && (
        <div className="auth-prompt">
          <h3>Please sign in to save routes</h3>
          <p>You need to be signed in to save routes and edit itineraries.</p>
          <div className="auth-actions">
            <button 
              className="primary-button"
              onClick={() => {
                // Navigate to sign in page or open sign in modal
                // This would be replaced with actual authentication flow
                window.location.href = '/signin';
              }}
            >
              Sign In
            </button>
            <button 
              className="secondary-button"
              onClick={() => setShowAuthPrompt(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 