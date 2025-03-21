import React from 'react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner component
 * 
 * Used as a fallback UI during code splitting/lazy loading
 * 
 * @param {Object} props
 * @param {number} [props.progress] - Optional loading progress (0-100)
 * @param {string} [props.message] - Optional loading message
 * @returns {JSX.Element}
 */
const LoadingSpinner = ({ progress, message = 'Loading...' }) => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
      {progress !== undefined && (
        <div className="loading-progress">
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loading-progress-text">{progress}%</div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 