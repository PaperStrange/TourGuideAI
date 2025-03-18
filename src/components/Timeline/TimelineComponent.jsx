import React, { useState, useEffect } from 'react';
import DayCard from './DayCard';
import './TimelineComponent.css';

/**
 * Interactive timeline visualization for travel itineraries
 * 
 * @param {Object} route - The route data with destination information
 * @param {Object} timeline - The timeline data with daily activities
 * @returns {JSX.Element} The timeline component
 */
const TimelineComponent = ({ route, timeline }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if timeline data is available
    if (timeline && timeline.days && timeline.days.length > 0) {
      setIsLoading(false);
    }
  }, [timeline]);
  
  // Handle day selection
  const handleDayChange = (index) => {
    setActiveDay(index);
  };
  
  if (isLoading) {
    return <TimelineSkeleton />;
  }
  
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2 className="timeline-title">
          Your Itinerary for {route.destination}
        </h2>
        <p className="timeline-subtitle">
          {timeline.days.length} day{timeline.days.length !== 1 ? 's' : ''} • {route.route_name}
        </p>
      </div>
      
      <div className="timeline-days-nav">
        {timeline.days.map((day, index) => (
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
        {timeline.days[activeDay] && (
          <DayCard 
            day={timeline.days[activeDay]} 
            destination={route.destination}
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