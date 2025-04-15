/**
 * Cross-Browser Test Suite
 * 
 * This file runs cross-browser tests using the new configuration structure.
 */

const { test, expect } = require('@playwright/test');

// Import the configuration based on the environment
const config = process.env.USE_BROWSERSTACK 
  ? require('../config/browserstack/cross-browser.config')
  : require('../config/playwright/cross-browser.config');

// Tell the test runner to use our configuration
test.use(config);

// Test scenarios
test.describe('Cross-browser travel planning functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto('/');
  });

  test('Header and navigation render properly', async ({ page }) => {
    // Check main elements are visible
    await expect(page.locator('text=Welcome to TourGuideAI')).toBeVisible();
    
    // Verify navigation links
    const navLinks = page.locator('a.feature-button');
    await expect(navLinks).toHaveCount(3);
  });

  test('Chat page form controls adapt to browser size', async ({ page, browserName }) => {
    // Navigate to chat page
    await page.click('text=Start Planning');
    
    // Check input field
    const inputBox = page.locator('.input-box');
    await expect(inputBox).toBeVisible();
    
    // Test form control responsiveness (should be at least 1/3 of viewport width)
    const inputBoxBoundingBox = await inputBox.boundingBox();
    const viewportSize = page.viewportSize();
    
    expect(inputBoxBoundingBox.width).toBeGreaterThan(viewportSize.width * 0.3);
    
    // Browser-specific checks
    if (browserName === 'webkit') {
      test.info().annotations.push({ type: 'Safari specific', description: 'Checking Safari-specific styling' });
      // Safari has custom styling for inputs that we verify here
      await expect(inputBox).toHaveCSS('appearance', 'none');
    }
  });

  test('Map component renders across browsers', async ({ page, browserName }) => {
    // Navigate to map page
    await page.click('text=Open Map');
    
    // Wait for map to load (longer timeout for mobile browsers)
    await expect(page.locator('#map-container')).toBeVisible({ timeout: 15000 });
    
    // Verify map controls render
    await expect(page.locator('.map-controls')).toBeVisible();
    
    // Test map resizing behavior
    if (browserName === 'firefox') {
      test.info().annotations.push({ type: 'Firefox specific', description: 'Checking Firefox-specific rendering' });
      // Firefox handles canvas elements differently, check for correct rendering
      const mapCanvas = page.locator('#map-container canvas');
      await expect(mapCanvas).toBeVisible();
    }
  });

  test('Touch interactions work properly', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }
    
    // Navigate to map page where touch interactions are critical
    await page.click('text=Open Map');
    
    // Wait for map to load
    await expect(page.locator('#map-container')).toBeVisible({ timeout: 15000 });
    
    // Test pinch-to-zoom simulation (simplified)
    await page.touchscreen.tap(200, 200);
    
    // Verify route elements are touchable
    const routePoint = page.locator('.route-point').first();
    await routePoint.tap();
    
    // Check if tapping shows info window
    await expect(page.locator('.info-window')).toBeVisible({ timeout: 5000 });
  });

  test('Responsive layout adapts to screen size', async ({ page, viewport }) => {
    // Capture viewport dimensions for reporting
    test.info().annotations.push({ 
      type: 'Viewport', 
      description: `Testing at ${viewport.width}x${viewport.height}` 
    });
    
    // Verify page structure adapts to viewport
    if (viewport.width < 768) {
      // Mobile layout checks
      await expect(page.locator('.feature-cards')).toHaveCSS('flex-direction', 'column');
    } else {
      // Desktop layout checks
      await expect(page.locator('.feature-cards')).toHaveCSS('flex-direction', 'row');
    }
    
    // Navigate to profile page and check responsive behavior
    await page.click('text=View Profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile elements adapt
    const profileSection = page.locator('.profile-section');
    await expect(profileSection).toBeVisible();
    
    // Check container width is appropriate for viewport
    const profileBox = await profileSection.boundingBox();
    expect(profileBox.width).toBeLessThanOrEqual(viewport.width);
  });

  test('Font rendering is consistent', async ({ page, browserName }) => {
    // Different browsers render fonts differently, but headings should be visible
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    
    // Check font-family is applied
    await expect(mainHeading).toHaveCSS('font-family', /'Roboto'|'sans-serif'/);
    
    // Browser-specific font checks
    if (browserName === 'webkit') {
      // Safari has different font smoothing
      await expect(mainHeading).toHaveCSS('-webkit-font-smoothing', 'antialiased');
    }
  });

  test('Service worker compatibility', async ({ page, browserName }) => {
    // Skip for browsers that might have service worker limitations
    if (browserName === 'firefox' && page.viewportSize().width < 768) {
      test.skip();
    }
    
    // Check if service worker registers successfully
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration()
        .then(registration => !!registration);
    });
    
    expect(swRegistered).toBeTruthy();
    
    // Test offline capabilities
    await page.context().setOffline(true);
    await page.goto('/chat');
    
    // Should show offline page
    await expect(page.locator('text=You\'re Offline')).toBeVisible();
    
    // Restore online status
    await page.context().setOffline(false);
  });
}); 