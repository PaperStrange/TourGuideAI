/**
 * Playwright configuration for cross-browser testing
 * @see https://playwright.dev/docs/test-configuration
 */

// @ts-check
const { devices } = require('@playwright/test');
const path = require('path');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: path.join(__dirname, '../../docs/project_lifecycle/all_tests/results/playwright-test')
    }],
    ['list']
  ],
  
  use: {
    actionTimeout: 15000,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  
  projects: [
    // Desktop browsers
    {
      name: 'Chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Tablet Safari',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
    
    // Different viewports
    {
      name: 'Small Desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
};

module.exports = config; 