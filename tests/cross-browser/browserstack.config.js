/**
 * BrowserStack Configuration
 * 
 * Configuration file for running cross-browser tests using BrowserStack Automate.
 * This is designed to work with Jest and Playwright for cross-browser testing.
 */

const browserMatrix = require('./browser-test-matrix');

// Get credentials from environment variables
const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME || 'REPLACE_WITH_YOUR_USERNAME';
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY || 'REPLACE_WITH_YOUR_ACCESS_KEY';

// Base capabilities for all tests
const baseCapabilities = {
  'browserstack.user': BROWSERSTACK_USERNAME,
  'browserstack.key': BROWSERSTACK_ACCESS_KEY,
  'browserstack.debug': true,
  'browserstack.console': 'verbose',
  'browserstack.networkLogs': true,
  'project': 'TourGuideAI',
  'build': `Build ${process.env.BUILD_NUMBER || 'Local'}`,
};

// Generate capabilities for desktop browsers
const desktopCapabilities = browserMatrix.desktop.flatMap(browser => {
  return browser.versions.flatMap(version => {
    return browser.os.map(os => ({
      ...baseCapabilities,
      'browserName': browser.browserName,
      'browser_version': version,
      'os': os.split(' ')[0],
      'os_version': os.split(' ')[1] || '',
      'name': `${browser.browserName} ${version} on ${os}`,
    }));
  });
});

// Generate capabilities for mobile devices
const mobileCapabilities = browserMatrix.mobile.map(device => ({
  ...baseCapabilities,
  'device': device.deviceName,
  'os_version': device.osVersion,
  'real_mobile': true,
  'name': `${device.deviceName} on iOS/Android ${device.osVersion}`,
}));

// Combine all capabilities
const capabilities = [...desktopCapabilities, ...mobileCapabilities];

module.exports = {
  // BrowserStack connection details
  connection: {
    username: BROWSERSTACK_USERNAME,
    accessKey: BROWSERSTACK_ACCESS_KEY,
    browserstackLocal: true,
  },
  
  // Capabilities for different platforms
  capabilities,
  
  // Test specifications
  specs: [
    './tests/cross-browser/specs/**/*.spec.js',
  ],
  
  // Timeouts
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  // Hooks
  before: function (capabilities, specs) {
    // Setup before tests run
    console.log(`Running tests on ${capabilities.browserName || capabilities.device}`);
  },
  
  // Reporting
  reporters: ['spec', ['junit', {
    outputDir: './test-results/browserstack',
    outputFileFormat: function(options) {
      return `results-${options.capabilities.browserName || options.capabilities.device}.xml`;
    }
  }]],
}; 