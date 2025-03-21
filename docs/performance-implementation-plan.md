# TourGuideAI Code Splitting Implementation Plan

This document outlines the detailed implementation plan for code splitting in the TourGuideAI application, as part of the Version 0.5.0-ALPHA1 performance optimization efforts.

## 1. Current Bundle Analysis

### Initial Steps
- Configure webpack-bundle-analyzer in the project
- Generate a baseline bundle report to identify optimization opportunities
- Measure current load times and performance metrics
- Identify large dependencies and components that are candidates for splitting

### Expected Outcomes
- Complete understanding of current bundle composition
- Identification of the largest contributors to bundle size
- Baseline performance metrics for comparison after optimization

## 2. Route-Based Code Splitting Strategy

### Implementation
1. Implement React Router with code splitting:
   ```javascript
   // Before (in App.js or similar)
   import HomePage from './pages/HomePage';
   import ChatPage from './pages/ChatPage';
   import MapPage from './pages/MapPage';
   import ProfilePage from './pages/ProfilePage';
   
   // After
   import React, { lazy, Suspense } from 'react';
   
   const HomePage = lazy(() => import('./pages/HomePage'));
   const ChatPage = lazy(() => import('./pages/ChatPage'));
   const MapPage = lazy(() => import('./pages/MapPage'));
   const ProfilePage = lazy(() => import('./pages/ProfilePage'));
   
   // In the router
   <Suspense fallback={<LoadingSpinner />}>
     <Switch>
       <Route exact path="/" component={HomePage} />
       <Route path="/chat" component={ChatPage} />
       <Route path="/map" component={MapPage} />
       <Route path="/profile" component={ProfilePage} />
     </Switch>
   </Suspense>
   ```

2. Create a `LoadingSpinner` component for Suspense fallbacks:
   ```javascript
   // src/components/common/LoadingSpinner.jsx
   import React from 'react';
   import './LoadingSpinner.css';
   
   const LoadingSpinner = () => (
     <div className="loading-spinner-container">
       <div className="loading-spinner"></div>
       <p>Loading...</p>
     </div>
   );
   
   export default LoadingSpinner;
   ```

3. Implement CSS for the loading spinner:
   ```css
   /* src/components/common/LoadingSpinner.css */
   .loading-spinner-container {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     height: 100vh;
   }
   
   .loading-spinner {
     border: 4px solid rgba(0, 0, 0, 0.1);
     border-radius: 50%;
     border-top: 4px solid #3498db;
     width: 40px;
     height: 40px;
     animation: spin 1s linear infinite;
   }
   
   @keyframes spin {
     0% { transform: rotate(0deg); }
     100% { transform: rotate(360deg); }
   }
   ```

### Expected Outcomes
- Each route will be loaded only when needed
- Initial page load will only include essential code
- Loading spinner will be shown during chunk loading

## 3. Feature-Based Code Splitting

### Implementation
1. Create separate chunks for each major feature directory:
   ```javascript
   // src/features/index.js
   export const importTravelPlanning = () => import('./travel-planning');
   export const importMapVisualization = () => import('./map-visualization');
   export const importUserProfile = () => import('./user-profile');
   
   // Lazy load a feature when needed
   const loadFeature = async (feature) => {
     switch (feature) {
       case 'travel-planning':
         return (await importTravelPlanning()).default;
       case 'map-visualization':
         return (await importMapVisualization()).default;
       case 'user-profile':
         return (await importUserProfile()).default;
       default:
         throw new Error(`Unknown feature: ${feature}`);
     }
   };
   
   export default loadFeature;
   ```

2. Update webpack configuration for optimal chunking:
   ```javascript
   // In webpack config
   optimization: {
     splitChunks: {
       chunks: 'all',
       maxInitialRequests: Infinity,
       minSize: 0,
       cacheGroups: {
         vendor: {
           test: /[\\/]node_modules[\\/]/,
           name(module) {
             // Get the name of the npm package
             const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
             // Return a chunk name based on npm package
             return `npm.${packageName.replace('@', '')}`;
           },
         },
         features: {
           test: /[\\/]src[\\/]features[\\/]/,
           name(module) {
             // Extract feature name
             const featureName = module.context.match(/[\\/]features[\\/](.*?)([\\/]|$)/)[1];
             return `feature.${featureName}`;
           },
           minSize: 10000,
         },
       },
     },
   }
   ```

### Expected Outcomes
- Vendor code will be split into separate chunks
- Each feature will have its own chunk
- Common code will be extracted into shared chunks

## 4. Component-Level Code Splitting

### Implementation
1. Identify heavy components for splitting:
   - Map component (uses Google Maps)
   - Timeline component (complex with many sub-components)
   - Route planner (complex UI with many interactions)

2. Implement lazy loading for these components:
   ```javascript
   // Before
   import MapComponent from '../../components/MapComponent';
   
   // After
   const MapComponent = lazy(() => import('../../components/MapComponent'));
   
   // In render
   <Suspense fallback={<div className="map-placeholder">Loading Map...</div>}>
     <MapComponent {...props} />
   </Suspense>
   ```

3. Implement custom loading states for each component:
   ```javascript
   // Map placeholder
   <div className="map-placeholder">
     <div className="map-loading-icon"></div>
     <p>Loading interactive map...</p>
   </div>
   
   // Timeline placeholder
   <div className="timeline-placeholder">
     <div className="timeline-skeleton"></div>
   </div>
   ```

### Expected Outcomes
- Heavy components will load on demand
- User will see appropriate loading states
- Initial page load will be faster

## 5. Webpack Optimization Configuration

### Implementation
1. Configure webpack for production optimization:
   ```javascript
   // webpack.config.js
   module.exports = {
     mode: process.env.NODE_ENV,
     optimization: {
       minimize: true,
       minimizer: [
         new TerserPlugin({
           terserOptions: {
             parse: {
               ecma: 8,
             },
             compress: {
               ecma: 5,
               warnings: false,
               comparisons: false,
               inline: 2,
             },
             mangle: {
               safari10: true,
             },
             output: {
               ecma: 5,
               comments: false,
               ascii_only: true,
             },
           },
           parallel: true,
         }),
       ],
       splitChunks: {
         // Configuration as above
       },
       runtimeChunk: {
         name: 'runtime',
       },
     },
   };
   ```

2. Add BundleAnalyzerPlugin for ongoing monitoring:
   ```javascript
   const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
   
   plugins: [
     // Only add in analyze mode
     process.env.ANALYZE && new BundleAnalyzerPlugin({
       analyzerMode: 'static',
       reportFilename: 'bundle-report.html',
       openAnalyzer: false,
     }),
   ].filter(Boolean),
   ```

3. Update package.json with analysis script:
   ```json
   "scripts": {
     "analyze": "ANALYZE=true npm run build",
     "analyze:win": "set ANALYZE=true && npm run build"
   }
   ```

### Expected Outcomes
- Optimized production build
- Ability to analyze bundle composition
- Runtime code separation for better caching

## 6. Loading States and User Experience

### Implementation
1. Create a centralized loading state management:
   ```javascript
   // src/contexts/LoadingContext.js
   import React, { createContext, useState, useContext } from 'react';
   
   const LoadingContext = createContext({
     isLoading: false,
     message: '',
     setLoading: () => {},
   });
   
   export const LoadingProvider = ({ children }) => {
     const [loadingState, setLoadingState] = useState({
       isLoading: false,
       message: '',
     });
   
     const setLoading = (isLoading, message = '') => {
       setLoadingState({ isLoading, message });
     };
   
     return (
       <LoadingContext.Provider
         value={{
           isLoading: loadingState.isLoading,
           message: loadingState.message,
           setLoading,
         }}
       >
         {children}
       </LoadingContext.Provider>
     );
   };
   
   export const useLoading = () => useContext(LoadingContext);
   ```

2. Implement progress tracking for large chunks:
   ```javascript
   // Dynamic import with progress tracking
   const importWithProgress = (importFn, onProgress) => {
     if (typeof importFn !== 'function') return Promise.reject(new Error('Expected import function'));
   
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
   
   // Usage
   const [progress, setProgress] = useState(0);
   const [MapComponent, setMapComponent] = useState(null);
   
   useEffect(() => {
     let mounted = true;
     importWithProgress(
       () => import('../../components/MapComponent'),
       (percent) => {
         if (mounted) setProgress(percent);
       }
     )
     .then(module => {
       if (mounted) setMapComponent(() => module.default);
     });
     
     return () => { mounted = false; };
   }, []);
   
   // Render
   return MapComponent 
     ? <MapComponent {...props} /> 
     : <LoadingIndicator progress={progress} />;
   ```

### Expected Outcomes
- User will see loading progress for large components
- Consistent loading experience across the application
- Reduced perceived loading time with visual feedback

## 7. Testing and Verification

### Implementation
1. Create tests for code splitting functionality:
   ```javascript
   // src/__tests__/codeSplitting.test.js
   import { render, screen, waitFor } from '@testing-library/react';
   import { MemoryRouter } from 'react-router-dom';
   import App from '../App';
   
   test('loads home page initially', async () => {
     render(
       <MemoryRouter initialEntries={['/']}>
         <App />
       </MemoryRouter>
     );
     
     // Should show loading state initially
     expect(screen.getByText(/loading/i)).toBeInTheDocument();
     
     // Then should show home page content
     await waitFor(() => {
       expect(screen.getByText(/welcome to tourguideai/i)).toBeInTheDocument();
     });
   });
   
   test('lazy loads chat page when navigated to', async () => {
     render(
       <MemoryRouter initialEntries={['/chat']}>
         <App />
       </MemoryRouter>
     );
     
     // Should show loading state initially
     expect(screen.getByText(/loading/i)).toBeInTheDocument();
     
     // Then should show chat page content
     await waitFor(() => {
       expect(screen.getByText(/your personal tour guide/i)).toBeInTheDocument();
     });
   });
   ```

2. Measure and compare performance metrics:
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Time to Interactive (TTI)
   - Total bundle size
   - Initial bundle size
   - Lighthouse performance score

### Expected Outcomes
- Verification that code splitting works correctly
- Quantifiable performance improvements
- Documentation of metrics before and after optimization

## 8. Implementation Timeline

| Task | Estimated Time | Dependencies |
|------|---------------|--------------|
| Bundle analysis | 1 day | webpack-bundle-analyzer |
| Route-based code splitting | 1 day | React Router, Suspense |
| Feature-based code splitting | 2 days | Webpack configuration |
| Component-level code splitting | 2 days | Identified heavy components |
| Webpack optimization | 1 day | Build process understanding |
| Loading states | 1 day | UI design for loading states |
| Testing and verification | 2 days | Testing framework |

## 9. Metrics and Success Criteria

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Initial bundle size | TBD | <500KB | webpack-bundle-analyzer |
| Time to Interactive | TBD | <3s | Lighthouse |
| First Contentful Paint | TBD | <1s | Lighthouse |
| Lighthouse Performance Score | TBD | >90 | Lighthouse |
| Number of requests on initial load | TBD | <15 | Chrome DevTools Network |

We will consider this implementation successful when all target metrics are achieved. 