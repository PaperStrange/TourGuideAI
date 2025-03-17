import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfilePage.css';

// Mock data for user profile and routes
const mockUserData = {
  user_id: "uid001",
  user_name: "TravelExplorer",
  user_profile: "https://randomuser.me/api/portraits/men/1.jpg"
};

const mockRoutes = [
  {
    user_profile: "https://randomuser.me/api/portraits/men/1.jpg",
    user_id: "uid001",
    user_route_id: "uid001-1",
    user_route_rank: 1,
    created_date: "2025-01-01",
    upvotes: 100,
    views: 500,
    route_name: "A 3-day US travel plan",
    sites_included_in_routes: 50,
    route_duration: "3 days",
    estimated_cost: "3000$"
  },
  {
    user_profile: "https://randomuser.me/api/portraits/men/1.jpg",
    user_id: "uid001",
    user_route_id: "uid001-2",
    user_route_rank: 5,
    created_date: "2025-01-05",
    upvotes: 75,
    views: 320,
    route_name: "Weekend in Paris",
    sites_included_in_routes: 15,
    route_duration: "2 days",
    estimated_cost: "2500$"
  },
  {
    user_profile: "https://randomuser.me/api/portraits/men/1.jpg",
    user_id: "uid001",
    user_route_id: "uid001-3",
    user_route_rank: 12,
    created_date: "2025-01-10",
    upvotes: 45,
    views: 210,
    route_name: "Tokyo adventure",
    sites_included_in_routes: 25,
    route_duration: "5 days",
    estimated_cost: "4500$"
  },
  {
    user_profile: "https://randomuser.me/api/portraits/men/1.jpg",
    user_id: "uid001",
    user_route_id: "uid001-4",
    user_route_rank: 20,
    created_date: "2025-01-15",
    upvotes: 30,
    views: 150,
    route_name: "Rome historical tour",
    sites_included_in_routes: 20,
    route_duration: "4 days",
    estimated_cost: "3500$"
  }
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(mockUserData);
  const [routes, setRoutes] = useState(mockRoutes);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Mock function for route_statics
  const calculateRouteStatistics = (route) => {
    console.log('Calculating route statistics for:', route.route_name);
    // In a real implementation, this would call APIs to get prices for entertainment, hotels, and transportation
    return {
      sites: route.sites_included_in_routes,
      duration: route.route_duration,
      cost: route.estimated_cost
    };
  };
  
  // Mock function for rank_route
  const sortRoutes = (routes, sortBy, order) => {
    console.log(`Sorting routes by ${sortBy} in ${order} order`);
    // In a real implementation, this would sort the routes based on the selected criteria
    
    return [...routes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created_date':
          comparison = new Date(a.created_date) - new Date(b.created_date);
          break;
        case 'upvotes':
          comparison = a.upvotes - b.upvotes;
          break;
        case 'views':
          comparison = a.views - b.views;
          break;
        case 'sites':
          comparison = a.sites_included_in_routes - b.sites_included_in_routes;
          break;
        case 'cost':
          comparison = parseFloat(a.estimated_cost) - parseFloat(b.estimated_cost);
          break;
        default:
          comparison = 0;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
  };
  
  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking the same sort option
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort by and default to descending order
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };
  
  // Handle route click
  const handleRouteClick = (routeId) => {
    navigate('/map', { state: { routeId } });
  };
  
  // Get sorted routes
  const sortedRoutes = sortRoutes(routes, sortBy, sortOrder);

  return (
    <div className="profile-page">
      <h1 className="page-title">User Profile</h1>
      
      <div className="profile-container">
        <div className="profile-header">
          {/* Element 1: User Name */}
          <h2 className="user-name">{userData.user_name}</h2>
          
          {/* Element 2: User Profile Media */}
          <div className="profile-image-container">
            <img 
              src={userData.user_profile} 
              alt={userData.user_name} 
              className="profile-image" 
            />
          </div>
        </div>
        
        {/* Element 3: Routes Board */}
        <div className="routes-board">
          <div className="routes-header">
            <h2>Your Travel Routes</h2>
            <div className="sort-options">
              <span>Sort by:</span>
              <button 
                className={`sort-btn ${sortBy === 'created_date' ? 'active' : ''}`}
                onClick={() => handleSortChange('created_date')}
              >
                Date {sortBy === 'created_date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortBy === 'upvotes' ? 'active' : ''}`}
                onClick={() => handleSortChange('upvotes')}
              >
                Upvotes {sortBy === 'upvotes' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                onClick={() => handleSortChange('views')}
              >
                Views {sortBy === 'views' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortBy === 'sites' ? 'active' : ''}`}
                onClick={() => handleSortChange('sites')}
              >
                Sites {sortBy === 'sites' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortBy === 'cost' ? 'active' : ''}`}
                onClick={() => handleSortChange('cost')}
              >
                Cost {sortBy === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          
          <div className="routes-list">
            {sortedRoutes.map((route) => {
              const stats = calculateRouteStatistics(route);
              
              return (
                <div 
                  key={route.user_route_id} 
                  className="route-card"
                  onClick={() => handleRouteClick(route.user_route_id)}
                >
                  <div className="route-info">
                    <h3 className="route-name">{route.route_name}</h3>
                    <p className="route-date">Created: {route.created_date}</p>
                    
                    <div className="route-stats">
                      <div className="stat-item">
                        <span className="stat-label">Duration:</span>
                        <span className="stat-value">{stats.duration}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Sites:</span>
                        <span className="stat-value">{stats.sites}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Est. Cost:</span>
                        <span className="stat-value">{stats.cost}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="route-metrics">
                    <div className="metric">
                      <span className="metric-value">{route.upvotes}</span>
                      <span className="metric-label">Upvotes</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{route.views}</span>
                      <span className="metric-label">Views</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">#{route.user_route_rank}</span>
                      <span className="metric-label">Rank</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 