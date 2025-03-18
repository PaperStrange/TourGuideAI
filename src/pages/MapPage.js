import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import '../styles/MapPage.css';

// Mock data for user input and route timeline
const mockUserInput = {
  user_name: "uid001",
  user_query: "wish a 3-day US travel plan during christmas!",
  user_intent_recognition: [
    {
      arrival: "united states",
      departure: "",
      arrival_date: "christmas day",
      departure_date: "",
      travel_duration: "3 days",
      entertainment_prefer: "",
      transportation_prefer: "",
      accommodation_prefer: "",
      total_cost_prefer: "",
      user_time_zone: "GMT-4",
      user_personal_need: ""
    }
  ],
  created_date: "2025-01-01"
};

const mockRouteData = {
  user_profile: "https://randomuser.me/api/portraits/men/1.jpg",
  user_name: "uid001",
  user_route_id: "uid001-1",
  user_route_rank: 1,
  created_date: "2025-01-01",
  upvotes: 100,
  user_route_name: "a 3-day US travel plan",
  travel_split_by_day: [
    {
      travel_day: 1,
      current_date: "2025/03/10",
      dairy_routes: [
        {
          route_id: "r001",
          departure_site: "Hotel Washington",
          arrival_site: "Smithsonian National Museum of Natural History",
          departure_time: "2025/03/10 9.00 AM(GMT-4)",
          arrival_time: "2025/03/10 9.16 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "walk",
          duration: "14",
          duration_unit: "minute",
          distance: 0.7,
          distance_unit: "mile",
          recommended_reason: "From dinosaur exhibits to displays of rare gems, this acclaimed museum celebrates the natural world."
        },
        {
          route_id: "r002",
          departure_site: "Smithsonian National Museum of Natural History",
          arrival_site: "National Air and Space Museum",
          departure_time: "2025/03/10 11.30 AM(GMT-4)",
          arrival_time: "2025/03/10 11.45 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "walk",
          duration: "15",
          duration_unit: "minute",
          distance: 0.8,
          distance_unit: "mile",
          recommended_reason: "Explore the history of flight and space exploration at this fascinating museum."
        },
        {
          route_id: "r003",
          departure_site: "National Air and Space Museum",
          arrival_site: "Lincoln Memorial",
          departure_time: "2025/03/10 2.00 PM(GMT-4)",
          arrival_time: "2025/03/10 2.20 PM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "taxi",
          duration: "20",
          duration_unit: "minute",
          distance: 2.1,
          distance_unit: "mile",
          recommended_reason: "This iconic memorial honors Abraham Lincoln and offers stunning views of the National Mall."
        }
      ]
    },
    {
      travel_day: 2,
      current_date: "2025/03/11",
      dairy_routes: [
        {
          route_id: "r004",
          departure_site: "Hotel Washington",
          arrival_site: "White House",
          departure_time: "2025/03/11 9.00 AM(GMT-4)",
          arrival_time: "2025/03/11 9.10 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "walk",
          duration: "10",
          duration_unit: "minute",
          distance: 0.5,
          distance_unit: "mile",
          recommended_reason: "The official residence and workplace of the President of the United States."
        },
        {
          route_id: "r005",
          departure_site: "White House",
          arrival_site: "National Gallery of Art",
          departure_time: "2025/03/11 11.00 AM(GMT-4)",
          arrival_time: "2025/03/11 11.20 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "walk",
          duration: "20",
          duration_unit: "minute",
          distance: 1.0,
          distance_unit: "mile",
          recommended_reason: "One of the world's finest art museums with an impressive collection spanning centuries."
        }
      ]
    },
    {
      travel_day: 3,
      current_date: "2025/03/12",
      dairy_routes: [
        {
          route_id: "r006",
          departure_site: "Hotel Washington",
          arrival_site: "United States Capitol",
          departure_time: "2025/03/12 9.00 AM(GMT-4)",
          arrival_time: "2025/03/12 9.25 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "taxi",
          duration: "25",
          duration_unit: "minute",
          distance: 2.3,
          distance_unit: "mile",
          recommended_reason: "The meeting place of the United States Congress and the seat of the legislative branch of the U.S. federal government."
        },
        {
          route_id: "r007",
          departure_site: "United States Capitol",
          arrival_site: "Library of Congress",
          departure_time: "2025/03/12 11.30 AM(GMT-4)",
          arrival_time: "2025/03/12 11.40 AM(GMT-4)",
          user_time_zone: "GMT-4",
          transportation_type: "walk",
          duration: "10",
          duration_unit: "minute",
          distance: 0.5,
          distance_unit: "mile",
          recommended_reason: "The largest library in the world, with millions of books, recordings, photographs, newspapers, maps and manuscripts."
        }
      ]
    }
  ]
};

// Mock nearby interest points
const mockNearbyPoints = [
  {
    id: 'np1',
    name: 'National Museum of American History',
    position: { lat: 38.8911, lng: -77.0300 },
    address: '1300 Constitution Ave NW, Washington, DC 20560',
    reviews: [
      { user: 'John D.', text: 'Amazing collection of American artifacts!' },
      { user: 'Sarah M.', text: 'Spent hours here, very educational.' },
      { user: 'Mike T.', text: 'The First Ladies exhibit was fascinating.' },
      { user: 'Lisa R.', text: 'Great for history buffs of all ages.' },
      { user: 'David K.', text: 'Well organized and informative displays.' }
    ]
  },
  {
    id: 'np2',
    name: 'Washington Monument',
    position: { lat: 38.8895, lng: -77.0353 },
    address: '2 15th St NW, Washington, DC 20024',
    reviews: [
      { user: 'Emma S.', text: 'The view from the top is breathtaking!' },
      { user: 'Robert J.', text: 'Iconic monument, a must-see in DC.' },
      { user: 'Patricia L.', text: 'Get tickets in advance to avoid long lines.' },
      { user: 'Thomas B.', text: 'Beautiful at sunset.' },
      { user: 'Jennifer W.', text: 'Great photo opportunity.' }
    ]
  },
  {
    id: 'np3',
    name: 'National Gallery of Art Sculpture Garden',
    position: { lat: 38.8913, lng: -77.0231 },
    address: 'Constitution Ave NW &, 7th St NW, Washington, DC 20408',
    reviews: [
      { user: 'Richard M.', text: 'Peaceful oasis in the middle of the city.' },
      { user: 'Karen P.', text: 'Beautiful sculptures in a lovely setting.' },
      { user: 'Daniel T.', text: 'Great place to relax after museum visits.' },
      { user: 'Nancy C.', text: 'The fountain is beautiful in summer.' },
      { user: 'Paul S.', text: 'Ice skating in winter is a fun activity here.' }
    ]
  }
];

// Map component configuration
const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const center = {
  lat: 38.8977,
  lng: -77.0365
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

const MapPage = () => {
  const location = useLocation();
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [routeData, setRouteData] = useState(mockRouteData);
  const [userInput, setUserInput] = useState(mockUserInput);
  
  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "", // Use environment variable
    libraries: ["places"],
  });
  
  // Effect to handle route data from navigation state
  useEffect(() => {
    if (location.state) {
      console.log('Route data from navigation:', location.state);
      
      // Use real data passed from ChatPage if available
      if (location.state.routeData) {
        // Transform the OpenAI route format to our app's route format
        const transformedRouteData = transformRouteData(location.state.routeData, location.state.userQuery);
        setRouteData(transformedRouteData);
      }
      
      if (location.state.userQuery) {
        // Create user input object from the query
        setUserInput({
          user_name: "current_user",
          user_query: location.state.userQuery,
          user_intent_recognition: location.state.intentData ? [location.state.intentData.intent] : mockUserInput.user_intent_recognition,
          created_date: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [location]);
  
  // Helper function to transform the OpenAI route data format to our app's format
  const transformRouteData = (openaiRoute, query) => {
    if (!openaiRoute) return mockRouteData;
    
    try {
      // Create a transformed route object
      const transformedRoute = {
        user_profile: "https://randomuser.me/api/portraits/men/1.jpg", // Default profile
        user_name: "current_user",
        user_route_id: `route-${Date.now()}`,
        user_route_rank: 1,
        created_date: new Date().toISOString().split('T')[0],
        upvotes: 0,
        user_route_name: openaiRoute.route_name || `${openaiRoute.destination} Trip`,
        travel_split_by_day: []
      };
      
      // Transform daily itinerary into travel_split_by_day format
      if (openaiRoute.daily_itinerary && Array.isArray(openaiRoute.daily_itinerary)) {
        transformedRoute.travel_split_by_day = openaiRoute.daily_itinerary.map((day, dayIndex) => {
          // Get activities for the day
          const activities = day.activities || [];
          
          // Create routes between activities
          const routes = [];
          for (let i = 0; i < activities.length - 1; i++) {
            const departure = activities[i];
            const arrival = activities[i + 1];
            
            routes.push({
              route_id: `r${dayIndex + 1}-${i + 1}`,
              departure_site: departure.activity.split(' at ')[1] || departure.activity,
              arrival_site: arrival.activity.split(' at ')[1] || arrival.activity,
              departure_time: `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(dayIndex + 1).padStart(2, '0')} ${departure.time}`,
              arrival_time: `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(dayIndex + 1).padStart(2, '0')} ${arrival.time}`,
              user_time_zone: "Local",
              transportation_type: getRandomTransportation(),
              duration: getRandomDuration(),
              duration_unit: "minute",
              distance: getRandomDistance(),
              distance_unit: "mile",
              recommended_reason: getRecommendationFromActivity(arrival.activity)
            });
          }
          
          return {
            travel_day: day.day || dayIndex + 1,
            current_date: `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(dayIndex + 1).padStart(2, '0')}`,
            dairy_routes: routes
          };
        });
      }
      
      return transformedRoute;
    } catch (error) {
      console.error('Error transforming route data:', error);
      return mockRouteData;
    }
  };
  
  // Helper functions to generate random data when real data is not available
  const getRandomTransportation = () => {
    const options = ['walk', 'taxi', 'bus', 'subway', 'bike'];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getRandomDuration = () => {
    return String(Math.floor(Math.random() * 30) + 10);
  };
  
  const getRandomDistance = () => {
    return (Math.random() * 2 + 0.5).toFixed(1);
  };
  
  const getRecommendationFromActivity = (activity) => {
    // Extract a recommendation from the activity description
    if (!activity) return "A must-visit destination on your trip.";
    
    const recommendations = [
      `Discover ${activity} - a highlight of the area.`,
      `${activity} offers an unforgettable experience.`,
      `Don't miss ${activity} during your visit.`,
      `${activity} is popular among travelers for good reason.`,
      `Experience the unique atmosphere of ${activity}.`
    ];
    
    return recommendations[Math.floor(Math.random() * recommendations.length)];
  };
  
  // Mock function for map_real_time_display
  const displayRouteOnMap = () => {
    console.log('Displaying route on map');
    // In a real implementation, this would use the Google Maps Directions API
  };
  
  // Mock function for get nearby interest point
  const getNearbyInterestPoints = () => {
    console.log('Getting nearby interest points');
    // In a real implementation, this would use the Google Maps Places API
    return mockNearbyPoints;
  };
  
  // Mock function for user_route_split_by_day
  const splitRouteByDay = () => {
    console.log('Splitting route by day');
    // In a real implementation, this would call the OpenAI API
    return routeData.travel_split_by_day;
  };
  
  // Mock function for user_route_transportation_validation
  const validateTransportation = () => {
    console.log('Validating transportation');
    // In a real implementation, this would use the Google Maps Directions API
  };
  
  // Mock function for user_route_interest_points_validation
  const validateInterestPoints = () => {
    console.log('Validating interest points');
    // In a real implementation, this would use the Google Maps Distance Matrix API
  };
  
  // Handle marker click
  const handleMarkerClick = (point) => {
    setSelectedPoint(point);
  };
  
  // Render loading indicator or error message for map
  const renderMap = () => {
    if (loadError) {
      return (
        <div className="map-error-container">
          <h3>Error loading maps</h3>
          <p>There was an error loading Google Maps. Please check your API key configuration.</p>
          <p className="error-details">Error: {loadError.message}</p>
        </div>
      );
    }

    if (!isLoaded) {
      return <div className="map-loading">Loading maps...</div>;
    }

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={center}
        options={options}
        onLoad={displayRouteOnMap}
      >
        {/* Route markers */}
        {routeData.travel_split_by_day.flatMap(day =>
          day.dairy_routes.map(route => (
            <React.Fragment key={route.route_id}>
              <Marker
                key={`departure-${route.route_id}`}
                position={{
                  lat: 38.8977 + (Math.random() - 0.5) * 0.02,
                  lng: -77.0365 + (Math.random() - 0.5) * 0.02
                }}
                onClick={() => handleMarkerClick({
                  id: `departure-${route.route_id}`,
                  name: route.departure_site,
                  position: {
                    lat: 38.8977 + (Math.random() - 0.5) * 0.02,
                    lng: -77.0365 + (Math.random() - 0.5) * 0.02
                  }
                })}
              />
              <Marker
                key={`arrival-${route.route_id}`}
                position={{
                  lat: 38.8977 + (Math.random() - 0.5) * 0.02,
                  lng: -77.0365 + (Math.random() - 0.5) * 0.02
                }}
                onClick={() => handleMarkerClick({
                  id: `arrival-${route.route_id}`,
                  name: route.arrival_site,
                  position: {
                    lat: 38.8977 + (Math.random() - 0.5) * 0.02,
                    lng: -77.0365 + (Math.random() - 0.5) * 0.02
                  }
                })}
              />
            </React.Fragment>
          ))
        )}

        {/* Nearby points */}
        {getNearbyInterestPoints().map(point => (
          <Marker
            key={point.id}
            position={point.position}
            icon={{
              url: `http://maps.google.com/mapfiles/ms/icons/green-dot.png`,
              scaledSize: isLoaded ? new window.google.maps.Size(32, 32) : null
            }}
            onClick={() => handleMarkerClick(point)}
          />
        ))}

        {/* Info window */}
        {selectedPoint && (
          <InfoWindow
            position={selectedPoint.position}
            onCloseClick={() => setSelectedPoint(null)}
          >
            <div className="info-window">
              <h3>{selectedPoint.name}</h3>
              {selectedPoint.address && <p>{selectedPoint.address}</p>}
              {selectedPoint.reviews && selectedPoint.reviews.length > 0 && (
                <div className="reviews">
                  <h4>Reviews</h4>
                  {selectedPoint.reviews.map((review, index) => (
                    <div key={index} className="review">
                      <div className="review-rating">{review.rating}/5</div>
                      <div className="review-text">{review.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  // Add helper function to get coordinates from location name (mock implementation)
  const getCoordinatesFromLocation = (locationName) => {
    // This would be replaced with actual geocoding in a real application
    return {
      lat: 38.8977 + (Math.random() - 0.5) * 0.02,
      lng: -77.0365 + (Math.random() - 0.5) * 0.02
    };
  };

  // Main component return
  return (
    <div className="map-page">
      <h1 className="page-title">Interactive Map</h1>
      
      <div className="map-container">
        {renderMap()}
      </div>
        
      {/* Element 2: User Input Box Component */}
      <div className="user-input-box">
        <h2>User Query</h2>
        <div className="query-display">
          <p>{userInput.user_query}</p>
          <div className="intent-recognition">
            <h3>Recognized Intent</h3>
            <ul>
              {userInput.user_intent_recognition.map((intent, index) => (
                <li key={index}>
                  <strong>Destination:</strong> {intent.arrival || 'Not specified'}<br />
                  <strong>Travel Period:</strong> {intent.arrival_date || 'Not specified'}<br />
                  <strong>Duration:</strong> {intent.travel_duration || 'Not specified'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Element 3: Route Timeline Component */}
      <div className="route-timeline">
        <h2>Route Timeline</h2>
        <div className="timeline-container">
          {splitRouteByDay().map((day) => (
            <div key={day.travel_day} className="day-container">
              <div className="day-header">
                <h3>Day {day.travel_day}</h3>
                <span className="day-date">{day.current_date}</span>
              </div>
              <div className="routes-container">
                {day.dairy_routes.map((route) => (
                  <div key={route.route_id} className="route-item">
                    <div className="timeline-marker"></div>
                    <div className="route-content">
                      <div className="route-sites">
                        <div className="departure-site">
                          <span className="time">{route.departure_time.split(' ')[1]}</span>
                          <span className="site-name">{route.departure_site}</span>
                        </div>
                        <div className="transportation">
                          <span className="transport-type">{route.transportation_type}</span>
                          <span className="transport-details">
                            {route.duration} {route.duration_unit} • {route.distance} {route.distance_unit}
                          </span>
                        </div>
                        <div className="arrival-site">
                          <span className="time">{route.arrival_time.split(' ')[1]}</span>
                          <span className="site-name">{route.arrival_site}</span>
                        </div>
                      </div>
                      <div className="recommendation">
                        <p>{route.recommended_reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage; 