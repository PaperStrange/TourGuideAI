import { test, expect } from '@playwright/test';

/**
 * James's User Journey Test
 * 
 * Profile: Business Traveler
 * Goals: Maximize limited free time, experience local culture efficiently
 * Scenario: Business Trip to Tokyo (3 days) with meetings scattered throughout
 */

test.describe('James (Business Traveler) - Tokyo Business Trip', () => {
  // Store session data between tests
  let savedLocations: string[] = [];
  let businessCollection: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Go to the app and ensure we're logged in as James
    await page.goto('https://tourguideai.com/');
    
    // Mock the login if needed
    if (await page.locator('.login-button').isVisible()) {
      await page.locator('.login-button').click();
      await page.locator('input[name="email"]').fill('james@example.com');
      await page.locator('input[name="password"]').fill('test-password');
      await page.locator('button[type="submit"]').click();
      
      // Verify login was successful
      await expect(page.locator('.user-profile')).toBeVisible();
    }
    
    // Set location to Tokyo for testing
    await page.evaluate(() => {
      // Mock geolocation for Tokyo
      const mockGeolocation = {
        latitude: 35.6762,
        longitude: 139.6503
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
  });

  test('Pre-trip Setup: Business Trip Profile Configuration', async ({ page }) => {
    // Navigate to trip settings
    await page.goto('https://tourguideai.com/settings/trips');
    
    // Create new business trip profile
    await page.locator('.create-trip-profile-button').click();
    
    // Set up business trip details
    await page.locator('.profile-name-input').fill('Tokyo Business Trip');
    await page.locator('.trip-type-selector').selectOption('Business');
    
    // Set location
    await page.locator('.destination-input').fill('Tokyo');
    
    // Set up business trip duration
    await page.locator('.start-date-input').fill('2023-09-01');
    await page.locator('.end-date-input').fill('2023-09-03');
    
    // Add meeting schedule
    await page.locator('.add-schedule-item-button').click();
    
    // Day 1 meetings
    await page.locator('.day-selector').selectOption('Day 1');
    await page.locator('.add-meeting-button').click();
    await page.locator('.meeting-time-start').fill('09:00');
    await page.locator('.meeting-time-end').fill('16:00');
    await page.locator('.meeting-location').fill('Tokyo Midtown Conference Center');
    
    // Day 2 meetings
    await page.locator('.day-selector').selectOption('Day 2');
    await page.locator('.add-meeting-button').click();
    await page.locator('.meeting-time-start').fill('08:30');
    await page.locator('.meeting-time-end').fill('12:30');
    await page.locator('.meeting-location').fill('Roppongi Business Tower');
    
    // Day 3 meetings
    await page.locator('.day-selector').selectOption('Day 3');
    await page.locator('.add-meeting-button').click();
    await page.locator('.meeting-time-start').fill('13:00');
    await page.locator('.meeting-time-end').fill('17:00');
    await page.locator('.meeting-location').fill('Shibuya Sky Building');
    
    // Set travel goals
    await page.locator('.travel-goal-option:has-text("Local Experience")').click();
    await page.locator('.travel-goal-option:has-text("Efficient Use of Time")').click();
    
    // Save profile
    await page.locator('.save-profile-button').click();
    
    // Verify profile was saved
    await expect(page.locator('.profile-saved-confirmation')).toBeVisible();
    await expect(page.locator('.trip-card:has-text("Tokyo Business Trip")')).toBeVisible();
  });

  test('Day 1: Evening Exploration After Meetings', async ({ page }) => {
    // Navigate to current business trip
    await page.goto('https://tourguideai.com/trips/current');
    
    // Check time-constrained planning
    await page.locator('.free-time-planner-button').click();
    
    // Set available time window
    await page.locator('.time-start-input').fill('19:00');
    await page.locator('.time-end-input').fill('22:00');
    
    // Set hotel as starting point
    await page.locator('.starting-point-input').fill('Park Hyatt Tokyo');
    
    // Select priorities
    await page.locator('.priority-option:has-text("Local Experience")').click();
    await page.locator('.priority-option:has-text("Efficient Use of Time")').click();
    
    // Generate itinerary
    await page.locator('.generate-itinerary-button').click();
    
    // Verify time-constrained itinerary is created
    await expect(page.locator('.time-constrained-itinerary')).toBeVisible();
    await expect(page.locator('.itinerary-duration')).toContainText('3 hours');
    
    // Check food tour recommendation
    await expect(page.locator('.itinerary-item:has-text("food tour")')).toBeVisible();
    
    // Test real-time adjustments
    await page.locator('.adjust-time-button').click();
    await page.locator('.delay-input').fill('20');
    await page.locator('.apply-adjustment-button').click();
    
    // Verify itinerary adjusts
    await expect(page.locator('.adjusted-itinerary-notification')).toBeVisible();
    
    // Start the food tour
    await page.locator('.itinerary-item:has-text("food tour")').click();
    await page.locator('.start-activity-button').click();
    
    // Verify optimized walking route
    await expect(page.locator('.optimized-route')).toBeVisible();
    
    // Simulate visiting food stalls
    await page.locator('.next-stop-button').click();
    
    // Save location to collection
    const locationName = await page.locator('.current-location-name').textContent();
    if (locationName) savedLocations.push(locationName);
    
    await page.locator('.save-to-collection-button').click();
    await page.locator('.collection-name').fill('Tokyo Food Experiences');
    await page.locator('.save-button').click();
    
    // Verify location saved
    await expect(page.locator('.save-confirmation')).toBeVisible();
    
    // Complete tour
    await page.locator('.complete-tour-button').click();
    
    // Use Safe Night Routes feature to return
    await page.locator('.safe-route-button').click();
    
    // Verify safe route is shown
    await expect(page.locator('.safe-route-map')).toBeVisible();
    await expect(page.locator('.estimated-arrival')).toBeVisible();
    
    // Save to business travel collection
    await page.locator('.save-to-business-collection-button').click();
    
    // Verify business collection
    const experienceName = await page.locator('.experience-title').textContent();
    if (experienceName) businessCollection.push(experienceName);
    
    // Schedule notification for tomorrow
    await page.locator('.schedule-notification-button').click();
    await page.locator('.time-selector').selectOption('30 minutes before free time');
    await page.locator('.confirm-notification-button').click();
    
    // Verify notification scheduled
    await expect(page.locator('.notification-scheduled')).toBeVisible();
  });

  test('Day 2: Morning Cultural Experience Before Meetings', async ({ page }) => {
    // Navigate to current business trip
    await page.goto('https://tourguideai.com/trips/current');
    
    // Navigate to day 2
    await page.locator('.day-selector-button:has-text("Day 2")').click();
    
    // Check free time slot
    await expect(page.locator('.free-time-slot')).toBeVisible();
    await expect(page.locator('.free-time-duration')).toContainText('2 hours');
    
    // Request focused experience
    await page.locator('.free-time-slot').click();
    await page.locator('.focused-experience-button').click();
    
    // Verify nearby temple recommendation
    await expect(page.locator('.recommendation:has-text("temple")')).toBeVisible();
    
    // Select temple with morning ceremony
    await page.locator('.recommendation:has-text("morning ceremony")').click();
    
    // Use Cultural Context feature
    await page.locator('.cultural-context-button').click();
    
    // Verify cultural information is shown
    await expect(page.locator('.cultural-context-panel')).toBeVisible();
    await expect(page.locator('.cultural-significance')).toBeVisible();
    
    // Start temple visit
    await page.locator('.start-visit-button').click();
    
    // Verify temple visit interface
    await expect(page.locator('.visit-interface')).toBeVisible();
    
    // Simulate temple visit
    await page.locator('.next-point-button').click();
    
    // Save to business collection
    await page.locator('.save-to-collection-button').click();
    
    // Verify saved to collection
    await expect(page.locator('.save-confirmation')).toBeVisible();
    
    // Check Business Transit feature
    await page.locator('.business-transit-button').click();
    
    // Set destination to meeting location
    await page.locator('.destination-input').fill('Roppongi Business Tower');
    
    // Verify transit plan with buffer
    await expect(page.locator('.transit-plan')).toBeVisible();
    await expect(page.locator('.buffer-time')).toBeVisible();
    
    // Start transit
    await page.locator('.start-transit-button').click();
    
    // Listen to business district history
    await page.locator('.audio-guide-button').click();
    
    // Verify audio guide plays
    await expect(page.locator('.audio-playing-indicator')).toBeVisible();
    await expect(page.locator('.audio-content')).toContainText('business district');
    
    // Complete journey
    await page.locator('.arrived-button').click();
    
    // Verify arrival confirmation
    await expect(page.locator('.arrival-confirmation')).toBeVisible();
    await expect(page.locator('.punctuality-message')).toContainText('on time');
  });

  test('Day 3: Afternoon Shopping Window and Final Experience', async ({ page }) => {
    // Navigate to current business trip
    await page.goto('https://tourguideai.com/trips/current');
    
    // Navigate to day 3
    await page.locator('.day-selector-button:has-text("Day 3")').click();
    
    // Find the afternoon free time window
    await page.locator('.free-time-slot:has-text("3 hours")').click();
    
    // Use Business Gifts feature
    await page.locator('.business-gifts-button').click();
    
    // Verify appropriate gift suggestions
    await expect(page.locator('.gift-suggestions')).toBeVisible();
    await expect(page.locator('.cultural-appropriateness-guide')).toBeVisible();
    
    // Select department store shopping experience
    await page.locator('.shopping-experience:has-text("department store")').click();
    
    // Verify efficient route through store
    await expect(page.locator('.shopping-route')).toBeVisible();
    await expect(page.locator('.gift-categories')).toBeVisible();
    
    // Select gifts for colleagues
    await page.locator('.gift-category:has-text("Traditional")').click();
    await page.locator('.gift-item').first().click();
    
    // Add to shopping list
    await page.locator('.add-to-list-button').click();
    
    // Follow shopping route
    await page.locator('.follow-route-button').click();
    
    // Verify cultural guidance
    await expect(page.locator('.cultural-shopping-guidance')).toBeVisible();
    
    // Complete shopping
    await page.locator('.complete-shopping-button').click();
    
    // For final experience, check after last meeting
    await page.locator('.post-meeting-experience-button').click();
    
    // Select panoramic view experience
    await page.locator('.experience-option:has-text("panoramic view")').click();
    
    // Verify panoramic view details
    await expect(page.locator('.experience-details')).toBeVisible();
    await expect(page.locator('.proximity-to-meeting')).toContainText('near');
    
    // Use Quick Cultural Insights feature
    await page.locator('.quick-insights-button').click();
    
    // Verify quick insights panel
    await expect(page.locator('.quick-insights-panel')).toBeVisible();
    await expect(page.locator('.insight-content')).toBeVisible();
    
    // Start panoramic experience
    await page.locator('.start-experience-button').click();
    
    // Complete Tokyo Business Trip collection
    await page.locator('.add-to-collection-button').click();
    await page.locator('.collection-name').fill('Tokyo Business Trip');
    await page.locator('.add-photo-button').click();
    await page.locator('.save-to-collection-button').click();
    
    // Verify collection completed
    await expect(page.locator('.collection-updated-notification')).toBeVisible();
  });

  test('Overall: Verify Business Trip Efficiency Success', async ({ page }) => {
    // Navigate to trip summary
    await page.goto('https://tourguideai.com/trips/summary');
    
    // Check time efficiency metrics
    await expect(page.locator('.efficiency-metrics')).toBeVisible();
    
    // Verify free time utilization
    const freeTimeUtilization = await page.locator('.free-time-utilization-percentage').textContent();
    expect(parseInt(freeTimeUtilization || '0')).toBeGreaterThan(85);
    
    // Check meeting punctuality
    await expect(page.locator('.punctuality-score')).toBeVisible();
    const punctualityScore = await page.locator('.punctuality-score').textContent();
    expect(parseInt(punctualityScore || '0')).toBeGreaterThan(90);
    
    // Verify cultural experiences count
    const culturalExperiences = await page.locator('.cultural-experiences-count').textContent();
    expect(parseInt(culturalExperiences || '0')).toBeGreaterThan(3);
    
    // Check business collections
    await page.locator('.business-collections-button').click();
    
    // Verify Tokyo Business Trip collection
    await expect(page.locator('.collection-item:has-text("Tokyo Business Trip")')).toBeVisible();
    
    // Check local authenticity score
    await expect(page.locator('.authenticity-score')).toBeVisible();
    const authenticityScore = await page.locator('.authenticity-score').textContent();
    expect(parseInt(authenticityScore || '0')).toBeGreaterThan(80);
    
    // Verify business appropriateness of experiences
    await expect(page.locator('.business-appropriateness-score')).toBeVisible();
    const businessAppropriatenessScore = await page.locator('.business-appropriateness-score').textContent();
    expect(parseInt(businessAppropriatenessScore || '0')).toBeGreaterThan(90);
    
    // Check goal achievement
    await expect(page.locator('.goal-achievement')).toBeVisible();
    await expect(page.locator('.goal-item:has-text("Local Experience")')).toHaveClass(/completed/);
    await expect(page.locator('.goal-item:has-text("Efficient Use of Time")')).toHaveClass(/completed/);
    
    // Verify time savings
    const timeSaved = await page.locator('.time-saved').textContent();
    expect(parseInt(timeSaved?.replace(/[^0-9]/g, '') || '0')).toBeGreaterThan(60); // Expecting more than 60 minutes saved
  });
}); 