import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatPage.css';
import { OpenAIService } from '../services/apiClient';
import ApiStatus from '../components/ApiStatus';

// Mock data for live pop-up window and route rankboard
const mockPopups = [
  {
    user_profile: 'https://randomuser.me/api/portraits/men/1.jpg',
    user_name: 'uid001',
    user_route_id: 'uid001-1',
    upvotes: 100,
    user_route_name: 'A 3-day US travel plan',
    created_date: '2025-01-01'
  },
  {
    user_profile: 'https://randomuser.me/api/portraits/women/2.jpg',
    user_name: 'uid002',
    user_route_id: 'uid002-1',
    upvotes: 85,
    user_route_name: 'Paris weekend getaway',
    created_date: '2025-01-02'
  },
  {
    user_profile: 'https://randomuser.me/api/portraits/men/3.jpg',
    user_name: 'uid003',
    user_route_id: 'uid003-1',
    upvotes: 72,
    user_route_name: 'Tokyo adventure',
    created_date: '2025-01-03'
  }
];

const mockRankboard = [
  {
    upvote_rank_number: 1,
    user_profile: 'https://randomuser.me/api/portraits/men/1.jpg',
    user_name: 'uid001',
    user_route_id: 'uid001-1',
    upvotes: 100,
    user_route_name: 'A 3-day US travel plan',
    created_date: '2025-01-01'
  },
  {
    upvote_rank_number: 2,
    user_profile: 'https://randomuser.me/api/portraits/women/2.jpg',
    user_name: 'uid002',
    user_route_id: 'uid002-1',
    upvotes: 85,
    user_route_name: 'Paris weekend getaway',
    created_date: '2025-01-02'
  },
  {
    upvote_rank_number: 3,
    user_profile: 'https://randomuser.me/api/portraits/men/3.jpg',
    user_name: 'uid003',
    user_route_id: 'uid003-1',
    upvotes: 72,
    user_route_name: 'Tokyo adventure',
    created_date: '2025-01-03'
  },
  {
    upvote_rank_number: 4,
    user_profile: 'https://randomuser.me/api/portraits/women/4.jpg',
    user_name: 'uid004',
    user_route_id: 'uid004-1',
    upvotes: 65,
    user_route_name: 'Rome historical tour',
    created_date: '2025-01-04'
  },
  {
    upvote_rank_number: 5,
    user_profile: 'https://randomuser.me/api/portraits/men/5.jpg',
    user_name: 'uid005',
    user_route_id: 'uid005-1',
    upvotes: 58,
    user_route_name: 'Barcelona beach vacation',
    created_date: '2025-01-05'
  }
];

// Function to generate random background color for pop-ups
const getRandomColor = () => {
  const colors = [
    '#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9', 
    '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb', '#c8e6c9', 
    '#dcedc8', '#f0f4c3', '#fff9c4', '#ffecb3', '#ffe0b2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ChatPage = () => {
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Real implementation for user_route_generate using OpenAI API
  const handleGenerateRoute = async () => {
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Recognize the intent from user input
      const intentResponse = await OpenAIService.recognizeIntent(userInput);
      
      // 2. Generate a route based on the recognized intent
      const routeResponse = await OpenAIService.generateRoute(userInput, intentResponse.intent);
      
      // 3. Navigate to map page with the generated route data
      navigate('/map', { 
        state: { 
          userQuery: userInput, 
          intentData: intentResponse,
          routeData: routeResponse.route
        } 
      });
    } catch (err) {
      console.error('Error generating route:', err);
      setError('Failed to generate route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Real implementation for user_route_generate_randomly using OpenAI API
  const handleFeelLucky = async () => {
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Recognize the intent from user input (for context)
      const intentResponse = await OpenAIService.recognizeIntent(userInput);
      
      // 2. Generate a random route
      const randomRouteResponse = await OpenAIService.generateRandomRoute();
      
      // 3. Navigate to map page with the randomly generated route
      navigate('/map', { 
        state: { 
          userQuery: userInput,
          intentData: intentResponse,
          routeData: randomRouteResponse.route,
          isRandom: true
        } 
      });
    } catch (err) {
      console.error('Error generating random route:', err);
      setError('Failed to generate route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePopupClick = (routeId) => {
    navigate('/map', { state: { routeId } });
  };
  
  const handleRankItemClick = (routeId) => {
    navigate('/map', { state: { routeId } });
  };

  return (
    <div className="chat-page">
      {/* Element 1: Title */}
      <h1 className="page-title">Your personal tour guide!</h1>
      
      {/* API Status component */}
      <ApiStatus />
      
      <div className="chat-container">
        <div className="input-section">
          {/* Element 2: Input Box */}
          <textarea
            className="input-box"
            placeholder="Tell me about your dream vacation..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          
          <div className="button-group">
            {/* Element 3: Generate Button */}
            <button
              className="btn btn-primary generate-btn"
              onClick={handleGenerateRoute}
              disabled={!userInput.trim() || isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate your first plan!'}
            </button>
            
            {/* Element 4: Feel Lucky Button */}
            <button
              className="btn btn-secondary lucky-btn"
              onClick={handleFeelLucky}
              disabled={!userInput.trim() || isLoading}
            >
              Feel lucky?
            </button>
          </div>
          
          {/* Error message */}
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="content-section">
          {/* Element 5: Live Pop-up Window */}
          <div className="live-popup-section">
            <h2>Live Activity</h2>
            <div className="popup-container">
              {mockPopups.map((popup, index) => (
                <div
                  key={index}
                  className="popup-item"
                  style={{ backgroundColor: getRandomColor() }}
                  onClick={() => handlePopupClick(popup.user_route_id)}
                >
                  <img src={popup.user_profile} alt={popup.user_name} className="user-avatar" />
                  <div className="popup-content">
                    <p className="user-name">{popup.user_name}</p>
                    <p className="route-name">{popup.user_route_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Element 6: Route Rankboard */}
          <div className="rankboard-section">
            <h2>Top Routes</h2>
            <div className="rankboard-container">
              <div className="top-three">
                {mockRankboard.slice(0, 3).map((item) => (
                  <div key={item.upvote_rank_number} className="medal-item" onClick={() => handleRankItemClick(item.user_route_id)}>
                    <div className={`medal rank-${item.upvote_rank_number}`}>
                      <img src={item.user_profile} alt={item.user_name} className="user-avatar" />
                      <div className="upvote-badge">{item.upvotes}</div>
                    </div>
                    <p className="user-name">{item.user_name}</p>
                    <p className="route-name">{item.user_route_name}</p>
                  </div>
                ))}
              </div>
              
              <div className="other-ranks">
                {mockRankboard.slice(3).map((item) => (
                  <div key={item.upvote_rank_number} className="rank-item" onClick={() => handleRankItemClick(item.user_route_id)}>
                    <div className="rank-number">{item.upvote_rank_number}</div>
                    <div className="rank-details">
                      <p className="route-name">{item.user_route_name}</p>
                      <p className="upvotes">{item.upvotes} upvotes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 