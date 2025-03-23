/**
 * Playwright Configuration for Cross-Browser Testing
 */

const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: 'specs',
  timeout: 30000,
  expect: {
    timeout: 15000,
  },
  
  /* Maximum time in milliseconds the whole test suite can run */
  globalTimeout: 600000,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit-report.xml' }],
  ],
  
  /* Configure projects for browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
    
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
    
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
    
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
  ],
  
  /* Base URL to use in actions like `await page.goto('/')`. */
  webServer: process.env.CI ? undefined : {
    command: 'npm run start',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: true,
  },
};

module.exports = config; 