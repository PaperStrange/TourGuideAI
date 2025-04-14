import { test, expect } from '@playwright/test';

/**
 * Sarah's User Journey Test
 * 
 * Profile: Casual Tourist
 * Goals: Discover unique local experiences, avoid tourist traps, efficient use of limited time
 * Scenario: Weekend in Barcelona (3 days)
 */

test.describe('Sarah (Casual Tourist) - Barcelona Weekend Journey', () => {
  // Store session data between tests
  let savedRestaurants: string[] = [];
  let savedEveningRoute: string = '';

  test.beforeEach(async ({ page }) => {
    // Go to the app and ensure we're logged in as Sarah
    await page.goto('https://tourguideai.com/');
    
    // Mock the login if needed
    if (await page.locator('.login-button').isVisible()) {
      await page.locator('.login-button').click();
      await page.locator('input[name="email"]').fill('sarah@example.com');
      await page.locator('input[name="password"]').fill('test-password');
      await page.locator('button[type="submit"]').click();
      
      // Verify login was successful
      await expect(page.locator('.user-profile')).toBeVisible();
    }
    
    // Set location to Barcelona for testing
    await page.evaluate(() => {
      // Mock geolocation for Barcelona
      const mockGeolocation = {
        latitude: 41.3851,
        longitude: 2.1734
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
  });

  test('Day 1: Morning - Planning with Local Orientation filter', async ({ page }) => {
    // Test case for initial planning - finding a self-guided tour
    
    // Verify Barcelona is set as location
    await expect(page.locator('.current-location')).toContainText('Barcelona');
    
    // Click on filters button
    await page.locator('.filters-button').click();
    
    // Select "Local Orientation" filter
    await page.locator('text="Local Orientation"').click();
    
    // Select "Self-guided" option
    await page.locator('text="Self-guided"').click();
    
    // Apply filters
    await page.locator('.apply-filters-button').click();
    
    // Verify results contain a Gothic Quarter tour
    const results = page.locator('.tour-results-list');
    await expect(results).toBeVisible();
    await expect(results).toContainText('Gothic Quarter');
    
    // Select the Gothic Quarter walking tour
    await page.locator('.tour-item:has-text("Gothic Quarter")').first().click();
    
    // Verify tour details are shown
    await expect(page.locator('.tour-details')).toBeVisible();
    await expect(page.locator('.tour-duration')).toContainText('2 hour');
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Verify the tour is ready to start
    await expect(page.locator('.tour-navigation')).toBeVisible();
  });

  test('Day 1: Afternoon - Self-guided tour with audio and AR', async ({ page }) => {
    // Simulate being on the tour
    await page.goto('https://tourguideai.com/tours/active');
    
    // Verify audio controls are visible
    await expect(page.locator('.audio-controls')).toBeVisible();
    
    // Play audio narration
    await page.locator('.play-audio-button').click();
    
    // Verify audio is playing
    await expect(page.locator('.audio-progress')).toBeVisible();
    
    // Test AR feature at a key point
    
    // Mock arriving at a key point
    await page.evaluate(() => {
      // Simulate arriving at Cathedral of Barcelona
      const mockGeolocation = {
        latitude: 41.3838,
        longitude: 2.1763
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // Check if AR notification appears
    await expect(page.locator('.ar-available-notification')).toBeVisible({ timeout: 10000 });
    
    // Click to activate AR
    await page.locator('.ar-button').click();
    
    // Verify AR view is active
    await expect(page.locator('.ar-view')).toBeVisible();
    
    // Exit AR view
    await page.locator('.close-ar-button').click();
    
    // Mark restaurants for later
    await page.locator('.nearby-places-button').click();
    await page.locator('.place-category-filter[data-category="restaurants"]').click();
    
    // Save first two restaurants
    const restaurant1 = await page.locator('.place-item').nth(0).textContent();
    const restaurant2 = await page.locator('.place-item').nth(1).textContent();
    
    await page.locator('.save-place-button').nth(0).click();
    await page.locator('.save-place-button').nth(1).click();
    
    // Store for later tests
    if (restaurant1) savedRestaurants.push(restaurant1);
    if (restaurant2) savedRestaurants.push(restaurant2);
    
    // Verify save confirmation
    await expect(page.locator('.save-confirmation')).toBeVisible();
  });

  test('Day 1: Evening - Finding local dinner with Local Favorites filter', async ({ page }) => {
    // Navigate to saved places
    await page.goto('https://tourguideai.com/saved');
    
    // Verify saved restaurants are there
    for (const restaurant of savedRestaurants) {
      await expect(page.locator('.saved-list')).toContainText(restaurant);
    }
    
    // Go to discover section to find more options
    await page.goto('https://tourguideai.com/discover');
    
    // Use Local Favorites filter
    await page.locator('.filters-button').click();
    await page.locator('text="Local Favorites"').click();
    await page.locator('.apply-filters-button').click();
    
    // Verify local ratings are shown
    await expect(page.locator('.locals-badge')).toBeVisible();
    
    // Select a highly-rated tapas bar
    await page.locator('.place-item:has-text("tapas"):has(.locals-badge)').first().click();
    
    // Check details
    await expect(page.locator('.place-details')).toBeVisible();
    await expect(page.locator('.locals-rating')).toBeVisible();
    
    // Save evening walking route for tomorrow
    await page.locator('.nearby-activities-tab').click();
    await page.locator('.activity-item:has-text("Evening Walking Route")').click();
    await page.locator('.save-route-button').click();
    
    // Remember the route name for later tests
    savedEveningRoute = await page.locator('.route-name').textContent() || '';
    
    // Verify save confirmation
    await expect(page.locator('.save-confirmation')).toBeVisible();
  });

  test('Day 2: Morning - Sagrada Familia visit with ticket integration', async ({ page }) => {
    // Navigate to attractions
    await page.goto('https://tourguideai.com/attractions');
    
    // Search for Sagrada Familia
    await page.locator('.search-input').fill('Sagrada Familia');
    await page.keyboard.press('Enter');
    
    // Verify attraction found
    await expect(page.locator('.attraction-result:has-text("Sagrada Familia")')).toBeVisible();
    await page.locator('.attraction-result:has-text("Sagrada Familia")').click();
    
    // Check best visiting times
    await expect(page.locator('.visiting-times')).toBeVisible();
    
    // Test ticket purchase flow
    await page.locator('.buy-tickets-button').click();
    
    // Verify ticket options
    await expect(page.locator('.ticket-options')).toBeVisible();
    
    // Select skip-the-line ticket
    await page.locator('.ticket-option:has-text("Skip the line")').click();
    
    // Select time slot
    await page.locator('.time-slot').first().click();
    
    // Proceed to checkout
    await page.locator('.proceed-button').click();
    
    // Fill in details (simulate account creation if needed)
    if (await page.locator('.venue-account-form').isVisible()) {
      await page.locator('input[name="venue-email"]').fill('sarah@example.com');
      await page.locator('input[name="venue-password"]').fill('test-password');
      await page.locator('.create-venue-account-button').click();
    }
    
    // Complete purchase (in test, we'll mock this)
    await page.locator('.confirm-purchase-button').click();
    
    // Verify purchase confirmation
    await expect(page.locator('.purchase-confirmation')).toBeVisible();
    
    // Download audio guide
    await page.locator('.download-audio-guide-button').click();
    
    // Verify download started
    await expect(page.locator('.download-progress')).toBeVisible();
    await expect(page.locator('.download-complete')).toBeVisible({ timeout: 10000 });
  });

  // More test cases would be added for remaining days...
  
  test('Day 3: Morning - Personalized recommendations based on behavior', async ({ page }) => {
    // Go to personalized recommendations
    await page.goto('https://tourguideai.com/for-you');
    
    // Verify personalization message
    await expect(page.locator('.personalization-message')).toBeVisible();
    
    // Check if modernist architecture tour is recommended based on previous behavior
    await expect(page.locator('.recommendation-item:has-text("modernist architecture")')).toBeVisible();
    
    // Select the modernist architecture tour
    await page.locator('.recommendation-item:has-text("modernist architecture")').click();
    
    // Verify tour details
    await expect(page.locator('.tour-details')).toBeVisible();
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Verify AR features for building details
    await page.locator('.ar-button').first().click();
    await expect(page.locator('.ar-building-details')).toBeVisible();
    
    // Exit AR
    await page.locator('.close-ar-button').click();
  });

  test('Overall: Verify personalization success', async ({ page }) => {
    // Navigate to user profile
    await page.goto('https://tourguideai.com/profile');
    
    // Check journey stats
    await expect(page.locator('.journey-stats')).toBeVisible();
    
    // Verify discovered places count
    const discoveredCount = await page.locator('.discovered-places-count').textContent();
    expect(parseInt(discoveredCount || '0')).toBeGreaterThan(5);
    
    // Check personalization score
    const personalizationScore = await page.locator('.personalization-score').textContent();
    expect(parseInt(personalizationScore || '0')).toBeGreaterThan(70);
    
    // Verify authentication rating
    await expect(page.locator('.authenticity-rating')).toBeVisible();
    const authenticityScore = await page.locator('.authenticity-rating').textContent();
    expect(parseInt(authenticityScore || '0')).toBeGreaterThan(4);
  });
}); 