import React, { useState, useEffect } from 'react';
import { routeManagementService } from '../services';

/**
 * Component to preview a generated travel route
 * Shows route details with expandable sections for different aspects of the trip
 * 
 * @param {Object} route - The route to preview
 * @param {Function} onSaveRoute - Function to call when saving the route
 * @param {Function} onEditItinerary - Function to call when editing the itinerary
 * @return {JSX.Element}
 */
export const RoutePreview = ({ route, onSaveRoute, onEditItinerary }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [isFavorite, setIsFavorite] = useState(false);
  
  useEffect(() => {
    if (!route) return;
    
    // Check if this route is in favorites
    const favoriteRoutes = routeManagementService.getFavoriteRoutes();
    const isInFavorites = favoriteRoutes.some(favRoute => favRoute.id === route.id);
    setIsFavorite(isInFavorites);
  }, [route]);
  
  if (!route) {
    return <div className="route-preview-empty">No route to preview</div>;
  }
  
  // Toggle expanded state for a section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle favorite status
  const toggleFavorite = () => {
    if (isFavorite) {
      routeManagementService.removeFromFavorites(route.id);
    } else {
      routeManagementService.addToFavorites(route.id);
    }
    setIsFavorite(!isFavorite);
  };
  
  // Handle save route
  const handleSave = () => {
    if (onSaveRoute) {
      onSaveRoute(route);
    }
  };
  
  // Handle edit itinerary
  const handleEdit = () => {
    if (onEditItinerary) {
      onEditItinerary(route.id);
    }
  };
  
  return (
    <div className="route-preview">
      <div className="route-preview-header">
        <h2>{route.route_name}</h2>
        <div className="route-meta">
          <div className="route-destination">Destination: {route.destination}</div>
          <div className="route-duration">Duration: {route.duration} days</div>
          {route.start_date && route.end_date && (
            <div className="route-dates">
              {route.start_date} to {route.end_date}
            </div>
          )}
        </div>
        <p className="route-overview">{route.overview}</p>
        
        <div className="route-actions">
          <button 
            className="favorite-button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
          </button>
          <button 
            className="save-button"
            onClick={handleSave}
          >
            Save Route
          </button>
          <button 
            className="edit-button"
            onClick={handleEdit}
          >
            Edit Itinerary
          </button>
        </div>
      </div>
      
      {/* Highlights Section */}
      <div className="route-section">
        <h3 
          className="section-header"
          onClick={() => toggleSection('highlights')}
        >
          Highlights
        </h3>
        {expandedSections.highlights && route.highlights && (
          <div className="section-content">
            <ul className="highlights-list">
              {route.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Daily Itinerary Section */}
      <div className="route-section">
        <h3 
          className="section-header"
          onClick={() => toggleSection('itinerary')}
        >
          Daily Itinerary
        </h3>
        {expandedSections.itinerary && route.daily_itinerary && (
          <div className="section-content">
            {route.daily_itinerary.map((day, dayIndex) => (
              <div key={dayIndex} className="itinerary-day">
                <h4>{day.day_title}</h4>
                <p>{day.description}</p>
                <div className="day-activities">
                  {day.activities.map((activity, actIndex) => (
                    <div key={actIndex} className="activity-item">
                      <div className="activity-time">{activity.time}</div>
                      <div className="activity-details">
                        <div className="activity-name">{activity.name}</div>
                        <div className="activity-description">{activity.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Estimated Costs Section */}
      {route.estimated_costs && (
        <div className="route-section">
          <h3 
            className="section-header"
            onClick={() => toggleSection('costs')}
          >
            Estimated Costs
          </h3>
          {expandedSections.costs && (
            <div className="section-content">
              <div className="costs-table">
                {Object.entries(route.estimated_costs).map(([category, cost], index) => (
                  <div key={index} className="cost-row">
                    <div className="cost-category">{category}:</div>
                    <div className="cost-amount">{cost}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Accommodation Section */}
      {route.accommodation_suggestions && (
        <div className="route-section">
          <h3 
            className="section-header"
            onClick={() => toggleSection('accommodation')}
          >
            Accommodation Suggestions
          </h3>
          {expandedSections.accommodation && (
            <div className="section-content">
              <div className="accommodation-list">
                {route.accommodation_suggestions.map((accommodation, index) => (
                  <div key={index} className="accommodation-item">
                    <h4>{accommodation.name}</h4>
                    <p>{accommodation.description}</p>
                    <div className="price-range">{accommodation.price_range}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Transportation Section */}
      {route.recommended_transportation && (
        <div className="route-section">
          <h3 
            className="section-header"
            onClick={() => toggleSection('transportation')}
          >
            Recommended Transportation
          </h3>
          {expandedSections.transportation && (
            <div className="section-content">
              <p>{route.recommended_transportation}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Travel Tips Section */}
      {route.travel_tips && (
        <div className="route-section">
          <h3 
            className="section-header"
            onClick={() => toggleSection('tips')}
          >
            Travel Tips
          </h3>
          {expandedSections.tips && (
            <div className="section-content">
              <ul className="tips-list">
                {route.travel_tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 