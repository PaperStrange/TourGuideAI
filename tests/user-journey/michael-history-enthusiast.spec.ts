import { test, expect } from '@playwright/test';

/**
 * Michael's User Journey Test
 * 
 * Profile: History Enthusiast
 * Goals: Deep dive into historical contexts, connect with local history, learn detailed historical facts
 * Scenario: Historical Deep Dive in Rome (7 days)
 */

test.describe('Michael (History Enthusiast) - Rome Historical Deep Dive', () => {
  // Store session data between tests
  let savedNotes: string[] = [];
  let historianQuestions: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Go to the app and ensure we're logged in as Michael
    await page.goto('https://tourguideai.com/');
    
    // Mock the login if needed
    if (await page.locator('.login-button').isVisible()) {
      await page.locator('.login-button').click();
      await page.locator('input[name="email"]').fill('michael@example.com');
      await page.locator('input[name="password"]').fill('test-password');
      await page.locator('button[type="submit"]').click();
      
      // Verify login was successful
      await expect(page.locator('.user-profile')).toBeVisible();
    }
    
    // Set location to Rome for testing
    await page.evaluate(() => {
      // Mock geolocation for Rome
      const mockGeolocation = {
        latitude: 41.9028,
        longitude: 12.4964
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
  });

  test('Planning Phase: Using Historical Layers feature', async ({ page }) => {
    // Navigate to planning section
    await page.goto('https://tourguideai.com/plan');
    
    // Verify Rome is set as location
    await expect(page.locator('.current-location')).toContainText('Rome');
    
    // Access Historical Layers feature
    await page.locator('.historical-layers-button').click();
    
    // Verify historical categories are shown
    await expect(page.locator('.historical-categories')).toBeVisible();
    
    // Select "Ancient Rome" as primary interest
    await page.locator('.category-option:has-text("Ancient Rome")').click();
    
    // Set preferences
    await page.locator('.preferences-button').click();
    await page.locator('.preference-option:has-text("Detailed Historical Context")').click();
    await page.locator('.apply-preferences-button').click();
    
    // Create multi-day itinerary
    await page.locator('.create-itinerary-button').click();
    await page.locator('.itinerary-days-selector').selectOption('7');
    await page.locator('.itinerary-focus-dropdown').selectOption('Roman history');
    await page.locator('.create-button').click();
    
    // Verify itinerary was created
    await expect(page.locator('.itinerary-overview')).toBeVisible();
    await expect(page.locator('.itinerary-title')).toContainText('Roman history');
    await expect(page.locator('.itinerary-days')).toContainText('7 days');
  });

  test('Days 1-2: Forum and Palatine Exploration with Historical Narratives', async ({ page }) => {
    // Navigate to day 1 of itinerary
    await page.goto('https://tourguideai.com/itinerary/current/1');
    
    // Verify Roman Forum is on the agenda
    await expect(page.locator('.day-agenda')).toContainText('Roman Forum');
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Verify detailed historical narrative is available
    await expect(page.locator('.narrative-controls')).toBeVisible();
    
    // Play historical narrative
    await page.locator('.play-narrative-button').click();
    
    // Access Expert Commentary
    await page.locator('.expert-commentary-button').click();
    
    // Verify scholarly content is shown
    await expect(page.locator('.expert-commentary-panel')).toBeVisible();
    await expect(page.locator('.scholar-name')).toBeVisible();
    await expect(page.locator('.commentary-content')).toContainText('historical analysis');
    
    // Test timeline feature
    await page.locator('.timeline-button').click();
    
    // Verify timeline is shown but initially complex
    await expect(page.locator('.timeline-view')).toBeVisible();
    
    // Use timeline filter to focus on specific era
    await page.locator('.timeline-era-filter').click();
    await page.locator('.era-option:has-text("Republican Rome")').click();
    
    // Verify filtered timeline is clearer
    await expect(page.locator('.timeline-events')).toContainText('Republic');
    
    // Take some notes
    await page.locator('.notes-button').click();
    await page.locator('.note-input').fill('The Roman Forum was the center of day-to-day life in Rome');
    await page.locator('.save-note-button').click();
    
    // Save note for later verification
    savedNotes.push('The Roman Forum was the center of day-to-day life in Rome');
    
    // Verify note was saved
    await expect(page.locator('.note-saved-confirmation')).toBeVisible();
  });

  test('Days 1-2: Off-the-beaten-path Ancient Sites', async ({ page }) => {
    // Navigate to discover section
    await page.goto('https://tourguideai.com/discover');
    
    // Use "Beyond the Obvious" filter
    await page.locator('.filters-button').click();
    await page.locator('.filter-option:has-text("Beyond the Obvious")').click();
    await page.locator('.apply-filters-button').click();
    
    // Verify less-known sites are shown
    await expect(page.locator('.discovery-results')).toBeVisible();
    await expect(page.locator('.place-result')).toContainText('Ancient Roman Apartments');
    
    // Select the specialized tour
    await page.locator('.place-result:has-text("Ancient Roman Apartments")').click();
    await page.locator('.view-tour-button').click();
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Use "Ask a Historian" feature
    await page.locator('.ask-historian-button').click();
    await page.locator('.question-input').fill('What heating systems were used in ancient Roman apartments?');
    await page.locator('.submit-question-button').click();
    
    // Save question for later verification
    historianQuestions.push('What heating systems were used in ancient Roman apartments?');
    
    // Verify question was submitted
    await expect(page.locator('.question-submitted')).toBeVisible();
    
    // Continue exploring while waiting for answer
    await page.locator('.continue-exploring-button').click();
    
    // After some time, check for historian response
    // In real test we'd use a mock or intercept the response
    await page.waitForTimeout(5000); // Simulate waiting for response
    
    await page.locator('.historian-responses-button').click();
    
    // Verify response was received
    await expect(page.locator('.historian-response')).toBeVisible();
    await expect(page.locator('.response-content')).toContainText('heating');
  });

  test('Days 3-4: Early Christian Rome Transition Period', async ({ page }) => {
    // Navigate to custom tour creation
    await page.goto('https://tourguideai.com/create-tour');
    
    // Attempt to create a custom tour but find interface complex
    await page.locator('.tour-theme-input').fill('Transition from pagan to Christian Rome');
    await page.locator('.set-focus-button').click();
    
    // Observe complex interface with many options
    await expect(page.locator('.custom-tour-options')).toBeVisible();
    
    // Find the experience overwhelming and look for alternatives
    await page.locator('.cancel-button').click();
    
    // Search for pre-made tours instead
    await page.goto('https://tourguideai.com/tours');
    await page.locator('.search-input').fill('Pagan to Christian Rome');
    await page.keyboard.press('Enter');
    
    // Select pre-made tour
    await page.locator('.tour-result:has-text("Pagan to Christian Rome")').first().click();
    
    // View tour details
    await expect(page.locator('.tour-details')).toBeVisible();
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Use overlay feature at a key location
    await page.evaluate(() => {
      // Simulate arriving at Santa Maria Sopra Minerva
      const mockGeolocation = {
        latitude: 41.8986,
        longitude: 12.4768
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // Verify overlay notification appears
    await expect(page.locator('.overlay-available-notification')).toBeVisible({ timeout: 10000 });
    
    // Activate overlay
    await page.locator('.view-overlay-button').click();
    
    // Verify building transition overlay shows
    await expect(page.locator('.building-transition-overlay')).toBeVisible();
    
    // Check for alignment issues by measuring overlay position against background
    // This is a visual test that might require screenshot comparison in a real test
    
    // Take notes about the transition
    await page.locator('.notes-button').click();
    await page.locator('.note-input').fill('Temple of Minerva was converted to a church in the 8th century');
    await page.locator('.save-note-button').click();
    
    // Save note for later verification
    savedNotes.push('Temple of Minerva was converted to a church in the 8th century');
  });

  test('Days 3-4: Catacombs and Churches with Symbolic Explanations', async ({ page }) => {
    // Navigate to specialized Christian sites tour
    await page.goto('https://tourguideai.com/tours/early-christian-sites');
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Visit first catacomb location
    await page.evaluate(() => {
      // Simulate arriving at Catacombs of San Callisto
      const mockGeolocation = {
        latitude: 41.8607,
        longitude: 12.5133
      };
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: mockGeolocation,
          timestamp: Date.now()
        } as GeolocationPosition);
      };
    });
    
    // View symbolic elements in artwork
    await page.locator('.artwork-analysis-button').click();
    
    // Find symbolic explanations oversimplified
    await expect(page.locator('.symbol-explanation')).toBeVisible();
    
    // Look for more detailed information
    await page.locator('.detail-level-toggle').click();
    await page.locator('.academic-detail-option').click();
    
    // Verify more detailed content appears
    await expect(page.locator('.academic-explanation')).toBeVisible();
    await expect(page.locator('.academic-explanation')).toContainText('theological significance');
    
    // Participate in community discussion
    await page.locator('.community-button').click();
    await page.locator('.discussion-thread:has-text("Early Christian Symbols")').click();
    await page.locator('.reply-input').fill('The fish symbol (Ichthys) was used as a secret symbol during persecution.');
    await page.locator('.post-reply-button').click();
    
    // Verify reply was posted
    await expect(page.locator('.your-reply')).toBeVisible();
    await expect(page.locator('.community-response')).toBeVisible({ timeout: 15000 });
  });

  test('Days 5-7: Renaissance and Baroque Connections to Antiquity', async ({ page }) => {
    // Create tour showing Renaissance influences
    await page.goto('https://tourguideai.com/create-tour');
    
    // This time successfully create a custom tour
    await page.locator('.tour-theme-input').fill('Renaissance artists influenced by ancient Rome');
    await page.locator('.set-focus-button').click();
    
    // Select key Renaissance sites
    await page.locator('.site-option').nth(0).click();
    await page.locator('.site-option').nth(2).click();
    await page.locator('.site-option').nth(4).click();
    
    // Complete tour creation
    await page.locator('.create-tour-button').click();
    
    // Verify tour was created
    await expect(page.locator('.tour-created-confirmation')).toBeVisible();
    
    // Start the tour
    await page.locator('.start-tour-button').click();
    
    // Use side-by-side comparison feature
    await page.locator('.comparison-button').click();
    
    // View comparison
    await expect(page.locator('.comparison-view')).toBeVisible();
    
    // Notice low-resolution images for some comparisons
    await expect(page.locator('.image-quality-warning')).toBeVisible();
    
    // Request higher resolution when on WiFi
    await page.locator('.download-hd-button').click();
    
    // Verify download started
    await expect(page.locator('.download-progress')).toBeVisible();
    
    // Complete a historical quiz
    await page.locator('.quiz-button').click();
    await page.locator('.start-quiz-button').click();
    
    // Answer quiz questions (would mock answers in real test)
    for (let i = 0; i < 5; i++) {
      await page.locator('.quiz-option').nth(1).click();
      await page.locator('.next-question-button').click();
    }
    
    // Verify quiz completion
    await expect(page.locator('.quiz-results')).toBeVisible();
    await expect(page.locator('.quiz-score')).toBeVisible();
  });

  test('Overall: Verify Historical Learning Achievement', async ({ page }) => {
    // Navigate to profile
    await page.goto('https://tourguideai.com/profile');
    
    // Check historical knowledge score
    await expect(page.locator('.knowledge-score')).toBeVisible();
    const knowledgeScore = await page.locator('.knowledge-score').textContent();
    expect(parseInt(knowledgeScore || '0')).toBeGreaterThan(75);
    
    // Verify notes were saved
    await page.locator('.saved-notes-button').click();
    for (const note of savedNotes) {
      await expect(page.locator('.notes-list')).toContainText(note);
    }
    
    // Check historian interaction
    await page.locator('.historian-questions-button').click();
    for (const question of historianQuestions) {
      await expect(page.locator('.questions-list')).toContainText(question);
      await expect(page.locator('.answer-received-indicator')).toBeVisible();
    }
    
    // Check historical periods explored
    await expect(page.locator('.periods-explored')).toContainText('Ancient Rome');
    await expect(page.locator('.periods-explored')).toContainText('Early Christian');
    await expect(page.locator('.periods-explored')).toContainText('Renaissance');
  });
}); 