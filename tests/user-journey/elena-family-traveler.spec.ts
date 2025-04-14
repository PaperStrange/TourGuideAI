import { test, expect } from '@playwright/test';

/**
 * Elena's User Journey Test
 * 
 * Profile: Family Traveler
 * Goals: Find kid-friendly activities, balance education with entertainment, keep the whole family engaged
 * Scenario: Family-Friendly London (5 days)
 */

test.describe('Elena (Family Traveler) - Family-Friendly London', () => {
  // Store session data between tests
  let childProfiles = {
    son: { age: 8, interests: ['knights', 'dinosaurs', 'space'] },
    daughter: { age: 11, interests: ['history', 'art', 'wildlife'] }
  };
  
  let familyActivities: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Go to the app and ensure we're logged in as Elena
    await page.goto('https://tourguideai.com/');
    
    // Mock the login if needed
    if (await page.locator('.login-button').isVisible()) {
      await page.locator('.login-button').click();
      await page.locator('input[name="email"]').fill('elena@example.com');
      await page.locator('input[name="password"]').fill('test-password');
      await page.locator('button[type="submit"]').click();
      
      // Verify login was successful
      await expect(page.locator('.user-profile')).toBeVisible();
    }
    
    // Set location to London for testing
    await page.evaluate(() => {
      // Mock geolocation for London
      const mockGeolocation = {
        latitude: 51.5074,
        longitude: -0.1278
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
  });

  test('Day 1: Setting up family profiles and creating a family-friendly itinerary', async ({ page }) => {
    // Navigate to family settings
    await page.goto('https://tourguideai.com/settings/family');
    
    // Check if family profiles already exist
    const hasProfiles = await page.locator('.family-profiles').isVisible();
    
    if (!hasProfiles) {
      // Set up family profiles for each family member
      await page.locator('.add-family-member-button').click();
      
      // Add son's profile
      await page.locator('input[name="member-name"]').fill('Alex');
      await page.locator('input[name="member-age"]').fill('8');
      await page.locator('.relationship-dropdown').selectOption('Son');
      
      // Select son's interests
      await page.locator('.interest-option:has-text("Knights")').click();
      await page.locator('.interest-option:has-text("Dinosaurs")').click();
      await page.locator('.interest-option:has-text("Space")').click();
      
      await page.locator('.save-member-button').click();
      
      // Add daughter's profile
      await page.locator('.add-family-member-button').click();
      await page.locator('input[name="member-name"]').fill('Sophia');
      await page.locator('input[name="member-age"]').fill('11');
      await page.locator('.relationship-dropdown').selectOption('Daughter');
      
      // Select daughter's interests
      await page.locator('.interest-option:has-text("History")').click();
      await page.locator('.interest-option:has-text("Art")').click();
      await page.locator('.interest-option:has-text("Wildlife")').click();
      
      await page.locator('.save-member-button').click();
    }
    
    // Verify profiles were created/exist
    await expect(page.locator('.family-member-card:has-text("Alex")')).toBeVisible();
    await expect(page.locator('.family-member-card:has-text("Sophia")')).toBeVisible();
    
    // Enable the "Kids Gaming Layer"
    await page.locator('.family-settings-tab').click();
    await page.locator('.toggle-feature[data-feature="kids-gaming"]').click({force: true});
    
    // Save settings
    await page.locator('.save-settings-button').click();
    
    // Navigate to planning page
    await page.goto('https://tourguideai.com/plan');
    
    // Select Family Mode
    await page.locator('.mode-selector').click();
    await page.locator('.mode-option:has-text("Family")').click();
    
    // Verify family mode is activated
    await expect(page.locator('.active-mode-indicator')).toContainText('Family');
    
    // Create a 5-day London itinerary
    await page.locator('.create-itinerary-button').click();
    await page.locator('.destination-input').fill('London');
    await page.locator('.itinerary-days-selector').selectOption('5');
    
    // Select family-friendly option
    await page.locator('.option-kid-friendly').click();
    
    // Create itinerary
    await page.locator('.create-button').click();
    
    // Verify itinerary was created with family focus
    await expect(page.locator('.itinerary-title')).toBeVisible();
    await expect(page.locator('.family-friendly-badge')).toBeVisible();
  });

  test('Day 1: Westminster Exploration with History Detectives Game', async ({ page }) => {
    // Navigate to day 1 itinerary
    await page.goto('https://tourguideai.com/itinerary/current/1');
    
    // Check if Westminster is in the itinerary
    await expect(page.locator('.itinerary-item:has-text("Westminster")')).toBeVisible();
    
    // Start the Westminster activity
    await page.locator('.itinerary-item:has-text("Westminster")').click();
    await page.locator('.start-activity-button').click();
    
    // Verify kids gaming layer is active
    await expect(page.locator('.kids-game-interface')).toBeVisible();
    
    // Check if History Detectives game is available
    await expect(page.locator('.game-option:has-text("History Detectives")')).toBeVisible();
    
    // Start the game
    await page.locator('.game-option:has-text("History Detectives")').click();
    
    // Verify game started
    await expect(page.locator('.game-interface')).toBeVisible();
    
    // Simulate completing a challenge at Big Ben
    await page.evaluate(() => {
      // Simulate arriving at Big Ben
      const mockGeolocation = {
        latitude: 51.5007,
        longitude: -0.1246
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // Verify challenge appears
    await expect(page.locator('.challenge-notification')).toBeVisible();
    
    // Complete the challenge (answer a question about Big Ben)
    await page.locator('.challenge-option:has-text("1859")').click();
    
    // Verify badge received
    await expect(page.locator('.badge-earned-notification')).toBeVisible();
    
    // Check Parent Guide
    await page.locator('.parent-guide-button').click();
    
    // Verify talking points are shown
    await expect(page.locator('.talking-points')).toBeVisible();
    await expect(page.locator('.talking-points')).toContainText('Big Ben');
    
    // Close parent guide
    await page.locator('.close-guide-button').click();
    
    // Save activity to list
    const activityName = await page.locator('.activity-title').textContent();
    if (activityName) familyActivities.push(activityName);
  });

  test('Day 1: Afternoon in the Park with Wildlife Spotter', async ({ page }) => {
    // Navigate to St. James's Park recommendation
    await page.goto('https://tourguideai.com/discover');
    await page.locator('.search-input').fill('St. James Park');
    await page.keyboard.press('Enter');
    
    // Select the park
    await page.locator('.place-result:has-text("St. James")').first().click();
    
    // Check family features
    await page.locator('.family-features-button').click();
    
    // Verify kid-friendly spots are shown
    await expect(page.locator('.kid-friendly-spots')).toBeVisible();
    
    // Start the Wildlife Spotter activity
    await page.locator('.activity-option:has-text("Wildlife Spotter")').click();
    
    // Verify game started for children
    await expect(page.locator('.wildlife-game-interface')).toBeVisible();
    
    // Simulate spotting wildlife (identify birds)
    await page.locator('.wildlife-item:has-text("Pelican")').click();
    
    // Verify identification
    await expect(page.locator('.wildlife-identified')).toBeVisible();
    
    // Check Family Facilities map
    await page.locator('.facilities-button').click();
    
    // Verify facilities are shown
    await expect(page.locator('.facilities-map')).toBeVisible();
    await expect(page.locator('.facility-icon[data-type="restroom"]')).toBeVisible();
    await expect(page.locator('.facility-icon[data-type="food"]')).toBeVisible();
    
    // Check nearest restroom
    await page.locator('.facility-icon[data-type="restroom"]').first().click();
    
    // Verify restroom details
    await expect(page.locator('.facility-details')).toBeVisible();
    await expect(page.locator('.baby-changing-indicator')).toBeVisible();
    
    // Save activity to list
    const activityName = await page.locator('.activity-title').textContent();
    if (activityName) familyActivities.push(activityName);
  });

  test('Day 2-3: Natural History Museum with Customized Family Route', async ({ page }) => {
    // Navigate to Natural History Museum page
    await page.goto('https://tourguideai.com/attractions');
    await page.locator('.search-input').fill('Natural History Museum');
    await page.keyboard.press('Enter');
    
    // Select the museum
    await page.locator('.attraction-result:has-text("Natural History Museum")').click();
    
    // Look for family route option
    await page.locator('.family-route-button').click();
    
    // Verify customized family route is shown
    await expect(page.locator('.family-route-map')).toBeVisible();
    
    // Set up a dinosaur challenge for the son
    await page.locator('.customize-for-child-button').click();
    await page.locator('.child-option:has-text("Alex")').click();
    await page.locator('.theme-option:has-text("Dinosaur")').click();
    await page.locator('.apply-theme-button').click();
    
    // Verify son's challenge is created
    await expect(page.locator('.child-challenge:has-text("Alex")')).toBeVisible();
    await expect(page.locator('.challenge-theme')).toContainText('Dinosaur');
    
    // Use time estimator
    await page.locator('.time-estimator-button').click();
    
    // Set family pace
    await page.locator('.pace-option:has-text("With kids - frequent breaks")').click();
    
    // Verify time estimate is adjusted
    await expect(page.locator('.estimated-time')).toBeVisible();
    await expect(page.locator('.suggested-breaks')).toBeVisible();
    
    // Start the museum visit
    await page.locator('.start-visit-button').click();
    
    // Simulate following the route
    await page.locator('.next-stop-button').click();
    
    // Monitor engagement levels
    await page.locator('.engagement-monitor-button').click();
    
    // Verify engagement monitoring
    await expect(page.locator('.child-engagement-levels')).toBeVisible();
    
    // Simulate completing dinosaur challenge
    await page.locator('.complete-challenge-button').click();
    
    // Verify challenge completion
    await expect(page.locator('.challenge-completed')).toBeVisible();
    await expect(page.locator('.learning-achievement')).toBeVisible();
    
    // Save activity to list
    const activityName = await page.locator('.activity-title').textContent();
    if (activityName) familyActivities.push(activityName);
  });

  test('Day 4: Tower of London with Age-Appropriate Historical Stories', async ({ page }) => {
    // Navigate to Tower of London
    await page.goto('https://tourguideai.com/attractions');
    await page.locator('.search-input').fill('Tower of London');
    await page.keyboard.press('Enter');
    
    // Select Tower of London
    await page.locator('.attraction-result:has-text("Tower of London")').click();
    
    // Check age-appropriate content options
    await page.locator('.age-appropriate-content-button').click();
    
    // Verify content options for different ages
    await expect(page.locator('.age-filters')).toBeVisible();
    
    // Select content for 8-year-old
    await page.locator('.age-option[data-age="8-10"]').click();
    
    // Verify child-friendly version of Tower history is shown
    await expect(page.locator('.child-friendly-content')).toBeVisible();
    await expect(page.locator('.historical-content')).not.toContainText('beheaded');
    
    // Start virtual treasure hunt
    await page.locator('.treasure-hunt-button').click();
    
    // Verify treasure hunt starts
    await expect(page.locator('.treasure-hunt-interface')).toBeVisible();
    
    // Simulate finding first treasure
    await page.locator('.treasure-clue-1-answer').fill('crown');
    await page.locator('.submit-answer-button').click();
    
    // Verify clue solved
    await expect(page.locator('.clue-solved-notification')).toBeVisible();
    
    // Check the Learning Moments guide
    await page.locator('.learning-moments-button').click();
    
    // Verify learning guide for parents
    await expect(page.locator('.learning-moments-guide')).toBeVisible();
    await expect(page.locator('.discussion-prompt')).toBeVisible();
    
    // Use the Family Memory Capture feature
    await page.locator('.memory-capture-button').click();
    
    // Add a family photo (simulated)
    await page.locator('.add-photo-button').click();
    
    // Add caption
    await page.locator('.photo-caption-input').fill('Our adventure at the Tower of London');
    await page.locator('.save-memory-button').click();
    
    // Verify memory saved
    await expect(page.locator('.memory-saved-confirmation')).toBeVisible();
    
    // Save activity to list
    const activityName = await page.locator('.activity-title').textContent();
    if (activityName) familyActivities.push(activityName);
  });

  test('Day 5: Final Day Customization Based on Children\'s Preferences', async ({ page }) => {
    // Navigate to personalized recommendations
    await page.goto('https://tourguideai.com/for-you');
    
    // Check personalized family recommendations
    await expect(page.locator('.family-recommendations')).toBeVisible();
    
    // Check that recommendations are personalized per child
    await expect(page.locator('.child-recommendation:has-text("Alex")')).toBeVisible();
    await expect(page.locator('.child-recommendation:has-text("Sophia")')).toBeVisible();
    
    // Check that son's recommendation includes knights theme
    await expect(page.locator('.theme-based:has-text("knights")')).toBeVisible();
    
    // Check that daughter's recommendation includes queens theme
    await expect(page.locator('.theme-based:has-text("queens")')).toBeVisible();
    
    // Select son's recommendation
    await page.locator('.child-recommendation:has-text("Alex") .recommendation-item').first().click();
    
    // Verify activity details are shown
    await expect(page.locator('.activity-details')).toBeVisible();
    await expect(page.locator('.age-appropriate-indicator')).toContainText('8');
    
    // Book the activity
    await page.locator('.book-activity-button').click();
    
    // Add to itinerary
    await page.locator('.add-to-itinerary-button').click();
    
    // Go back to recommendations
    await page.goto('https://tourguideai.com/for-you');
    
    // Select daughter's recommendation
    await page.locator('.child-recommendation:has-text("Sophia") .recommendation-item').first().click();
    
    // Book the activity
    await page.locator('.book-activity-button').click();
    
    // Add to itinerary
    await page.locator('.add-to-itinerary-button').click();
    
    // Check final day itinerary
    await page.goto('https://tourguideai.com/itinerary/current/5');
    
    // Verify both activities are on the itinerary
    await expect(page.locator('.itinerary-item:has-text("knights")')).toBeVisible();
    await expect(page.locator('.itinerary-item:has-text("queens")')).toBeVisible();
    
    // Save activities to list
    const knightsActivity = await page.locator('.itinerary-item:has-text("knights")').textContent();
    const queensActivity = await page.locator('.itinerary-item:has-text("queens")').textContent();
    if (knightsActivity) familyActivities.push(knightsActivity);
    if (queensActivity) familyActivities.push(queensActivity);
  });

  test('Overall: Verify Family Engagement Success', async ({ page }) => {
    // Navigate to family dashboard
    await page.goto('https://tourguideai.com/family/dashboard');
    
    // Check family activity stats
    await expect(page.locator('.family-stats')).toBeVisible();
    
    // Verify engagement metrics
    await expect(page.locator('.engagement-metrics')).toBeVisible();
    
    // Check children's engagement scores
    const sonEngagement = await page.locator('.child-engagement:has-text("Alex") .score').textContent();
    const daughterEngagement = await page.locator('.child-engagement:has-text("Sophia") .score').textContent();
    
    // Validate high engagement
    expect(parseInt(sonEngagement || '0')).toBeGreaterThan(70);
    expect(parseInt(daughterEngagement || '0')).toBeGreaterThan(70);
    
    // Check educational content balance
    await expect(page.locator('.education-entertainment-balance')).toBeVisible();
    
    // Verify learning moments captured
    await expect(page.locator('.learning-moments-count')).toBeVisible();
    const learningMoments = await page.locator('.learning-moments-count').textContent();
    expect(parseInt(learningMoments || '0')).toBeGreaterThan(10);
    
    // Check family memories collected
    await page.locator('.family-memories-button').click();
    
    // Verify memories were captured
    await expect(page.locator('.memory-gallery')).toBeVisible();
    const memoriesCount = await page.locator('.memory-count').textContent();
    expect(parseInt(memoriesCount || '0')).toBeGreaterThan(5);
    
    // Validate that the trip goals were met
    await expect(page.locator('.goal-achievement')).toBeVisible();
    await expect(page.locator('.goal-item:has-text("kid-friendly")')).toHaveClass(/completed/);
    await expect(page.locator('.goal-item:has-text("education")')).toHaveClass(/completed/);
    await expect(page.locator('.goal-item:has-text("engagement")')).toHaveClass(/completed/);
  });
}); 