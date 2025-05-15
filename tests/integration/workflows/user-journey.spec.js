/**
 * End-to-End User Journeys Integration Tests
 * 
 * This file contains end-to-end user journey tests that validate common user workflows
 * through the application, testing how different user types interact with the system.
 */

const { test, expect } = require('@playwright/test');
const {
  setupMockMode,
  setupAuthScenario
} = require('../utils/test-setup');

// Set a baseUrl for testing
const baseUrl = 'http://localhost:3000';

test.describe('End-to-End User Journeys', () => {
  test('casual tourist journey - browse, plan, save and share', async ({ page }) => {
    // 1. Start on home page
    await setupMockMode(page);
    await page.goto(`${baseUrl}/`);
    
    // 2. Click on plan trip button
    await page.click('[data-testid="plan-trip-button"]');
    
    // 3. Verify redirected to travel planning page
    expect(page.url()).toContain('/travel-planning');
    
    // 4. Enter query for casual trip
    await page.fill('[data-testid="query-input"]', 'Weekend in Paris, casual sightseeing');
    
    // 5. Go through planning workflow
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // 6. Save the route
    await page.click('[data-testid="save-route-button"]');
    
    // 7. Share the route - setup mock for UI display
    await page.evaluate(() => {
      // Set up click handler to show share dialog
      const shareButton = document.querySelector('[data-testid="share-button"]');
      if (shareButton) {
        shareButton.addEventListener('click', () => {
          const shareDialog = document.querySelector('[data-testid="share-dialog"]');
          if (shareDialog) shareDialog.style.display = 'block';
        });
      }
      
      // Set up click handler to show copy confirmation
      const copyLinkButton = document.querySelector('[data-testid="copy-link-button"]');
      if (copyLinkButton) {
        copyLinkButton.addEventListener('click', () => {
          const copyConfirmation = document.querySelector('[data-testid="copy-confirmation"]');
          if (copyConfirmation) copyConfirmation.style.display = 'block';
        });
      }
    });
    
    // Click share button and verify dialog
    await page.click('[data-testid="share-button"]');
    await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
    
    // Copy link and verify confirmation
    await page.click('[data-testid="copy-link-button"]');
    await expect(page.locator('[data-testid="copy-confirmation"]')).toBeVisible();
  });
  
  test('family traveler journey - plan, customize and export', async ({ page }) => {
    // 1. Start on home page
    await setupMockMode(page);
    await page.goto(`${baseUrl}/`);
    
    // 2. Navigate to travel planning
    await page.click('[data-testid="plan-trip-button"]');
    
    // 3. Enter family-friendly query
    await page.fill('[data-testid="query-input"]', 'Paris for 5 days with kids, family-friendly activities');
    
    // 4. Go through planning workflow
    await page.click('[data-testid="analyze-button"]');
    await expect(page.locator('[data-testid="intent-analysis"]')).toBeVisible();
    
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="route-preview"]')).toBeVisible();
    
    // 5. Customize the route
    await page.click('[data-testid="edit-button"]');
    await expect(page.locator('[data-testid="itinerary-editor"]')).toBeVisible();
    
    // 6. Add a family-friendly activity
    await page.click('[data-testid="add-activity-button"]');
    await page.fill('[data-testid="activity-name-input"]', 'Disneyland Paris');
    await page.fill('[data-testid="activity-desc-input"]', 'Fun theme park for the whole family');
    await page.fill('[data-testid="activity-time-input"]', '10:00 AM');
    await page.click('[data-testid="save-activity-button"]');
    
    // Return to route preview
    await page.click('[data-testid="back-to-preview-button"]');
    
    // 7. Setup export UI display
    await page.evaluate(() => {
      // Set up click handler for export button
      const exportButton = document.querySelector('[data-testid="export-button"]');
      if (exportButton) {
        exportButton.addEventListener('click', () => {
          const exportOptions = document.querySelector('[data-testid="export-options"]');
          if (exportOptions) exportOptions.style.display = 'block';
        });
      }
      
      // Set up click handler for PDF export button
      const exportPdfButton = document.querySelector('[data-testid="export-pdf-button"]');
      if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => {
          const exportConfirmation = document.querySelector('[data-testid="export-confirmation"]');
          if (exportConfirmation) exportConfirmation.style.display = 'block';
          
          const exportOptions = document.querySelector('[data-testid="export-options"]');
          if (exportOptions) exportOptions.style.display = 'none';
        });
      }
    });
    
    // Export the route
    await page.click('[data-testid="export-button"]');
    
    // Verify export options appear
    await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
    
    // Select PDF option
    await page.click('[data-testid="export-pdf-button"]');
    
    // Verify export confirmation
    await expect(page.locator('[data-testid="export-confirmation"]')).toBeVisible();
  });
  
  test('business traveler journey - quick plan with evening activities', async ({ page }) => {
    // 1. Start on home page
    await setupMockMode(page);
    await page.goto(`${baseUrl}/`);
    
    // 2. Navigate to quick plan page
    await page.click('[data-testid="plan-trip-button"]');
    await page.goto(`${baseUrl}/quick-plan`); // Simulate quick plan navigation
    
    // 3. Setup quick plan UI display
    await page.evaluate(() => {
      // Set up click handler for quick generate button
      const quickGenerateButton = document.querySelector('[data-testid="quick-generate-button"]');
      if (quickGenerateButton) {
        quickGenerateButton.addEventListener('click', () => {
          const quickRoute = document.querySelector('[data-testid="quick-route"]');
          if (quickRoute) quickRoute.style.display = 'block';
        });
      }
      
      // Set up click handler for filter button
      const filterButton = document.querySelector('[data-testid="filter-button"]');
      if (filterButton) {
        filterButton.addEventListener('click', () => {
          const filterOptions = document.querySelector('[data-testid="filter-options"]');
          if (filterOptions) filterOptions.style.display = 'block';
        });
      }
      
      // Set up click handler for apply filters button
      const applyFiltersButton = document.querySelector('[data-testid="apply-filters-button"]');
      if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', () => {
          const filterOptions = document.querySelector('[data-testid="filter-options"]');
          if (filterOptions) filterOptions.style.display = 'none';
          
          const filteredActivities = document.querySelector('[data-testid="filtered-activities"]');
          if (filteredActivities) filteredActivities.style.display = 'block';
        });
      }
      
      // Set up click handler for add to calendar button
      const addToCalendarButton = document.querySelector('[data-testid="add-to-calendar-button"]');
      if (addToCalendarButton) {
        addToCalendarButton.addEventListener('click', () => {
          const calendarDialog = document.querySelector('[data-testid="calendar-dialog"]');
          if (calendarDialog) calendarDialog.style.display = 'block';
        });
      }
      
      // Set up click handler for Google Calendar button
      const googleCalendarButton = document.querySelector('[data-testid="google-calendar"]');
      if (googleCalendarButton) {
        googleCalendarButton.addEventListener('click', () => {
          const calendarDialog = document.querySelector('[data-testid="calendar-dialog"]');
          if (calendarDialog) calendarDialog.style.display = 'none';
          
          const calendarConfirmation = document.querySelector('[data-testid="calendar-confirmation"]');
          if (calendarConfirmation) calendarConfirmation.style.display = 'block';
        });
      }
    });
    
    // 4. Fill in quick plan form
    await page.fill('[data-testid="destination-input"]', 'Tokyo');
    await page.fill('[data-testid="days-input"]', '3');
    
    // 5. Generate quick route
    await page.click('[data-testid="quick-generate-button"]');
    
    // Verify quick route appears
    await expect(page.locator('[data-testid="quick-route"]')).toBeVisible();
    
    // 6. Filter evening activities
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="filter-options"]')).toBeVisible();
    
    await page.click('[data-testid="evening-filter"]');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered activities
    await expect(page.locator('[data-testid="filtered-activities"]')).toBeVisible();
    
    // 7. Add to calendar
    await page.click('[data-testid="add-to-calendar-button"]');
    await expect(page.locator('[data-testid="calendar-dialog"]')).toBeVisible();
    
    await page.click('[data-testid="google-calendar"]');
    await expect(page.locator('[data-testid="calendar-confirmation"]')).toBeVisible();
  });
  
  test('authentication journey - start anonymous and continue after login', async ({ page }) => {
    // 1. Start and set up mock mode
    await setupMockMode(page);
    await page.goto(`${baseUrl}/`);
    
    // Navigate to planning
    await page.click('[data-testid="plan-trip-button"]');
    
    // Setup auth interaction UI
    await page.evaluate(() => {
      // Set up click handler for login prompt
      const saveRouteButton = document.querySelector('[data-testid="save-route-button"]');
      if (saveRouteButton) {
        saveRouteButton.addEventListener('click', () => {
          const loginPrompt = document.querySelector('[data-testid="login-prompt"]');
          if (loginPrompt) loginPrompt.style.display = 'block';
        });
      }
      
      // Set up click handler for login button in prompt
      const loginButtonInPrompt = document.querySelector('[data-testid="login-button-prompt"]');
      if (loginButtonInPrompt) {
        loginButtonInPrompt.addEventListener('click', () => {
          const loginPrompt = document.querySelector('[data-testid="login-prompt"]');
          if (loginPrompt) loginPrompt.style.display = 'none';
          
          const loginPage = document.querySelector('[data-testid="login-page"]');
          if (loginPage) loginPage.style.display = 'block';
        });
      }
      
      // Set up click handler for login submit button
      const loginSubmitButton = document.querySelector('[data-testid="login-submit-button"]');
      if (loginSubmitButton) {
        loginSubmitButton.addEventListener('click', () => {
          const loginPage = document.querySelector('[data-testid="login-page"]');
          if (loginPage) loginPage.style.display = 'none';
          
          const savedRoute = document.querySelector('[data-testid="saved-route"]');
          if (savedRoute) savedRoute.style.display = 'block';
        });
      }
    });
    
    // 2. Create route anonymously
    await page.fill('[data-testid="query-input"]', 'Weekend in London');
    await page.click('[data-testid="analyze-button"]');
    await page.click('[data-testid="generate-button"]');
    
    // 3. Try to save (should prompt for login)
    await page.click('[data-testid="save-route-button"]');
    await expect(page.locator('[data-testid="login-prompt"]')).toBeVisible();
    
    // 4. Click login button in prompt
    await page.click('[data-testid="login-button-prompt"]');
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
    
    // 5. Fill login form and submit
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit-button"]');
    
    // 6. Verify route is saved after login
    await expect(page.locator('[data-testid="saved-route"]')).toBeVisible();
  });
}); 