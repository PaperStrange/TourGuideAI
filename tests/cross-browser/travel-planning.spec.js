const { test, expect } = require('@playwright/test');

test.describe('Travel Planning Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    // Navigate to travel planning
    await page.click('[data-testid="travel-planning-link"]');
    
    // Verify travel planning page is loaded
    await expect(page.locator('h1')).toContainText('Plan Your Journey');
  });
  
  test('should generate a route from user query', async ({ page }) => {
    // Enter a travel query
    await page.fill('[data-testid="travel-query-input"]', 'I want to visit Tokyo for 5 days and see Mt. Fuji');
    
    // Click the analyze button
    await page.click('[data-testid="analyze-query-button"]');
    
    // Verify intent analysis appears
    await expect(page.locator('[data-testid="intent-analysis-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="intent-destination"]')).toContainText('Tokyo');
    await expect(page.locator('[data-testid="intent-duration"]')).toContainText('5 days');
    
    // Generate the route
    await page.click('[data-testid="generate-route-button"]');
    
    // Wait for route generation (may take time)
    await expect(page.locator('[data-testid="route-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible({ timeout: 30000 });
    
    // Verify route details are displayed
    await expect(page.locator('[data-testid="route-title"]')).toContainText('Tokyo');
    await expect(page.locator('[data-testid="route-duration"]')).toContainText('5');
    
    // Verify Mt. Fuji is included as the user requested
    await page.click('[data-testid="highlights-section-header"]');
    await expect(page.locator('[data-testid="highlights-list"]')).toContainText('Fuji');
  });
  
  test('should save and edit a route', async ({ page }) => {
    // Generate a random route
    await page.click('[data-testid="surprise-me-button"]');
    
    // Wait for route generation
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible({ timeout: 30000 });
    
    // Save the route
    const routeTitle = await page.locator('[data-testid="route-title"]').textContent();
    await page.click('[data-testid="save-route-button"]');
    
    // Verify success notification
    await expect(page.locator('[data-testid="notification"]')).toContainText('saved');
    
    // Go to edit itinerary
    await page.click('[data-testid="edit-itinerary-button"]');
    
    // Wait for itinerary builder to load
    await expect(page.locator('[data-testid="itinerary-builder"]')).toBeVisible();
    
    // Edit the route title
    await page.click('[data-testid="edit-title-button"]');
    await page.fill('[data-testid="title-input"]', 'My Custom Adventure');
    await page.click('[data-testid="save-title-button"]');
    
    // Add a new activity
    await page.click('[data-testid="add-activity-button"]:first-of-type');
    await page.fill('[data-testid="activity-name-input"]', 'Local Food Tour');
    await page.fill('[data-testid="activity-desc-input"]', 'Experience local cuisine');
    await page.fill('[data-testid="activity-time-input"]', '18:00');
    await page.click('[data-testid="save-activity-button"]');
    
    // Verify activity was added
    await expect(page.locator('text=Local Food Tour')).toBeVisible();
    
    // Return to preview
    await page.click('[data-testid="back-to-preview-button"]');
    
    // Verify the title was updated
    await expect(page.locator('[data-testid="route-title"]')).toContainText('My Custom Adventure');
  });
  
  test('should allow adding to favorites and viewing favorite routes', async ({ page }) => {
    // Generate a route
    await page.click('[data-testid="surprise-me-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible({ timeout: 30000 });
    
    // Save the route
    await page.click('[data-testid="save-route-button"]');
    
    // Add to favorites
    await page.click('[data-testid="favorite-button"]');
    
    // Verify favorite status changed
    await expect(page.locator('[data-testid="favorite-button"]')).toContainText('Favorited');
    
    // Navigate to saved routes
    await page.click('[data-testid="saved-routes-link"]');
    
    // Go to favorites tab
    await page.click('[data-testid="favorites-tab"]');
    
    // Verify route appears in favorites
    await expect(page.locator('[data-testid="route-card"]')).toBeVisible();
  });
  
  test('should show error gracefully when route generation fails', async ({ page }) => {
    // Intercept the route generation API call to simulate failure
    await page.route('**/api/routes/generate', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Server error during route generation'
        })
      });
    });
    
    // Enter a travel query
    await page.fill('[data-testid="travel-query-input"]', 'I want to go to space');
    
    // Try to generate a route
    await page.click('[data-testid="generate-route-button"]');
    
    // Verify error is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('error');
    
    // Verify retry button is present
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
  
  test('itinerary builder should validate user input', async ({ page }) => {
    // Generate and save a route
    await page.click('[data-testid="surprise-me-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible({ timeout: 30000 });
    await page.click('[data-testid="save-route-button"]');
    
    // Go to edit itinerary
    await page.click('[data-testid="edit-itinerary-button"]');
    
    // Try to add activity with empty fields
    await page.click('[data-testid="add-activity-button"]:first-of-type');
    await page.click('[data-testid="save-activity-button"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toContainText('required');
    
    // Add required field and try again
    await page.fill('[data-testid="activity-name-input"]', 'Valid Activity');
    await page.click('[data-testid="save-activity-button"]');
    
    // Verify activity is added
    await expect(page.locator('text=Valid Activity')).toBeVisible();
  });
  
  test('should work across mobile, tablet, and desktop screen sizes', async ({ page }) => {
    // Test on mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu and navigate to travel planning
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="travel-planning-link-mobile"]');
    
    // Generate a route
    await page.fill('[data-testid="travel-query-input"]', 'Weekend in Paris');
    await page.click('[data-testid="generate-route-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible({ timeout: 30000 });
    
    // Verify responsive elements display correctly
    await expect(page.locator('[data-testid="mobile-accordion"]')).toBeVisible();
    
    // Test on tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tablet layout differences
    await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
    
    // Test on desktop size
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Verify desktop layout
    await expect(page.locator('[data-testid="desktop-split-view"]')).toBeVisible();
  });
}); 