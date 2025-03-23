import React, { useState } from 'react';
import './ActivityBlock.css';

/**
 * Component to display a single activity in the timeline
 * 
 * @param {Object} activity - The activity data
 * @param {boolean} isLast - Whether this is the last activity in its group
 * @returns {JSX.Element} The activity block component
 */
const ActivityBlock = ({ activity, isLast = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Toggle expanded state
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Format cost to display or show "Free" if cost is 0 or empty
  const formatCost = (cost) => {
    if (!cost) return 'Free';
    if (cost === '0' || cost === '$0') return 'Free';
    return cost;
  };
  
  return (
    <div className={`activity-block ${expanded ? 'expanded' : ''} ${isLast ? 'last-activity' : ''}`}>
      {/* Activity time indicator */}
      <div className="activity-time-container">
        <div className="time-indicator"></div>
        <div className="activity-time">{activity.time || 'Flexible'}</div>
        {!isLast && <div className="time-connector"></div>}
      </div>
      
      {/* Main activity content */}
      <div 
        className="activity-content"
        onClick={toggleExpand}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && toggleExpand()}
      >
        <div className="activity-main-info">
          <h4 className="activity-title">{activity.activity}</h4>
          
          {activity.location && (
            <div className="activity-location">
              <i className="location-icon" aria-hidden="true"></i>
              <span>{activity.location}</span>
            </div>
          )}
          
          <button 
            className="expand-button" 
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            aria-label={expanded ? "Show less details" : "Show more details"}
          >
            <i className={`expand-icon ${expanded ? 'expanded' : ''}`} aria-hidden="true"></i>
          </button>
        </div>
        
        {/* Expanded details */}
        {expanded && (
          <div className="activity-details">
            {activity.duration && (
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{activity.duration}</span>
              </div>
            )}
            
            {activity.transportation && (
              <div className="detail-row">
                <span className="detail-label">Transport:</span>
                <span className="detail-value">{activity.transportation}</span>
              </div>
            )}
            
            {activity.cost && (
              <div className="detail-row">
                <span className="detail-label">Est. Cost:</span>
                <span className="detail-value">{formatCost(activity.cost)}</span>
              </div>
            )}
            
            {activity.notes && (
              <div className="activity-notes">
                <p>{activity.notes}</p>
              </div>
            )}
            
            <div className="activity-actions">
              <button className="action-button map-btn">
                <i className="map-icon" aria-hidden="true"></i>
                View on Map
              </button>
              
              <button className="action-button save-btn">
                <i className="save-icon" aria-hidden="true"></i>
                Save to Favorites
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityBlock; 