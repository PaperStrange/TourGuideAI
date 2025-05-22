import React, { createContext, useState, useContext, useCallback } from 'react';

// Create a context for managing loading states
const LoadingContext = createContext({
  isLoading: false,
  message: '',
  progress: 0,
  setLoading: () => {},
  setProgress: () => {},
});

/**
 * LoadingProvider component
 * 
 * Provides loading state management for the application
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 */
export const LoadingProvider = ({ children }) => {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    message: '',
    progress: 0,
  });

  // Set loading state with message
  const setLoading = useCallback((isLoading, message = '') => {
    setLoadingState(prev => ({
      ...prev,
      isLoading,
      message,
      // Reset progress when loading starts
      ...(isLoading && { progress: 0 }),
    }));
  }, []);

  // Update progress percentage
  const setProgress = useCallback((progress) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(Math.max(0, progress), 100), // Ensure progress is between 0 and 100
    }));
  }, []);

  // Provide loading state and functions to children
  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingState.isLoading,
        message: loadingState.message,
        progress: loadingState.progress,
        setLoading,
        setProgress,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * Custom hook to use the loading context
 * 
 * @returns {Object} Loading context value
 */
export const useLoading = () => useContext(LoadingContext);

/**
 * Dynamic import with progress tracking
 * 
 * @param {Function} importFn - Dynamic import function
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<any>} - Imported module
 */
export const importWithProgress = (importFn, onProgress) => {
  if (typeof importFn !== 'function') {
    return Promise.reject(new Error('Expected import function'));
  }

  return new Promise((resolve, reject) => {
    let timeoutId = null;
    let progress = 0;
    
    // Simulate progress while loading
    const interval = 100;
    const simulateProgress = () => {
      progress += (100 - progress) / 10;
      if (progress > 99) progress = 99;
      onProgress(Math.floor(progress));
      timeoutId = setTimeout(simulateProgress, interval);
    };
    
    simulateProgress();
    
    importFn()
      .then(module => {
        clearTimeout(timeoutId);
        onProgress(100);
        setTimeout(() => resolve(module), 100);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}; 