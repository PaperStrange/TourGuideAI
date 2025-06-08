/**
 * Navbar component for main application navigation
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar" data-testid="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            <img src="/logo.svg" alt="TourGuide AI" className="brand-logo" />
            <span className="brand-text">TourGuide AI</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="navbar-nav">
          <Link 
            to="/chat" 
            className={`nav-link ${isActivePath('/chat') ? 'active' : ''}`}
            data-testid="chat-link"
          >
            Chat
          </Link>
          <Link 
            to="/map" 
            className={`nav-link ${isActivePath('/map') ? 'active' : ''}`}
            data-testid="map-link"
          >
            Map
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link ${isActivePath('/profile') ? 'active' : ''}`}
            data-testid="profile-link"
          >
            Profile
          </Link>
        </div>

        {/* User Section */}
        <div className="navbar-user">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">Welcome, {user?.name || 'User'}</span>
              <button 
                onClick={handleLogout}
                className="logout-btn"
                data-testid="logout-button"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-link register-link">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 