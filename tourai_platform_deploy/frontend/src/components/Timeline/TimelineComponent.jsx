import React, { useState, useEffect } from 'react';
import DayCard from './DayCard';
import './TimelineComponent.css';

/**
 * Interactive timeline visualization for travel itineraries
 * 
 * @param {Object} route - The route data with destination information
 * @param {Object} timeline - The timeline data with daily activities
 * @param {Object} timelineData - Alternative format for backward compatibility (deprecated)
 * @returns {JSX.Element} The timeline component
 */
const TimelineComponent = ({ route, timeline, timelineData }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processedTimeline, setProcessedTimeline] = useState(null);
  const [processedRoute, setProcessedRoute] = useState(null);
  
  useEffect(() => {
    // Process props for backward compatibility
    let destination = 'Unknown Destination';
    let routeName = 'Travel Plan';
    let days = [];
    
    // Handle both new format (timeline) and old format (timelineData)
    if (timeline && timeline.days && timeline.days.length > 0) {
      days = timeline.days;
      setIsLoading(false);
    } else if (timelineData && timelineData.travel_split_by_day && timelineData.travel_split_by_day.length > 0) {
      // Convert old format to new format
      days = timelineData.travel_split_by_day.map(day => ({
        ...day,
        daily_routes: day.dairy_routes
      }));
      setIsLoading(false);
    }
    
    // Process route info
    if (route) {
      destination = route.destination;
      routeName = route.route_name;
    }
    
    setProcessedTimeline({ days });
    setProcessedRoute({ destination, route_name: routeName });
  }, [timeline, timelineData, route]);
  
  // Handle day selection
  const handleDayChange = (index) => {
    setActiveDay(index);
  };
  
  if (isLoading || !processedTimeline || !processedTimeline.days) {
    return <TimelineSkeleton />;
  }
  
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2 className="timeline-title">
          Your Itinerary for {processedRoute.destination}
        </h2>
        <p className="timeline-subtitle">
          {processedTimeline.days.length} day{processedTimeline.days.length !== 1 ? 's' : ''} • {processedRoute.route_name}
        </p>
      </div>
      
      <div className="timeline-days-nav">
        {processedTimeline.days.map((day, index) => (
          <button 
            key={index}
            className={`day-nav-btn ${activeDay === index ? 'active' : ''}`}
            onClick={() => handleDayChange(index)}
            aria-label={`Day ${day.travel_day} - ${day.current_date}`}
            aria-pressed={activeDay === index}
          >
            <span className="day-number">Day {day.travel_day}</span>
            <span className="day-date">{day.current_date}</span>
          </button>
        ))}
      </div>
      
      <div className="timeline-content">
        {processedTimeline.days[activeDay] && (
          <DayCard 
            day={processedTimeline.days[activeDay]} 
            destination={processedRoute.destination}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Skeleton loader for the timeline when data is loading
 */
const TimelineSkeleton = () => {
  return (
    <div className="timeline-container skeleton">
      <div className="timeline-header">
        <div className="skeleton-line title-skeleton"></div>
        <div className="skeleton-line subtitle-skeleton"></div>
      </div>
      
      <div className="timeline-days-nav">
        {[1, 2, 3].map((day) => (
          <div key={day} className="day-nav-skeleton"></div>
        ))}
      </div>
      
      <div className="timeline-content">
        <div className="day-card-skeleton">
          <div className="day-header-skeleton"></div>
          
          <div className="activities-skeleton">
            {[1, 2, 3].map((activity) => (
              <div key={activity} className="activity-skeleton"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineComponent; 