/**
 * BrowserStack configuration for running tests on real devices
 */

// @ts-check
const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './',
  timeout: 60000,
  retries: 1,
  workers: 5,
  reporter: [
    ['html', { open: 'never', outputFolder: require('path').join(__dirname, '../../docs/project_lifecycle/all_tests/results/playwright-test') }],
    ['list']
  ],
  
  // BrowserStack-specific settings
  use: {
    // Base URL should be set to the deployed app URL
    baseURL: process.env.BASE_URL || 'https://staging.tourguideai.com',
    
    // BrowserStack connection details
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=
        ${encodeURIComponent(JSON.stringify({
          browser: 'playwright-${browserName}',
          os: 'Windows',
          os_version: '10',
          build: 'TourGuideAI-Build-${process.env.BUILD_NUMBER || new Date().toISOString()}',
          name: 'TourGuideAI-CrossBrowser-Tests',
          'browserstack.username': process.env.BROWSERSTACK_USERNAME,
          'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
          'browserstack.console': 'verbose',
          'browserstack.networkLogs': true
      }))}`,
    },
    
    // Capture screenshots and traces
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'on',
  },
  
  projects: [
    // Desktop browsers
    {
      name: 'Chrome Windows',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Firefox Windows',
      use: {
        browserName: 'firefox',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Safari Mac',
      use: {
        browserName: 'webkit',
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile devices
    {
      name: 'iPhone 12',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Samsung Galaxy S21',
      use: {
        ...devices['Galaxy S21 Ultra'],
      },
    },
    {
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],
};

module.exports = config; 