/**
 * Integration Test Helpers
 * 
 * This module provides utility functions for integration tests combining
 * frontend and backend testing with performance and stability measurements.
 */

const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Performance metrics collection helper
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<Object>} - Performance metrics
 */
async function collectPerformanceMetrics(page) {
  return await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('navigation');
    const paintEntries = performance.getEntriesByType('paint');
    
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime;
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;
    
    const navigationEntry = perfEntries[0];
    
    return {
      // Navigation timing
      navigationStart: navigationEntry.startTime,
      loadEventEnd: navigationEntry.loadEventEnd,
      domContentLoaded: navigationEntry.domContentLoadedEventEnd,
      
      // Paint timing
      firstPaint,
      firstContentfulPaint,
      
      // Resource metrics
      resourceCount: performance.getEntriesByType('resource').length,
      
      // Connection metrics
      dnsLookup: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
      tcpConnection: navigationEntry.connectEnd - navigationEntry.connectStart,
      
      // Document metrics
      domInteractive: navigationEntry.domInteractive,
      domComplete: navigationEntry.domComplete,
      
      // Total page load
      pageLoadTime: navigationEntry.loadEventEnd - navigationEntry.startTime,
      
      // Memory usage if available
      memory: performance.memory ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      } : null
    };
  }).catch(err => {
    console.error('Error collecting performance metrics:', err);
    return { error: err.message };
  });
}

/**
 * Save performance metrics to a JSON file
 * @param {Object} metrics - Performance metrics
 * @param {string} testName - Test name
 */
function savePerformanceMetrics(metrics, testName) {
  const resultsDir = path.join(__dirname, '../../../docs/project_lifecycle/all_tests/results/performance');
  
  // Ensure directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const fileName = `${testName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
  const filePath = path.join(resultsDir, fileName);
  
  // Add system info
  metrics.systemInfo = {
    platform: os.platform(),
    release: os.release(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length
  };
  
  // Add timestamp
  metrics.timestamp = new Date().toISOString();
  
  fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
  console.log(`Performance metrics saved to ${filePath}`);
  
  return filePath;
}

/**
 * Setup mock REST API for integration tests
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Object} mocks - API mocks configuration
 */
async function setupMockApi(page, mocks) {
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    
    // Find matching mock for this route
    const matchingMock = Object.entries(mocks).find(([pattern]) => {
      return new RegExp(pattern).test(url);
    });
    
    if (matchingMock) {
      const [_, mockResponse] = matchingMock;
      
      route.fulfill({
        status: mockResponse.status || 200,
        contentType: mockResponse.contentType || 'application/json',
        body: JSON.stringify(mockResponse.body || {})
      });
    } else {
      console.warn(`No mock found for URL: ${url}`);
      route.continue();
    }
  });
}

/**
 * Wait for network connections to be idle
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {number} timeout - Timeout in ms
 */
async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Verify API requests were made correctly
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} urlPattern - URL pattern to match
 * @param {Object} options - Options
 */
async function verifyApiCalls(page, urlPattern, options = {}) {
  const { minCount = 1, maxCount = null, method = null, timeout = 5000 } = options;
  
  const requests = [];
  
  // Setup listener for future requests
  const listener = request => {
    if (new RegExp(urlPattern).test(request.url())) {
      if (!method || request.method() === method) {
        requests.push(request);
      }
    }
  };
  
  page.on('request', listener);
  
  // Wait for timeout or until we have maxCount matches
  await new Promise(resolve => {
    const timer = setTimeout(resolve, timeout);
    
    if (maxCount) {
      const checkInterval = setInterval(() => {
        if (requests.length >= maxCount) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
  
  page.off('request', listener);
  
  // Verify request count is within expected range
  expect(requests.length, `Expected between ${minCount} and ${maxCount || 'unlimited'} API calls to ${urlPattern}`).toBeGreaterThanOrEqual(minCount);
  
  if (maxCount !== null) {
    expect(requests.length, `Expected between ${minCount} and ${maxCount} API calls to ${urlPattern}`).toBeLessThanOrEqual(maxCount);
  }
  
  return requests;
}

module.exports = {
  collectPerformanceMetrics,
  savePerformanceMetrics,
  setupMockApi,
  waitForNetworkIdle,
  verifyApiCalls
}; 