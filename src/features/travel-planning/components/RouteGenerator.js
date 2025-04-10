import React, { useState } from 'react';
import { routeGenerationService } from '../services';

/**
 * Component for generating travel routes from user queries
 * Allows users to input travel queries and generate personalized routes
 * 
 * @param {Function} onRouteGenerated - Callback called with the generated route
 * @returns {JSX.Element}
 */
export const RouteGenerator = ({ onRouteGenerated }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intent, setIntent] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  /**
   * Analyze the user's travel query to extract intent
   */
  const analyzeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a travel query');
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const intentData = await routeGenerationService.analyzeUserQuery(query);
      setIntent(intentData);
    } catch (err) {
      setError(`Error analyzing query: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };
  
  /**
   * Generate a route based on the user's query
   */
  const generateRoute = async () => {
    if (!query.trim()) {
      setError('Please enter a travel query');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const generatedRoute = await routeGenerationService.generateRouteFromQuery(query);
      if (onRouteGenerated) {
        onRouteGenerated(generatedRoute);
      }
    } catch (err) {
      setError(`Error generating route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Generate a random surprise route
   */
  const generateSurpriseRoute = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const surpriseRoute = await routeGenerationService.generateRandomRoute();
      if (onRouteGenerated) {
        onRouteGenerated(surpriseRoute);
      }
    } catch (err) {
      setError(`Error generating surprise route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="route-generator">
      <h2>Generate Your Travel Route</h2>
      
      <div className="query-input-container">
        <textarea
          className="query-input"
          placeholder="Describe your travel plans (e.g., 'I want to visit Tokyo for 5 days in April with my family')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          disabled={loading || analyzing}
        />
        
        <div className="generator-actions">
          <button 
            className="analyze-button"
            onClick={analyzeQuery}
            disabled={loading || analyzing || !query.trim()}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Query'}
          </button>
          
          <button 
            className="generate-button"
            onClick={generateRoute}
            disabled={loading || analyzing}
          >
            Generate Route
          </button>
          
          <button 
            className="surprise-button"
            onClick={generateSurpriseRoute}
            disabled={loading || analyzing}
          >
            Surprise Me!
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Generating your travel plan...</p>
          <p className="loading-subtext">This might take a moment as we craft the perfect itinerary for you.</p>
        </div>
      )}
      
      {/* Intent Analysis Results */}
      {intent && !loading && !error && (
        <div className="intent-analysis">
          <h3>Travel Intent Analysis</h3>
          <div className="intent-details">
            {intent.arrival && (
              <div className="intent-item">
                <span className="intent-label">Destination:</span>
                <span className="intent-value">{intent.arrival}</span>
              </div>
            )}
            
            {intent.travel_duration && (
              <div className="intent-item">
                <span className="intent-label">Duration:</span>
                <span className="intent-value">{intent.travel_duration}</span>
              </div>
            )}
            
            {intent.arrival_date && (
              <div className="intent-item">
                <span className="intent-label">Arrival:</span>
                <span className="intent-value">{intent.arrival_date}</span>
              </div>
            )}
            
            {intent.departure_date && (
              <div className="intent-item">
                <span className="intent-label">Departure:</span>
                <span className="intent-value">{intent.departure_date}</span>
              </div>
            )}
            
            {intent.entertainment_prefer && (
              <div className="intent-item">
                <span className="intent-label">Interests:</span>
                <span className="intent-value">{intent.entertainment_prefer}</span>
              </div>
            )}
            
            {intent.total_cost_prefer && (
              <div className="intent-item">
                <span className="intent-label">Budget:</span>
                <span className="intent-value">{intent.total_cost_prefer}</span>
              </div>
            )}
            
            {intent.user_personal_need && (
              <div className="intent-item">
                <span className="intent-label">Special Needs:</span>
                <span className="intent-value">{intent.user_personal_need}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 