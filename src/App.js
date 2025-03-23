import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LoadingProvider } from './contexts/LoadingContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import './styles/App.css';

// Lazy load route components
const HomePage = lazy(() => import('./pages/HomePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

/**
 * Main application component
 * Implements code splitting for route-based components
 */
function App() {
  return (
    <LoadingProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
            <Routes>
              <Route exact path="/" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </LoadingProvider>
  );
}

export default App; 