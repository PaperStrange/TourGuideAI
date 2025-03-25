/**
 * Frontend Stability Tests
 * 
 * Tests to verify the stability of the frontend codebase, including:
 * - Router structure
 * - Theme Provider
 * - Global declarations
 * - Error boundaries
 * - Backend resilience
 */

const { test, expect } = require('@playwright/test');

test.describe('Frontend Stability', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for main content to be visible
    await page.waitForSelector('.main-content');
  });

  test('should not have router nesting console errors', async ({ page }) => {
    // Set up listener for console errors related to router nesting
    let routerErrors = false;
    page.on('console', msg => {
      if (
        msg.type() === 'error' && 
        msg.text().includes('You cannot render a <Router> inside another <Router>')
      ) {
        routerErrors = true;
      }
    });

    // Navigate to different routes to trigger potential router issues
    await page.click('text=Home');
    await page.waitForTimeout(500);
    await page.click('a:has-text("Chat")');
    await page.waitForTimeout(500);
    await page.click('a:has-text("Map")');
    await page.waitForTimeout(500);

    // Verify no router errors were logged
    expect(routerErrors).toBe(false);
  });

  test('should have properly themed MUI components', async ({ page }) => {
    // Check if MUI components are rendered properly
    await expect(page.locator('button')).toBeVisible();
    await expect(page.locator('.MuiAppBar-root')).toBeVisible();
    
    // Check for styling consistency by verifying computed styles
    const primaryColor = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--mui-palette-primary-main').trim();
    });
    
    // Verify primary color exists (actual color may vary based on theme)
    expect(primaryColor).toBeTruthy();
  });

  test('should gracefully handle backend unavailability', async ({ page, context }) => {
    // Mock failed API responses
    await context.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Reload the page to trigger backend connection attempts
    await page.reload();
    await page.waitForSelector('.main-content');
    
    // Check for fallback UI elements indicating backend issues
    const fallbackUi = await page.locator('text=backend services are not currently available').isVisible();
    expect(fallbackUi).toBe(true);
  });

  test('should not have uncaught reference errors for external libraries', async ({ page }) => {
    // Set up listener for console errors related to reference errors
    let referenceErrors = false;
    page.on('console', msg => {
      if (
        msg.type() === 'error' && 
        (
          msg.text().includes('ReferenceError') ||
          msg.text().includes('is not defined')
        )
      ) {
        referenceErrors = true;
      }
    });

    // Go to the Map page to test Google Maps integration
    await page.click('a:has-text("Map")');
    await page.waitForTimeout(1000);

    // Verify no reference errors were logged
    expect(referenceErrors).toBe(false);
  });
}); 