/**
 * Browser Test Matrix Configuration
 * 
 * This file defines the browsers and devices to be used for cross-browser testing
 * with BrowserStack integration.
 */

module.exports = {
  // Desktop browsers
  desktop: [
    {
      browserName: 'Chrome',
      versions: ['latest', 'latest-1'],
      os: ['Windows 10', 'macOS Monterey'],
    },
    {
      browserName: 'Firefox',
      versions: ['latest', 'latest-1'],
      os: ['Windows 10', 'macOS Monterey'],
    },
    {
      browserName: 'Edge',
      versions: ['latest'],
      os: ['Windows 10'],
    },
    {
      browserName: 'Safari',
      versions: ['latest', 'latest-1'],
      os: ['macOS Monterey'],
    },
  ],
  
  // Mobile devices
  mobile: [
    {
      deviceName: 'iPhone 13',
      osVersion: '15',
    },
    {
      deviceName: 'iPhone 11',
      osVersion: '14',
    },
    {
      deviceName: 'Samsung Galaxy S21',
      osVersion: '11.0',
    },
    {
      deviceName: 'Google Pixel 5',
      osVersion: '12.0',
    },
  ],
  
  // Critical flows to test on all browser/device combinations
  criticalFlows: [
    'authentication',
    'route-creation',
    'map-interaction',
    'offline-capability',
    'responsive-layout',
  ],
  
  // Feature-specific browser requirements
  featureRequirements: {
    'geolocation': ['Chrome >= 50', 'Firefox >= 55', 'Safari >= 11', 'Edge >= 16'],
    'service-worker': ['Chrome >= 45', 'Firefox >= 44', 'Safari >= 11.1', 'Edge >= 17'],
    'webp-support': ['Chrome >= 32', 'Firefox >= 65', 'Safari >= 14', 'Edge >= 18'],
  },
}; 