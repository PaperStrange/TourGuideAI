/**
 * Route Generation Performance Tests
 * 
 * This suite focuses on measuring performance metrics for the route generation
 * feature, testing both frontend rendering and backend API response times.
 */

const { test, expect } = require('@playwright/test');
const { 
  collectPerformanceMetrics, 
  savePerformanceMetrics,
  setupMockApi,
  waitForNetworkIdle,
  verifyApiCalls
} = require('../utils/test-helpers');
const apiMocks = require('../mocks/api-responses');

// Test queries with varying complexity
const testQueries = [
  { 
    text: 'I want to visit Paris for 3 days', 
    complexity: 'simple',
    expectedStops: 3
  },
  { 
    text: 'I want to visit Paris for 7 days with my family, focusing on museums and historical sites', 
    complexity: 'medium',
    expectedStops: 7
  },
  { 
    text: 'I need a 10-day trip to Paris, Rome, and Barcelona, with time for food tours, museum visits, and shopping. We will be traveling with children and need child-friendly activities.', 
    complexity: 'complex',
    expectedStops: 15
  }
];

test.describe('Route Generation Performance', () => {
  // Store metrics for all tests
  const allMetrics = {
    simple: {},
    medium: {},
    complex: {},
  };
  
  // Define acceptable thresholds
  const thresholds = {
    routeGenerationTime: {
      simple: 2000,   // 2 seconds for simple routes
      medium: 3500,   // 3.5 seconds for medium routes
      complex: 5000,  // 5 seconds for complex routes
    },
    renderingTime: {
      simple: 500,    // 500ms rendering for simple routes
      medium: 1000,   // 1s rendering for medium routes
      complex: 1500,  // 1.5s rendering for complex routes
    },
    apiResponseTime: {
      simple: 1500,   // 1.5s API response for simple routes
      medium: 2500,   // 2.5s API response for medium routes
      complex: 3500,  // 3.5s API response for complex routes
    }
  };
  
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupMockApi(page, apiMocks);
    
    // Navigate to travel planning page
    await page.goto('/travel-planning');
    await waitForNetworkIdle(page);
  });
  
  // Define a test for each complexity level
  for (const query of testQueries) {
    test(`should generate ${query.complexity} route within performance budget`, async ({ page }) => {
      // Collect initial metrics
      const initialMetrics = await collectPerformanceMetrics(page);
      allMetrics[query.complexity].initial = initialMetrics;
      
      // Record start time for API timing
      const apiStartTime = Date.now();
      
      // Enter travel query
      await page.fill('[data-testid="query-input"]', query.text);
      
      // Click analyze button
      await page.click('[data-testid="analyze-button"]');
      
      // Wait for intent analysis to complete
      await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
      
      // Collect metrics after intent analysis
      const intentAnalysisMetrics = await collectPerformanceMetrics(page);
      allMetrics[query.complexity].intentAnalysis = intentAnalysisMetrics;
      
      // Click generate route button
      const generateStartTime = Date.now();
      await page.click('[data-testid="generate-button"]');
      
      // Verify API call was made to generate the route
      await verifyApiCalls(page, 'api/route/generate', { 
        minCount: 1, 
        maxCount: 2,
        method: 'POST' 
      });
      
      // Wait for route preview to be displayed
      await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
      const generateEndTime = Date.now();
      
      // Record API response time
      const apiResponseTime = generateEndTime - apiStartTime;
      allMetrics[query.complexity].apiResponseTime = apiResponseTime;
      
      // Collect metrics after route generation
      const routeGenerationMetrics = await collectPerformanceMetrics(page);
      allMetrics[query.complexity].routeGeneration = routeGenerationMetrics;
      
      // Calculate key metrics
      const routeGenerationTime = generateEndTime - generateStartTime;
      const renderingTime = routeGenerationMetrics.domComplete - initialMetrics.domComplete;
      
      // Store calculated metrics
      allMetrics[query.complexity].routeGenerationTime = routeGenerationTime;
      allMetrics[query.complexity].renderingTime = renderingTime;
      
      // Log metrics for this test
      console.log(`--- ${query.complexity} Route Generation Performance Metrics ---`);
      console.log(`API Response Time: ${apiResponseTime}ms`);
      console.log(`Route Generation Time: ${routeGenerationTime}ms`);
      console.log(`Rendering Time: ${renderingTime}ms`);
      console.log(`First Paint: ${routeGenerationMetrics.firstPaint}ms`);
      console.log(`First Contentful Paint: ${routeGenerationMetrics.firstContentfulPaint}ms`);
      console.log(`Page Load Time: ${routeGenerationMetrics.pageLoadTime}ms`);
      console.log(`DOM Interactive: ${routeGenerationMetrics.domInteractive}ms`);
      
      // Save metrics to file
      savePerformanceMetrics(allMetrics[query.complexity], `route-generation-${query.complexity}`);
      
      // Assert that metrics are within acceptable thresholds
      expect(routeGenerationTime, `${query.complexity} route generation should be under threshold`).toBeLessThan(thresholds.routeGenerationTime[query.complexity]);
      expect(renderingTime, `${query.complexity} rendering should be under threshold`).toBeLessThan(thresholds.renderingTime[query.complexity]);
      expect(apiResponseTime, `${query.complexity} API response should be under threshold`).toBeLessThan(thresholds.apiResponseTime[query.complexity]);
    });
  }
  
  test('should perform consistently across multiple route generations', async ({ page }) => {
    const iterations = 5;
    const metrics = [];
    const query = testQueries[0]; // Use the simple query for consistency test
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Iteration ${i + 1} of ${iterations}`);
      
      // Navigate to travel planning page for each iteration
      await page.goto('/travel-planning');
      await waitForNetworkIdle(page);
      
      // Enter travel query
      await page.fill('[data-testid="query-input"]', query.text);
      
      // Click analyze button
      await page.click('[data-testid="analyze-button"]');
      
      // Wait for intent analysis to complete
      await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
      
      // Click generate route button and measure time
      const startTime = Date.now();
      await page.click('[data-testid="generate-button"]');
      
      // Wait for route preview to be displayed
      await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
      const endTime = Date.now();
      
      // Calculate generation time
      const generationTime = endTime - startTime;
      metrics.push(generationTime);
      
      console.log(`Generation time for iteration ${i + 1}: ${generationTime}ms`);
    }
    
    // Calculate statistics
    const average = metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);
    const variance = metrics.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / metrics.length;
    const stdDev = Math.sqrt(variance);
    
    // Log statistics
    console.log('--- Route Generation Consistency Metrics ---');
    console.log(`Average generation time: ${average.toFixed(2)}ms`);
    console.log(`Min generation time: ${min}ms`);
    console.log(`Max generation time: ${max}ms`);
    console.log(`Standard deviation: ${stdDev.toFixed(2)}ms`);
    
    // Save consistency metrics
    savePerformanceMetrics({
      iterations,
      metrics,
      average,
      min,
      max,
      stdDev,
      variance
    }, 'route-generation-consistency');
    
    // Assert on consistency metrics
    expect(stdDev, 'Standard deviation should be less than 25% of average').toBeLessThan(average * 0.25);
    expect(max - min, 'Range should be less than 50% of average').toBeLessThan(average * 0.5);
  });
}); 