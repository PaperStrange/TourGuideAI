import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import './styles/App.css';

// Pages
import ChatPage from './pages/ChatPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import TimelineDemoPage from './pages/TimelineDemoPage';

function App() {
  const location = useLocation();
  
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <Link to="/" className="logo-link">TourGuideAI</Link>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Chat
          </Link>
          <Link 
            to="/map" 
            className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}
          >
            Map
          </Link>
          <Link 
            to="/timeline" 
            className={`nav-link ${location.pathname === '/timeline' ? 'active' : ''}`}
          >
            Timeline
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            Profile
          </Link>
        </div>
      </nav>
      
      <main className="main-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/timeline" element={<TimelineDemoPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App; 