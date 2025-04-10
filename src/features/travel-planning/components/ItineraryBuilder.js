import React, { useState, useEffect } from 'react';
import { routeManagementService } from '../services';

/**
 * Component for editing and customizing travel itineraries
 * 
 * @param {string} routeId - ID of the route to edit
 * @returns {JSX.Element}
 */
export const ItineraryBuilder = ({ routeId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [reorderMode, setReorderMode] = useState(false);
  const [editingCosts, setEditingCosts] = useState(false);
  
  // Form state for adding new activities or days
  const [newActivity, setNewActivity] = useState({ name: '', description: '', time: '' });
  const [newDay, setNewDay] = useState({ day_title: '', description: '' });
  const [addingActivityToDayIndex, setAddingActivityToDayIndex] = useState(null);
  const [addingNewDay, setAddingNewDay] = useState(false);
  
  // Load route data on component mount
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const routeData = await routeManagementService.getRouteById(routeId);
        setRoute(routeData);
      } catch (err) {
        setError(`Error loading route: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoute();
  }, [routeId]);
  
  if (loading) {
    return <div className="loading-state">Loading itinerary...</div>;
  }
  
  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }
  
  if (!route) {
    return <div className="empty-state">Route not found</div>;
  }
  
  // Toggle edit mode for specific fields
  const toggleEditMode = (field) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // Reset any active form when toggling edit mode off
    if (editMode[field]) {
      setAddingActivityToDayIndex(null);
      setAddingNewDay(false);
    }
  };
  
  // Handle updating basic route information
  const handleUpdateRouteInfo = async (field, value) => {
    try {
      const updatedRoute = {
        ...route,
        [field]: value
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
      toggleEditMode(field);
    } catch (err) {
      setError(`Error updating itinerary: ${err.message}`);
    }
  };
  
  // Handle updating an activity
  const handleUpdateActivity = async (dayIndex, activityIndex, updatedActivity) => {
    try {
      const updatedItinerary = [...route.daily_itinerary];
      updatedItinerary[dayIndex].activities[activityIndex] = {
        ...updatedItinerary[dayIndex].activities[activityIndex],
        ...updatedActivity
      };
      
      const updatedRoute = {
        ...route,
        daily_itinerary: updatedItinerary
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
      toggleEditMode(`activity_${dayIndex}_${activityIndex}`);
    } catch (err) {
      setError(`Error updating activity: ${err.message}`);
    }
  };
  
  // Handle adding a new activity to a day
  const handleAddActivity = async (dayIndex) => {
    try {
      if (!newActivity.name.trim()) {
        return; // Require at least a name
      }
      
      const updatedItinerary = [...route.daily_itinerary];
      updatedItinerary[dayIndex].activities.push({
        id: `act${Date.now()}`, // Generate a temporary ID
        ...newActivity
      });
      
      const updatedRoute = {
        ...route,
        daily_itinerary: updatedItinerary
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
      setNewActivity({ name: '', description: '', time: '' });
      setAddingActivityToDayIndex(null);
    } catch (err) {
      setError(`Error adding activity: ${err.message}`);
    }
  };
  
  // Handle removing an activity
  const handleRemoveActivity = async (dayIndex, activityIndex) => {
    try {
      const updatedItinerary = [...route.daily_itinerary];
      updatedItinerary[dayIndex].activities.splice(activityIndex, 1);
      
      const updatedRoute = {
        ...route,
        daily_itinerary: updatedItinerary
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
    } catch (err) {
      setError(`Error removing activity: ${err.message}`);
    }
  };
  
  // Handle adding a new day to the itinerary
  const handleAddDay = async () => {
    try {
      if (!newDay.day_title.trim()) {
        return; // Require at least a title
      }
      
      const updatedItinerary = [...route.daily_itinerary];
      updatedItinerary.push({
        day_title: newDay.day_title,
        description: newDay.description,
        day_number: updatedItinerary.length + 1,
        activities: []
      });
      
      const updatedRoute = {
        ...route,
        daily_itinerary: updatedItinerary
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
      setNewDay({ day_title: '', description: '' });
      setAddingNewDay(false);
    } catch (err) {
      setError(`Error adding day: ${err.message}`);
    }
  };
  
  // Handle updating costs
  const handleUpdateCosts = async (updatedCosts) => {
    try {
      // Calculate the total
      let total = 0;
      Object.entries(updatedCosts).forEach(([key, value]) => {
        if (key !== 'Total') {
          // Extract numeric value from string (e.g., '$450' -> 450)
          const amount = parseInt(value.replace(/[^0-9]/g, ''));
          if (!isNaN(amount)) {
            total += amount;
          }
        }
      });
      
      // Add the total to the costs
      updatedCosts.Total = `$${total}`;
      
      const updatedRoute = {
        ...route,
        estimated_costs: updatedCosts
      };
      
      await routeManagementService.updateRoute(routeId, updatedRoute);
      setRoute(updatedRoute);
      setEditingCosts(false);
    } catch (err) {
      setError(`Error updating costs: ${err.message}`);
    }
  };
  
  return (
    <div className="itinerary-builder" data-testid="itinerary-builder">
      <div className="itinerary-header">
        {/* Route Title */}
        {editMode.title ? (
          <div className="edit-title-form">
            <input
              type="text"
              value={route.route_name}
              onChange={(e) => setRoute({...route, route_name: e.target.value})}
              aria-label="Route title"
            />
            <button onClick={() => handleUpdateRouteInfo('route_name', route.route_name)}>
              Save
            </button>
            <button onClick={() => toggleEditMode('title')}>Cancel</button>
          </div>
        ) : (
          <div className="title-display">
            <h2>{route.route_name}</h2>
            <button 
              onClick={() => toggleEditMode('title')} 
              aria-label="edit title"
            >
              Edit
            </button>
          </div>
        )}
        
        {/* Route Meta Information */}
        <div className="route-meta">
          <div className="destination">
            <strong>Destination:</strong> {route.destination}
          </div>
          <div className="duration">
            <strong>Duration:</strong> {route.duration} days
          </div>
          {route.start_date && route.end_date && (
            <div className="dates">
              {route.start_date} to {route.end_date}
            </div>
          )}
        </div>
        
        {/* Route Overview */}
        {editMode.overview ? (
          <div className="edit-overview-form">
            <textarea
              value={route.overview}
              onChange={(e) => setRoute({...route, overview: e.target.value})}
              rows={3}
              aria-label="Route overview"
            />
            <button onClick={() => handleUpdateRouteInfo('overview', route.overview)}>
              Save
            </button>
            <button onClick={() => toggleEditMode('overview')}>Cancel</button>
          </div>
        ) : (
          <div className="overview-display">
            <p>{route.overview}</p>
            <button 
              onClick={() => toggleEditMode('overview')}
              aria-label="edit overview"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      
      <div className="itinerary-tools">
        <button 
          className={reorderMode ? 'active' : ''}
          onClick={() => setReorderMode(!reorderMode)}
        >
          {reorderMode ? 'Done Reordering' : 'Reorder Activities'}
        </button>
        
        <button 
          onClick={() => setAddingNewDay(true)}
        >
          Add Day
        </button>
        
        <button
          onClick={() => setEditingCosts(true)}
        >
          Edit Costs
        </button>
      </div>
      
      {/* Reorder Mode Instructions */}
      {reorderMode && (
        <div className="reorder-instructions">
          <p>Drag to reorder activities within each day</p>
        </div>
      )}
      
      {/* Daily Itinerary Editor */}
      <div className="daily-itinerary">
        {route.daily_itinerary.map((day, dayIndex) => (
          <div key={dayIndex} className="day-card">
            <div className="day-header">
              {editMode[`day_${dayIndex}`] ? (
                <div className="edit-day-form">
                  <input
                    type="text"
                    value={day.day_title}
                    onChange={(e) => {
                      const updatedItinerary = [...route.daily_itinerary];
                      updatedItinerary[dayIndex].day_title = e.target.value;
                      setRoute({...route, daily_itinerary: updatedItinerary});
                    }}
                    aria-label="Day title"
                  />
                  <textarea
                    value={day.description}
                    onChange={(e) => {
                      const updatedItinerary = [...route.daily_itinerary];
                      updatedItinerary[dayIndex].description = e.target.value;
                      setRoute({...route, daily_itinerary: updatedItinerary});
                    }}
                    rows={2}
                    aria-label="Day description"
                  />
                  <button onClick={() => {
                    const updatedDay = {
                      ...day,
                      day_title: day.day_title,
                      description: day.description
                    };
                    const updatedItinerary = [...route.daily_itinerary];
                    updatedItinerary[dayIndex] = updatedDay;
                    handleUpdateRouteInfo('daily_itinerary', updatedItinerary);
                  }}>
                    Save
                  </button>
                  <button onClick={() => toggleEditMode(`day_${dayIndex}`)}>Cancel</button>
                </div>
              ) : (
                <div className="day-header-display">
                  <h3>Day {day.day_number}: {day.day_title}</h3>
                  <p>{day.description}</p>
                  <button 
                    onClick={() => toggleEditMode(`day_${dayIndex}`)}
                    aria-label="edit day"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            
            {/* Day Activities */}
            <div className="day-activities">
              {day.activities.map((activity, actIndex) => (
                <div key={actIndex} className="activity-item">
                  {editMode[`activity_${dayIndex}_${actIndex}`] ? (
                    <div className="edit-activity-form">
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) => {
                          const updatedItinerary = [...route.daily_itinerary];
                          updatedItinerary[dayIndex].activities[actIndex].name = e.target.value;
                          setRoute({...route, daily_itinerary: updatedItinerary});
                        }}
                        aria-label="Activity name"
                      />
                      <textarea
                        value={activity.description}
                        onChange={(e) => {
                          const updatedItinerary = [...route.daily_itinerary];
                          updatedItinerary[dayIndex].activities[actIndex].description = e.target.value;
                          setRoute({...route, daily_itinerary: updatedItinerary});
                        }}
                        rows={2}
                        aria-label="Activity description"
                      />
                      <input
                        type="text"
                        value={activity.time}
                        onChange={(e) => {
                          const updatedItinerary = [...route.daily_itinerary];
                          updatedItinerary[dayIndex].activities[actIndex].time = e.target.value;
                          setRoute({...route, daily_itinerary: updatedItinerary});
                        }}
                        aria-label="Activity time"
                      />
                      <button onClick={() => handleUpdateActivity(dayIndex, actIndex, {
                        name: activity.name,
                        description: activity.description,
                        time: activity.time
                      })}>
                        Save Changes
                      </button>
                      <button onClick={() => toggleEditMode(`activity_${dayIndex}_${actIndex}`)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="activity-display">
                      <div className="activity-time">{activity.time}</div>
                      <div className="activity-content">
                        <h4>{activity.name}</h4>
                        <p>{activity.description}</p>
                      </div>
                      <div className="activity-actions">
                        <button 
                          onClick={() => toggleEditMode(`activity_${dayIndex}_${actIndex}`)}
                          aria-label="edit activity"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this activity?')) {
                              handleRemoveActivity(dayIndex, actIndex);
                            }
                          }}
                          aria-label="delete activity"
                        >
                          Delete
                        </button>
                        {reorderMode && (
                          <button 
                            className="move-activity-button"
                            aria-label="move activity"
                          >
                            ↕
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add Activity Form */}
              {addingActivityToDayIndex === dayIndex ? (
                <div className="add-activity-form">
                  <h4>Add New Activity</h4>
                  <input
                    type="text"
                    placeholder="Activity name"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                    aria-label="activity name"
                  />
                  <textarea
                    placeholder="Activity description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                    rows={2}
                    aria-label="activity description"
                  />
                  <input
                    type="text"
                    placeholder="Time (e.g., 9:00 AM)"
                    value={newActivity.time}
                    onChange={(e) => setNewActivity({...newActivity, time: e.target.value})}
                    aria-label="activity time"
                  />
                  <div className="form-actions">
                    <button 
                      onClick={() => handleAddActivity(dayIndex)}
                      disabled={!newActivity.name.trim()}
                    >
                      Save Activity
                    </button>
                    <button onClick={() => setAddingActivityToDayIndex(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="add-activity-button"
                  onClick={() => setAddingActivityToDayIndex(dayIndex)}
                >
                  Add Activity
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Add New Day Form */}
      {addingNewDay && (
        <div className="add-day-form">
          <h3>Add New Day</h3>
          <input
            type="text"
            placeholder="Day title"
            value={newDay.day_title}
            onChange={(e) => setNewDay({...newDay, day_title: e.target.value})}
            aria-label="day title"
          />
          <textarea
            placeholder="Day description"
            value={newDay.description}
            onChange={(e) => setNewDay({...newDay, description: e.target.value})}
            rows={2}
            aria-label="day description"
          />
          <div className="form-actions">
            <button 
              onClick={handleAddDay}
              disabled={!newDay.day_title.trim()}
            >
              Save New Day
            </button>
            <button onClick={() => setAddingNewDay(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Edit Costs Form */}
      {editingCosts && route.estimated_costs && (
        <div className="edit-costs-form">
          <h3>Edit Estimated Costs</h3>
          <div className="costs-fields">
            {Object.entries(route.estimated_costs).map(([category, cost], index) => {
              if (category === 'Total') return null; // Skip total, it will be calculated
              
              return (
                <div key={index} className="cost-field">
                  <label>{category}</label>
                  <input
                    type="text"
                    value={cost}
                    onChange={(e) => {
                      const updatedCosts = {...route.estimated_costs};
                      updatedCosts[category] = e.target.value;
                      setRoute({...route, estimated_costs: updatedCosts});
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="form-actions">
            <button onClick={() => handleUpdateCosts(route.estimated_costs)}>
              Save Costs
            </button>
            <button onClick={() => setEditingCosts(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>Error updating itinerary:</p>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}; 