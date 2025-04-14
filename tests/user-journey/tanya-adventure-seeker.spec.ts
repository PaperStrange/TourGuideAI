import { test, expect } from '@playwright/test';

/**
 * Tanya's User Journey Test
 * 
 * Profile: Adventure Seeker
 * Goals: Find unique physical activities, explore off-the-beaten-path locations, connect with local outdoor communities
 * Scenario: Active Exploration of Costa Rica (10 days)
 */

test.describe('Tanya (Adventure Seeker) - Costa Rica Active Exploration', () => {
  // Store session data between tests
  let activityMetrics: Record<string, number> = {};
  let savedTrails: string[] = [];
  let conservationActivities: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Go to the app and ensure we're logged in as Tanya
    await page.goto('https://tourguideai.com/');
    
    // Mock the login if needed
    if (await page.locator('.login-button').isVisible()) {
      await page.locator('.login-button').click();
      await page.locator('input[name="email"]').fill('tanya@example.com');
      await page.locator('input[name="password"]').fill('test-password');
      await page.locator('button[type="submit"]').click();
      
      // Verify login was successful
      await expect(page.locator('.user-profile')).toBeVisible();
    }
    
    // Set initial location to Arenal region for testing
    await page.evaluate(() => {
      // Mock geolocation for Arenal Volcano region
      const mockGeolocation = {
        latitude: 10.4626,
        longitude: -84.7032
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
  });

  test('Pre-trip Setup: Adventure Profile and Fitness Goals', async ({ page }) => {
    // Navigate to user settings
    await page.goto('https://tourguideai.com/settings/profile');
    
    // Set up adventure profile
    await page.locator('.adventure-profile-button').click();
    
    // Set adventure preferences
    await page.locator('.adventure-level-selector').selectOption('Advanced');
    
    // Select adventure interests
    await page.locator('.adventure-interest-option:has-text("Hiking")').click();
    await page.locator('.adventure-interest-option:has-text("Water Sports")').click();
    await page.locator('.adventure-interest-option:has-text("Canyoning")').click();
    await page.locator('.adventure-interest-option:has-text("Wildlife")').click();
    
    // Set fitness goals
    await page.locator('.fitness-goals-button').click();
    await page.locator('.daily-activity-target').fill('4');
    await page.locator('.elevation-goal').fill('500');
    
    // Connect fitness tracker (mock)
    await page.locator('.connect-fitness-device-button').click();
    await page.locator('.device-option:has-text("Garmin")').click();
    await page.locator('.authorize-connection-button').click();
    
    // Verify tracker connected
    await expect(page.locator('.device-connected-confirmation')).toBeVisible();
    
    // Set conservation interests
    await page.locator('.conservation-interests-button').click();
    await page.locator('.conservation-option:has-text("Rainforest")').click();
    await page.locator('.conservation-option:has-text("Marine")').click();
    
    // Save profile
    await page.locator('.save-profile-button').click();
    
    // Verify profile saved
    await expect(page.locator('.profile-saved-confirmation')).toBeVisible();
    
    // Create Costa Rica adventure trip
    await page.goto('https://tourguideai.com/trips/new');
    await page.locator('.trip-name-input').fill('Costa Rica Adventure');
    await page.locator('.destination-input').fill('Costa Rica');
    await page.locator('.trip-dates-start').fill('2023-10-01');
    await page.locator('.trip-dates-end').fill('2023-10-10');
    await page.locator('.trip-type-selector').selectOption('Adventure');
    
    // Select regions to visit
    await page.locator('.region-option:has-text("Arenal")').click();
    await page.locator('.region-option:has-text("Manuel Antonio")').click();
    await page.locator('.region-option:has-text("Montezuma")').click();
    
    // Create trip
    await page.locator('.create-trip-button').click();
    
    // Verify trip created
    await expect(page.locator('.trip-created-confirmation')).toBeVisible();
    await expect(page.locator('.trip-card:has-text("Costa Rica Adventure")')).toBeVisible();
  });

  test('Days 1-3: Arenal Region Adventure Planning', async ({ page }) => {
    // Navigate to trip planner
    await page.goto('https://tourguideai.com/trips/current');
    
    // Use Adventure Filter
    await page.locator('.adventure-filter-button').click();
    
    // Filter by physical intensity
    await page.locator('.intensity-slider').fill('8');
    
    // Show elevation gain
    await page.locator('.show-elevation-toggle').click();
    
    // Apply filters
    await page.locator('.apply-filters-button').click();
    
    // Verify high-intensity activities are shown
    await expect(page.locator('.adventure-results')).toBeVisible();
    await expect(page.locator('.activity-card:has-text("High Intensity")')).toBeVisible();
    
    // Create hiking itinerary
    await page.locator('.create-hiking-itinerary-button').click();
    
    // Verify hiking itinerary
    await expect(page.locator('.hiking-itinerary')).toBeVisible();
    await expect(page.locator('.elevation-profile')).toBeVisible();
    
    // Download offline maps
    await page.locator('.download-offline-maps-button').click();
    
    // Select detailed map package
    await page.locator('.map-package-option:has-text("Detailed")'). click();
    
    // Download maps
    await page.locator('.confirm-download-button').click();
    
    // Verify download completion
    await expect(page.locator('.download-complete-notification')).toBeVisible({ timeout: 15000 });
    
    // Book waterfall rappelling experience
    await page.goto('https://tourguideai.com/activities');
    await page.locator('.activity-search-input').fill('waterfall rappelling');
    await page.keyboard.press('Enter');
    
    // Select canyoning tour
    await page.locator('.activity-result:has-text("canyoning tour")').first().click();
    
    // Use Adventure Booking feature
    await page.locator('.adventure-booking-button').click();
    
    // Select adrenaline package
    await page.locator('.package-option:has-text("Adrenaline")').click();
    
    // Complete booking
    await page.locator('.book-activity-button').click();
    
    // Verify booking confirmation
    await expect(page.locator('.booking-confirmation')).toBeVisible();
  });

  test('Days 1-3: Waterfall Rappelling Experience', async ({ page }) => {
    // Navigate to bookings
    await page.goto('https://tourguideai.com/bookings/upcoming');
    
    // Find canyoning activity
    await expect(page.locator('.booking-item:has-text("canyoning")')).toBeVisible();
    
    // Start the activity
    await page.locator('.booking-item:has-text("canyoning")').click();
    await page.locator('.start-activity-button').click();
    
    // Enable activity tracking
    await page.locator('.track-activity-button').click();
    
    // Verify tracking is active
    await expect(page.locator('.tracking-active-indicator')).toBeVisible();
    
    // Simulate activity progression (would be GPS/time based in real app)
    await page.locator('.activity-checkpoint').first().click();
    
    // Record metrics at first rappel
    await page.locator('.record-metrics-button').click();
    
    // Verify metrics recording
    await expect(page.locator('.metrics-recorded-confirmation')).toBeVisible();
    
    // Store metrics for later verification
    activityMetrics['elevation_change'] = 120;
    activityMetrics['heart_rate'] = 145;
    activityMetrics['active_minutes'] = 45;
    
    // Use wildlife identification feature
    await page.locator('.wildlife-button').click();
    
    // Identify wildlife (mock photo taking)
    await page.locator('.identify-species-button').click();
    
    // Verify species identified
    await expect(page.locator('.species-identification:has-text("Toucan")')).toBeVisible();
    
    // Complete activity
    await page.locator('.complete-activity-button').click();
    
    // Verify activity summary
    await expect(page.locator('.activity-summary')).toBeVisible();
    await expect(page.locator('.calories-burned')).toBeVisible();
    await expect(page.locator('.elevation-conquered')).toBeVisible();
    
    // Check recommended recovery
    await page.locator('.recovery-recommendations-button').click();
    
    // Verify recovery recommendations
    await expect(page.locator('.recovery-options')).toBeVisible();
    
    // Select hot springs recovery
    await page.locator('.recovery-option:has-text("Hot Springs")').click();
    
    // Use Local Wellness feature
    await page.locator('.local-wellness-button').click();
    
    // Select authentic hot springs
    await page.locator('.wellness-option:has-text("local")').first().click();
    
    // Verify hot springs details
    await expect(page.locator('.wellness-details')).toBeVisible();
    
    // Plan next adventures based on muscle groups
    await page.locator('.muscle-recovery-planner-button').click();
    
    // Verify recovery-focused recommendations
    await expect(page.locator('.recovery-based-recommendations')).toBeVisible();
    await expect(page.locator('.next-day-suggestion')).toContainText('different muscle groups');
  });

  test('Days 4-7: Manuel Antonio Coastal Adventures', async ({ page }) => {
    // Navigate to next destination
    await page.goto('https://tourguideai.com/trips/current');
    
    // Select Manuel Antonio section
    await page.locator('.destination-segment:has-text("Manuel Antonio")').click();
    
    // Update geolocation to Manuel Antonio
    await page.evaluate(() => {
      // Mock geolocation for Manuel Antonio
      const mockGeolocation = {
        latitude: 9.3920,
        longitude: -84.1370
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // Use Ocean Adventures filter
    await page.locator('.adventure-category-filter:has-text("Ocean")').click();
    
    // Find surfing lessons
    await expect(page.locator('.adventure-item:has-text("surfing lessons")')).toBeVisible();
    
    // Select surfing lessons
    await page.locator('.adventure-item:has-text("surfing lessons")').click();
    
    // Book surf lesson
    await page.locator('.book-adventure-button').click();
    
    // Select intermediate level
    await page.locator('.skill-level-option:has-text("Intermediate")').click();
    
    // Complete booking
    await page.locator('.complete-booking-button').click();
    
    // Verify booking confirmation
    await expect(page.locator('.booking-confirmation')).toBeVisible();
    
    // Start surf activity the next day
    await page.goto('https://tourguideai.com/activities/current');
    
    // Track surf progress
    await page.locator('.track-surf-progress-button').click();
    
    // Record surf session
    await page.locator('.wave-count-input').fill('12');
    await page.locator('.longest-ride-input').fill('45');
    await page.locator('.save-session-stats-button').click();
    
    // Verify surf stats saved
    await expect(page.locator('.session-saved-confirmation')).toBeVisible();
    
    // Connect with local surf community
    await page.locator('.surf-community-button').click();
    
    // Join local surf meetup
    await page.locator('.community-event:has-text("sunset surf")').click();
    await page.locator('.join-event-button').click();
    
    // Verify event joined
    await expect(page.locator('.event-joined-confirmation')).toBeVisible();
    
    // Plan jungle trekking activity
    await page.goto('https://tourguideai.com/trails');
    
    // Filter by difficulty
    await page.locator('.difficulty-filter-button').click();
    await page.locator('.difficulty-option:has-text("Challenging")').click();
    
    // Select jungle trail
    await page.locator('.trail-result:has-text("Primary Rainforest")').click();
    
    // View trail details
    await expect(page.locator('.trail-difficulty-rating')).toBeVisible();
    await expect(page.locator('.trail-elevation-profile')).toBeVisible();
    
    // Save trail for offline use
    await page.locator('.save-trail-offline-button').click();
    
    // Verify trail saved
    await expect(page.locator('.trail-saved-confirmation')).toBeVisible();
    
    // Store trail for later verification
    const trailName = await page.locator('.trail-name').textContent();
    if (trailName) savedTrails.push(trailName);
    
    // Use real-time wildlife alert feature
    await page.locator('.enable-wildlife-alerts-button').click();
    
    // Verify wildlife alerts enabled
    await expect(page.locator('.wildlife-alerts-active')).toBeVisible();
    
    // Find conservation activity
    await page.locator('.conservation-activities-button').click();
    
    // Select beach cleanup
    await page.locator('.conservation-activity:has-text("Beach Cleanup")').click();
    
    // Register for activity
    await page.locator('.register-button').click();
    
    // Verify registration
    await expect(page.locator('.registration-confirmation')).toBeVisible();
    
    // Store conservation activity
    const activityName = await page.locator('.activity-name').textContent();
    if (activityName) conservationActivities.push(activityName);
  });

  test('Days 8-10: Montezuma Remote Experiences', async ({ page }) => {
    // Navigate to final destination
    await page.goto('https://tourguideai.com/trips/current');
    
    // Select Montezuma section
    await page.locator('.destination-segment:has-text("Montezuma")').click();
    
    // Update geolocation to Montezuma
    await page.evaluate(() => {
      // Mock geolocation for Montezuma
      const mockGeolocation = {
        latitude: 9.6550,
        longitude: -85.0659
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // Check offline maps
    await page.locator('.offline-maps-button').click();
    
    // Verify offline maps are available
    await expect(page.locator('.offline-maps-available')).toBeVisible();
    
    // Download Montezuma offline maps
    await page.locator('.download-region-button:has-text("Montezuma")').click();
    
    // Verify download completion
    await expect(page.locator('.download-complete-notification')).toBeVisible({ timeout: 15000 });
    
    // Find remote waterfall trail
    await page.locator('.search-trails-input').fill('Montezuma Waterfall');
    await page.keyboard.press('Enter');
    
    // Select waterfall trail
    await page.locator('.trail-result:has-text("Montezuma Waterfall")').click();
    
    // Use safety check-in feature
    await page.locator('.safety-checkin-button').click();
    
    // Set safety contact
    await page.locator('.safety-contact-input').fill('emergency@example.com');
    await page.locator('.expected-return-time').fill('17:00');
    
    // Enable automatic check-ins
    await page.locator('.auto-checkin-toggle').click({force: true});
    
    // Verify safety setup
    await expect(page.locator('.safety-setup-confirmation')).toBeVisible();
    
    // Start trail navigation
    await page.locator('.start-navigation-button').click();
    
    // Verify offline navigation is working
    await expect(page.locator('.offline-navigation-active')).toBeVisible();
    
    // Follow locally-created adventure route
    await page.locator('.community-routes-button').click();
    
    // Select local's route
    await page.locator('.community-route:has-text("Local\'s Secret")').click();
    
    // Start community route
    await page.locator('.follow-route-button').click();
    
    // Verify route guidance
    await expect(page.locator('.route-guidance')).toBeVisible();
    
    // Save route to collection
    await page.locator('.save-to-collection-button').click();
    
    // Verify route saved
    await expect(page.locator('.route-saved-confirmation')).toBeVisible();
    
    // Store trail
    const trailName = await page.locator('.trail-name').textContent();
    if (trailName) savedTrails.push(trailName);
    
    // Connect fitness tracker for recording
    await page.locator('.connect-tracker-button').click();
    
    // Verify tracker connected
    await expect(page.locator('.tracker-connected-notification')).toBeVisible();
    
    // Complete adventure challenge series
    await page.goto('https://tourguideai.com/challenges');
    
    // Find Costa Rica challenge
    await page.locator('.challenge-series:has-text("Costa Rica Adventure")').click();
    
    // View challenge progress
    await expect(page.locator('.challenge-progress')).toBeVisible();
    
    // Complete final challenge
    await page.locator('.challenge-task:not(.completed)').first().click();
    await page.locator('.mark-completed-button').click();
    
    // Verify challenge completion
    await expect(page.locator('.challenge-completed-notification')).toBeVisible();
    
    // Share achievements with community
    await page.locator('.share-achievements-button').click();
    
    // Post to community
    await page.locator('.share-caption-input').fill('Completed the Costa Rica Adventure Challenge!');
    await page.locator('.post-to-community-button').click();
    
    // Verify post shared
    await expect(page.locator('.post-shared-confirmation')).toBeVisible();
  });

  test('Overall: Verify Adventure Success and Fitness Goals', async ({ page }) => {
    // Navigate to trip summary
    await page.goto('https://tourguideai.com/trips/summary');
    
    // Check adventure metrics
    await expect(page.locator('.adventure-metrics')).toBeVisible();
    
    // Verify activities completed
    const activitiesCount = await page.locator('.activities-completed-count').textContent();
    expect(parseInt(activitiesCount || '0')).toBeGreaterThan(8);
    
    // Check fitness integration
    await page.locator('.fitness-summary-button').click();
    
    // Verify fitness data recorded
    await expect(page.locator('.fitness-data')).toBeVisible();
    
    // Check elevation gained
    const elevationGained = await page.locator('.total-elevation-gained').textContent();
    expect(parseInt(elevationGained?.replace(/[^0-9]/g, '') || '0')).toBeGreaterThan(2000);
    
    // Check activity minutes
    const activityMinutes = await page.locator('.total-activity-minutes').textContent();
    expect(parseInt(activityMinutes || '0')).toBeGreaterThan(1200);
    
    // Verify adventure challenge completion
    await page.locator('.challenges-button').click();
    
    // Check completed challenges
    const completedChallenges = await page.locator('.completed-challenges-count').textContent();
    expect(parseInt(completedChallenges || '0')).toBeGreaterThan(5);
    
    // Verify saved trails
    await page.locator('.saved-trails-button').click();
    
    // Check saved trails
    for (const trail of savedTrails) {
      await expect(page.locator(`.saved-trail-item:has-text("${trail}")`)).toBeVisible();
    }
    
    // Verify safety check-ins
    await page.locator('.safety-history-button').click();
    
    // Check safety check-in record
    await expect(page.locator('.safety-checkins')).toBeVisible();
    const safetyCheckins = await page.locator('.checkin-count').textContent();
    expect(parseInt(safetyCheckins || '0')).toBeGreaterThan(0);
    
    // Verify connections with local communities
    await page.locator('.community-connections-button').click();
    
    // Check community connections
    await expect(page.locator('.community-connection-count')).toBeVisible();
    const connectionCount = await page.locator('.community-connection-count').textContent();
    expect(parseInt(connectionCount || '0')).toBeGreaterThan(2);
    
    // Verify conservation activities
    await page.locator('.conservation-activities-button').click();
    
    // Check conservation participation
    for (const activity of conservationActivities) {
      await expect(page.locator(`.conservation-activity-item:has-text("${activity}")`)).toBeVisible();
    }
    
    // Check overall goals achievement
    await expect(page.locator('.goal-achievement')).toBeVisible();
    await expect(page.locator('.goal-item:has-text("physical activities")')).toHaveClass(/completed/);
    await expect(page.locator('.goal-item:has-text("off-the-beaten-path")')).toHaveClass(/completed/);
    await expect(page.locator('.goal-item:has-text("local communities")')).toHaveClass(/completed/);
  });
}); 