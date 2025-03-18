import React, { useMemo } from 'react';
import ActivityBlock from './ActivityBlock';
import './DayCard.css';

/**
 * Component to display a single day's activities in the timeline
 * 
 * @param {Object} day - The day data with activities
 * @param {string} destination - The destination name
 * @returns {JSX.Element} The day card component
 */
const DayCard = ({ day, destination }) => {
  // Group activities by time period (morning, afternoon, evening)
  const timePeriods = useMemo(() => {
    const activities = day.daily_routes || [];
    
    return {
      morning: activities.filter(route => {
        const time = route.time || '';
        return time.includes('AM') && !time.includes('12:');
      }),
      
      afternoon: activities.filter(route => {
        const time = route.time || '';
        return (time.includes('PM') && parseInt(time.split(':')[0]) < 6) || 
               time.includes('12:') && time.includes('PM');
      }),
      
      evening: activities.filter(route => {
        const time = route.time || '';
        return time.includes('PM') && 
               (parseInt(time.split(':')[0]) >= 6 || time.split(':')[0] === '12');
      })
    };
  }, [day.daily_routes]);
  
  // Find activities without specific time
  const unscheduledActivities = useMemo(() => {
    return (day.daily_routes || []).filter(route => !route.time);
  }, [day.daily_routes]);
  
  return (
    <div className="day-card">
      <div className="day-header">
        <h3 className="day-title">
          Day {day.travel_day}: {day.current_date}
        </h3>
        <p className="day-location">{destination}</p>
      </div>
      
      <div className="day-timeline">
        {Object.entries(timePeriods).map(([period, activities]) => (
          <div key={period} className={`time-period ${period}`}>
            <h4 className="period-title">
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </h4>
            
            <div className="activities-container">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <ActivityBlock 
                    key={index} 
                    activity={activity} 
                    isLast={index === activities.length - 1}
                  />
                ))
              ) : (
                <div className="empty-period">
                  <p>No activities scheduled</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {unscheduledActivities.length > 0 && (
          <div className="time-period unscheduled">
            <h4 className="period-title">Additional Activities</h4>
            
            <div className="activities-container">
              {unscheduledActivities.map((activity, index) => (
                <ActivityBlock 
                  key={index} 
                  activity={activity} 
                  isLast={index === unscheduledActivities.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {day.daily_routes && day.daily_routes.length === 0 && (
        <div className="empty-day">
          <p>No activities planned for this day. Perfect for relaxing or spontaneous adventures!</p>
        </div>
      )}
    </div>
  );
};

export default DayCard; 