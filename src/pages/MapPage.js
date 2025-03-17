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
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Replace with your actual API key
    libraries: ["places"],
  });
  
  // Effect to handle route data from navigation state
  useEffect(() => {
    if (location.state) {
      console.log('Route data from navigation:', location.state);
      // In a real implementation, this would fetch the route data based on the state
    }
  }, [location]);
  
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
  
  if (loadError) return <div className="map-error">Error loading maps</div>;
  if (!isLoaded) return <div className="map-loading">Loading maps...</div>;

  return (
    <div className="map-page">
      <h1 className="page-title">Interactive Map</h1>
      
      <div className="map-container">
        {/* Element 1: Map Preview Windows */}
        <div className="map-preview">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={14}
            center={center}
            options={options}
            onLoad={displayRouteOnMap}
          >
            {/* Display route markers */}
            {routeData.travel_split_by_day.flatMap(day => 
              day.dairy_routes.map(route => (
                <Marker
                  key={route.route_id}
                  position={{
                    lat: 38.8977 + (Math.random() - 0.5) * 0.02, // Mock coordinates
                    lng: -77.0365 + (Math.random() - 0.5) * 0.02
                  }}
                  icon={{
                    url: `http://maps.google.com/mapfiles/ms/icons/blue-dot.png`,
                  }}
                  onClick={() => handleMarkerClick({
                    id: route.route_id,
                    name: route.arrival_site,
                    position: {
                      lat: 38.8977 + (Math.random() - 0.5) * 0.02,
                      lng: -77.0365 + (Math.random() - 0.5) * 0.02
                    },
                    address: 'Washington, DC',
                    reviews: []
                  })}
                />
              ))
            )}
            
            {/* Display nearby interest points */}
            {getNearbyInterestPoints().map(point => (
              <Marker
                key={point.id}
                position={point.position}
                icon={{
                  url: `http://maps.google.com/mapfiles/ms/icons/green-dot.png`,
                }}
                onClick={() => handleMarkerClick(point)}
              />
            ))}
            
            {/* Info window for selected point */}
            {selectedPoint && (
              <InfoWindow
                position={selectedPoint.position}
                onCloseClick={() => setSelectedPoint(null)}
              >
                <div className="info-window">
                  <h3>{selectedPoint.name}</h3>
                  <p>{selectedPoint.address}</p>
                  {selectedPoint.reviews && selectedPoint.reviews.length > 0 && (
                    <div className="reviews">
                      <h4>Recent Reviews</h4>
                      <ul>
                        {selectedPoint.reviews.slice(0, 3).map((review, index) => (
                          <li key={index}>
                            <strong>{review.user}</strong>: {review.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
        
        <div className="map-sidebar">
          {/* Element 2: User Input Box */}
          <div className="user-input-box">
            <h2>Your Query</h2>
            <div className="query-display">
              <div className="user-info">
                <span className="username">{userInput.user_name}</span>
                <span className="date">{userInput.created_date}</span>
              </div>
              <p className="query-text">{userInput.user_query}</p>
              <div className="intent-recognition">
                {userInput.user_intent_recognition.map((intent, index) => (
                  <div key={index} className="intent-details">
                    {intent.arrival && (
                      <span className="intent-item arrival">
                        Arrival: {intent.arrival}
                      </span>
                    )}
                    {intent.arrival_date && (
                      <span className="intent-item date">
                        Date: {intent.arrival_date}
                      </span>
                    )}
                    {intent.travel_duration && (
                      <span className="intent-item duration">
                        Duration: {intent.travel_duration}
                      </span>
                    )}
                    {intent.user_time_zone && (
                      <span className="intent-item timezone">
                        Timezone: {intent.user_time_zone}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Element 3: Route Timeline */}
          <div className="route-timeline">
            <h2>Travel Itinerary</h2>
            <div className="timeline-container">
              {splitRouteByDay().map((day) => (
                <div key={day.travel_day} className="day-container">
                  <div className="day-header">
                    <h3>Day {day.travel_day}</h3>
                    <span className="day-date">{day.current_date}</span>
                  </div>
                  <div className="routes-container">
                    {day.dairy_routes.map((route, index) => (
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
      </div>
    </div>
  );
};

export default MapPage; 