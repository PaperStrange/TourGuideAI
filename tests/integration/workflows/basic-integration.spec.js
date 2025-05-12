/**
 * Basic Integration Test
 * 
 * This test validates the basic integration testing approach with mock mode.
 */

const { test, expect } = require('@playwright/test');
const { setupMockMode } = require('../utils/test-setup');

test.describe('Basic Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock mode
    await setupMockMode(page);
    
    // Navigate to travel planning page
    await page.goto('/travel-planning');
  });
  
  test('should display travel planning page with form elements', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Travel Planning/);
    
    // Check form elements
    await expect(page.locator('[data-testid="query-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyze-button"]')).toBeVisible();
  });
  
  test('should show intent analysis after clicking analyze button', async ({ page }) => {
    // Enter query
    await page.fill('[data-testid="query-input"]', 'Paris for 3 days');
    
    // Verify text was entered
    await expect(page.locator('[data-testid="query-input"]')).toHaveValue('Paris for 3 days');
    
    // Trigger analysis by clicking analyze button
    await page.click('[data-testid="analyze-button"]');
    
    // Verify intent analysis appears
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
  });
  
  test('should show route preview after clicking generate button', async ({ page }) => {
    // Fill form and analyze
    await page.fill('[data-testid="query-input"]', 'Paris for 3 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    
    // Generate route
    await page.click('[data-testid="generate-button"]');
    
    // Verify route preview
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-route-button"]')).toBeVisible();
  });
  
  test('should open itinerary editor when edit button is clicked', async ({ page }) => {
    // Get to route preview
    await page.fill('[data-testid="query-input"]', 'Paris for 3 days');
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // Click edit button
    await page.click('[data-testid="edit-button"]');
    
    // Verify editor appears
    await expect(page.locator('[data-testid="itinerary-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-activity-button"]')).toBeVisible();
  });
  
  test('should navigate to different pages through navigation', async ({ page }) => {
    // Go to home page
    await page.click('[data-testid="nav-home"]');
    
    // Verify home page elements
    await expect(page.locator('[data-testid="explore-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-trip-button"]')).toBeVisible();
    
    // Go to saved routes
    await page.click('[data-testid="nav-saved-routes"]');
    
    // Verify saved routes page
    await expect(page.locator('[data-testid="saved-routes-list"]')).toBeVisible();
  });
}); 