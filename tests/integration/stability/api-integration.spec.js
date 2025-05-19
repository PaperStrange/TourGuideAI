/**
 * API Integration Stability Tests
 * 
 * This suite focuses on the stability of API integrations between frontend and backend,
 * testing how the application behaves under various network conditions and edge cases.
 */

const { test, expect } = require('@playwright/test');
const { 
  setupMockApi,
  waitForNetworkIdle,
  verifyApiCalls
} = require('../utils/test-helpers');
const apiMocks = require('../mocks/api-responses');

test.describe('API Integration Stability', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to travel planning page
    await page.goto('/travel-planning');
    await waitForNetworkIdle(page);
  });
  
  test('should handle slow network responses gracefully', async ({ page }) => {
    // Set up delayed mock responses
    await page.route('**/api/route/analyze', async (route) => {
      // Add artificial delay of 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiMocks['api/route/analyze'].body)
      });
    });
    
    // Enter travel query
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris for 3 days');
    
    // Click analyze button
    await page.click('[data-testid="analyze-button"]');
    
    // Verify loading indicator appears
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Wait for intent analysis to complete despite the delay
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible({ timeout: 5000 });
    
    // Verify UI was responsive during the delay (button should be disabled)
    expect(await page.locator('[data-testid="analyze-button"]').isDisabled()).toBeTruthy();
    
    // After loading completes, button should be enabled again
    expect(await page.locator('[data-testid="generate-button"]').isDisabled()).toBeFalsy();
  });
  
  test('should recover from network errors with retry', async ({ page }) => {
    // Mock a failed response followed by a successful one
    let firstAttempt = true;
    
    await page.route('**/api/route/generate', async (route) => {
      if (firstAttempt) {
        firstAttempt = false;
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify(apiMocks['api/error'].body)
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiMocks['api/route/generate'].body)
        });
      }
    });
    
    // Complete the flow until generate route
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris for 3 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    
    // This should fail on first attempt
    await page.click('[data-testid="generate-button"]');
    
    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Click retry button
    await page.click('[data-testid="retry-button"]');
    
    // Second attempt should succeed
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
  });
  
  test('should handle concurrent API requests correctly', async ({ page }) => {
    // Track API calls
    const apiCalls = {
      analyze: 0,
      generate: 0
    };
    
    // Setup tracking
    await page.route('**/api/route/analyze', async (route) => {
      apiCalls.analyze++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiMocks['api/route/analyze'].body)
      });
    });
    
    await page.route('**/api/route/generate', async (route) => {
      apiCalls.generate++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiMocks['api/route/generate'].body)
      });
    });
    
    // Fill query and trigger both analyze and generate in quick succession
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris');
    await page.click('[data-testid="analyze-button"]');
    
    // Wait just a bit (but not for completion) and click generate
    await page.waitForTimeout(200);
    await page.click('[data-testid="generate-button"]');
    
    // Wait for both operations to complete
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Verify both API calls were made exactly once
    expect(apiCalls.analyze, 'analyze API should be called exactly once').toBe(1);
    expect(apiCalls.generate, 'generate API should be called exactly once').toBe(1);
  });
  
  test('should handle different response sizes gracefully', async ({ page }) => {
    // Create a large response with many stops
    const largeResponse = JSON.parse(JSON.stringify(apiMocks['api/route/generate'].body));
    
    // Add 50 more stops to the route
    for (let i = 0; i < 50; i++) {
      largeResponse.stops.push({
        id: `stop-${i + 4}`,
        name: `Stop ${i + 4}`,
        location: { lat: 48.8584 + (i * 0.001), lng: 2.2945 + (i * 0.001) },
        description: `Description for stop ${i + 4}`,
        visitDuration: 60,
        openingHours: '9:00 AM - 5:00 PM',
        dayIndex: Math.floor(i / 5) + 1,
        timeSlot: `${9 + (i % 8)}:00 AM`
      });
    }
    
    // Mock with large response
    await page.route('**/api/route/generate', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeResponse)
      });
    });
    
    // Run through the workflow
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris for 10 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    await page.click('[data-testid="generate-button"]');
    
    // Verify route preview loads successfully despite large response
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Verify we don't have performance degradation with large payloads
    await page.waitForSelector('[data-testid="route-preview"]', { state: 'visible', timeout: 5000 });
  });
  
  test('should maintain state during page navigation', async ({ page }) => {
    // Set up initial route flow
    await setupMockApi(page, apiMocks);
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris for 3 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Get route name before navigation
    const routeNameBeforeNavigation = await page.locator('[data-testid="route-preview"] h2').textContent();
    
    // Navigate to user profile page and back
    await page.click('[data-testid="nav-profile"]');
    await waitForNetworkIdle(page);
    await page.click('[data-testid="nav-planner"]');
    await waitForNetworkIdle(page);
    
    // Verify route is still displayed
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Verify route name is preserved
    const routeNameAfterNavigation = await page.locator('[data-testid="route-preview"] h2').textContent();
    expect(routeNameAfterNavigation).toEqual(routeNameBeforeNavigation);
  });
  
  test('should handle offline mode gracefully', async ({ page }) => {
    // Complete the initial flow
    await setupMockApi(page, apiMocks);
    await page.fill('[data-testid="query-input"]', 'I want to visit Paris for 3 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Simulate going offline
    await page.context().setOffline(true);
    
    // Try to save the route
    await page.click('[data-testid="save-route-button"]');
    
    // Verify offline indicator appears
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Verify appropriate message is shown
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('currently offline');
    
    // Simulate going back online
    await page.context().setOffline(false);
    
    // Try again to save
    await page.click('[data-testid="retry-save-button"]');
    
    // Verify save succeeds
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
}); 