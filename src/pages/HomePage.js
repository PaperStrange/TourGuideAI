import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

/**
 * Home page component
 * Acts as an entry point to the application with navigation to other pages
 * 
 * @returns {JSX.Element}
 */
const HomePage = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome to TourGuideAI</h1>
        <p className="home-tagline">Your personal travel planning assistant</p>
      </header>

      <section className="feature-cards">
        <div className="feature-card">
          <h2>Plan Your Journey</h2>
          <p>Create personalized travel itineraries based on your preferences.</p>
          <Link to="/chat" className="feature-button">Start Planning</Link>
        </div>

        <div className="feature-card">
          <h2>Explore Destinations</h2>
          <p>View your routes on interactive maps and discover points of interest.</p>
          <Link to="/map" className="feature-button">Open Map</Link>
        </div>

        <div className="feature-card">
          <h2>Manage Your Profile</h2>
          <p>Save your favorite destinations and track your travel history.</p>
          <Link to="/profile" className="feature-button">View Profile</Link>
        </div>
      </section>

      <section className="app-info">
        <h2>How TourGuideAI Works</h2>
        <div className="step-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Tell us about your trip</h3>
            <p>Share your destination, dates, and preferences.</p>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <h3>Get personalized recommendations</h3>
            <p>Our AI generates a custom itinerary for you.</p>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <h3>Explore and refine</h3>
            <p>Visualize your journey and make adjustments as needed.</p>
          </div>
        </div>
      </section>

      <section className="beta-program">
        <h2>Join Our Beta Program</h2>
        <p>Get early access to new features and help shape the future of TourGuideAI.</p>
        <Link to="/beta" className="beta-button">Join Beta</Link>
      </section>

      <footer className="home-footer">
        <p>&copy; {new Date().getFullYear()} TourGuideAI - Your personal tour guide</p>
        <nav className="footer-nav">
          <Link to="/chat">Chat</Link>
          <Link to="/map">Map</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/beta">Beta Program</Link>
        </nav>
      </footer>
    </div>
  );
};

export default HomePage; 