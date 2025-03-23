const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('TourGuideAI Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('Homepage loads correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/TourGuideAI/);
    
    // Check main elements are visible
    await expect(page.locator('text=Welcome to TourGuideAI')).toBeVisible();
    await expect(page.locator('text=Your personal travel planning assistant')).toBeVisible();
    
    // Check navigation links
    await expect(page.locator('text=Start Planning')).toBeVisible();
    await expect(page.locator('text=Open Map')).toBeVisible();
    await expect(page.locator('text=View Profile')).toBeVisible();
  });

  test('Chat page loads and functions', async ({ page }) => {
    // Navigate to chat page
    await page.click('text=Start Planning');
    
    // Verify page loaded
    await expect(page.locator('text=Your personal tour guide!')).toBeVisible();
    
    // Verify input field works
    const inputBox = page.locator('.input-box');
    await expect(inputBox).toBeVisible();
    await inputBox.fill('Test trip to Paris');
    
    // Verify button is enabled
    const generateButton = page.locator('.generate-btn');
    await expect(generateButton).toBeEnabled();
  });

  test('Map page loads', async ({ page }) => {
    // Navigate to map page
    await page.click('text=Open Map');
    
    // Check if the map component is present
    await expect(page.locator('#map-container')).toBeVisible({ timeout: 10000 });
  });

  test('Profile page loads', async ({ page }) => {
    // Navigate to profile page
    await page.click('text=View Profile');
    
    // Check for profile elements
    await expect(page.locator('.profile-section')).toBeVisible();
  });

  test('Service worker is registered', async ({ page }) => {
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration()
        .then(registration => !!registration);
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('Offline mode shows fallback page', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to a new page
    await page.goto(`${BASE_URL}/chat`);
    
    // Check if we see the offline fallback content
    await expect(page.locator('text=You\'re Offline')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });
}); 