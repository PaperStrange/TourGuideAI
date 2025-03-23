/**
 * Route Creation Cross-Browser Test
 * 
 * Tests the route creation flow across different browsers and devices.
 */

const { test, expect } = require('@playwright/test');

test.describe('Route Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page and log in before each test
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    
    // Fill in login form with test credentials
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123');
    await page.click('[data-testid="submit-login"]');
    
    // Verify logged in state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Navigate to route creation page
    await page.click('[data-testid="create-route-button"]');
    await expect(page).toHaveURL(/.*\/create-route/);
  });

  test('should create a new travel route with basic options', async ({ page }) => {
    // Fill in the route creation form
    await page.fill('[data-testid="destination-input"]', 'Paris, France');
    await page.fill('[data-testid="duration-input"]', '7');
    
    // Select interests
    await page.click('[data-testid="interest-museums"]');
    await page.click('[data-testid="interest-food"]');
    await page.click('[data-testid="interest-history"]');
    
    // Set budget
    await page.click('[data-testid="budget-medium"]');
    
    // Submit form
    await page.click('[data-testid="generate-route-button"]');
    
    // Wait for route generation to complete
    await expect(page.locator('[data-testid="route-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-results"]')).toBeVisible({ timeout: 30000 });
    
    // Verify route was created
    await expect(page.locator('[data-testid="route-title"]')).toContainText('Paris');
    await expect(page.locator('[data-testid="route-days"]')).toContainText('7');
    
    // Verify map is displayed
    await expect(page.locator('[data-testid="route-map"]')).toBeVisible();
    
    // Verify daily itinerary exists
    await expect(page.locator('[data-testid="daily-itinerary"]')).toBeVisible();
    await expect(page.locator('[data-testid="day-item"]')).toHaveCount(7);
  });

  test('should handle errors gracefully when API fails', async ({ page }) => {
    // Fill in the route creation form
    await page.fill('[data-testid="destination-input"]', 'ERROR_TRIGGER_LOCATION');
    await page.fill('[data-testid="duration-input"]', '3');
    
    // Select interests
    await page.click('[data-testid="interest-adventure"]');
    
    // Set budget
    await page.click('[data-testid="budget-high"]');
    
    // Submit form
    await page.click('[data-testid="generate-route-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to generate route');
    
    // Verify retry button is visible
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.click('[data-testid="retry-button"]');
    
    // Verify form is displayed again with previously entered values
    await expect(page.locator('[data-testid="destination-input"]')).toHaveValue('ERROR_TRIGGER_LOCATION');
    await expect(page.locator('[data-testid="duration-input"]')).toHaveValue('3');
  });

  test('should maintain responsive layout on different viewports', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Fill in the route creation form for mobile
    await page.fill('[data-testid="destination-input"]', 'London, UK');
    await page.fill('[data-testid="duration-input"]', '5');
    
    // Verify mobile form layout
    await expect(page.locator('[data-testid="mobile-form-layout"]')).toBeVisible();
    
    // Switch to tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tablet form layout
    await expect(page.locator('[data-testid="tablet-form-layout"]')).toBeVisible();
    
    // Switch to desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Verify desktop form layout
    await expect(page.locator('[data-testid="desktop-form-layout"]')).toBeVisible();
    
    // Complete and submit the form
    await page.click('[data-testid="interest-landmarks"]');
    await page.click('[data-testid="budget-low"]');
    await page.click('[data-testid="generate-route-button"]');
    
    // Wait for route generation to complete
    await expect(page.locator('[data-testid="route-results"]')).toBeVisible({ timeout: 30000 });
    
    // Verify responsive results layout on desktop
    await expect(page.locator('[data-testid="desktop-results-layout"]')).toBeVisible();
    
    // Test mobile results layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-results-layout"]')).toBeVisible();
  });
}); 