import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

// Create Loading Context
const LoadingContext = createContext();

/**
 * LoadingProvider Component
 * Provides global loading state management for the application
 */
export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const startLoading = (message = 'Loading...') => {
    setLoadingMessage(message);
    setLoading(true);
  };

  const stopLoading = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return (
    <LoadingContext.Provider 
      value={{ 
        loading, 
        loadingMessage, 
        startLoading, 
        stopLoading 
      }}
    >
      {children}
      {loading && (
        <div className="global-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{loadingMessage}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

LoadingProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Custom hook to use loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingProvider; 