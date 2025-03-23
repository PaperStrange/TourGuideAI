import React, { useState, useEffect } from 'react';
import { getStatus } from '../core/api/openaiApi';

/**
 * ApiStatus component - displays the status of the API connections
 */
const ApiStatus = () => {
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    maps: false,
    checking: true,
    error: null
  });

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const status = await getStatus();
        setApiStatus({
          openai: status.isConfigured,
          maps: !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          checking: false,
          error: null
        });
      } catch (error) {
        setApiStatus({
          openai: false,
          maps: false,
          checking: false,
          error: error.message
        });
      }
    };

    checkApiStatus();
  }, []);

  if (apiStatus.checking) {
    return <div className="api-status">Checking API status...</div>;
  }

  if (apiStatus.error) {
    return (
      <div className="api-status api-status-error">
        <h3>API Status Error</h3>
        <p>{apiStatus.error}</p>
        <p>Please check your API configuration in the .env file.</p>
      </div>
    );
  }

  return (
    <div className="api-status">
      <h3>API Status</h3>
      <ul>
        <li className={apiStatus.openai ? "api-connected" : "api-disconnected"}>
          OpenAI API: {apiStatus.openai ? "Connected" : "Not Connected"}
          {!apiStatus.openai && (
            <p className="api-help">
              Please set your OpenAI API key in the .env file (REACT_APP_OPENAI_API_KEY).
            </p>
          )}
        </li>
        <li className={apiStatus.maps ? "api-connected" : "api-disconnected"}>
          Google Maps API: {apiStatus.maps ? "Connected" : "Not Connected"}
          {!apiStatus.maps && (
            <p className="api-help">
              Please set your Google Maps API key in the .env file (REACT_APP_GOOGLE_MAPS_API_KEY).
            </p>
          )}
        </li>
      </ul>
    </div>
  );
};

export default ApiStatus; 