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

  test('Beta Portal loads correctly', async ({ page }) => {
    // Navigate to beta portal
    await page.goto(`${BASE_URL}/beta`);
    
    // Check for beta portal elements
    await expect(page.locator('text=Beta Program Portal')).toBeVisible();
    await expect(page.locator('.beta-login-form')).toBeVisible();
  });

  test('Beta login works with valid credentials', async ({ page }) => {
    // Navigate to beta portal
    await page.goto(`${BASE_URL}/beta`);
    
    // Fill login form with test user (this should be a test user specifically for smoke tests)
    await page.fill('#email', 'beta-tester@example.com');
    await page.fill('#password', 'test-password-123');
    await page.click('button[type="submit"]');
    
    // Verify successful login redirects to dashboard
    await expect(page.locator('.beta-dashboard')).toBeVisible();
  });

  test('Onboarding flow is accessible for new users', async ({ page }) => {
    // This test assumes a new user account or a way to reset onboarding status
    // Login with a test account that needs onboarding
    await page.goto(`${BASE_URL}/beta`);
    await page.fill('#email', 'new-beta-tester@example.com');
    await page.fill('#password', 'test-password-123');
    await page.click('button[type="submit"]');
    
    // Check that onboarding flow appears
    await expect(page.locator('.onboarding-flow')).toBeVisible();
    
    // Verify first step (code redemption) is shown
    await expect(page.locator('text=Enter your beta access code')).toBeVisible();
  });

  test('Survey system displays available surveys', async ({ page }) => {
    // Login with a test account
    await page.goto(`${BASE_URL}/beta`);
    await page.fill('#email', 'beta-tester@example.com');
    await page.fill('#password', 'test-password-123');
    await page.click('button[type="submit"]');
    
    // Navigate to surveys section
    await page.click('text=Surveys');
    
    // Verify survey list is displayed
    await expect(page.locator('.survey-list')).toBeVisible();
    
    // Verify there's at least one survey item or empty state message
    await expect(page.locator('.survey-list-item, .empty-surveys-message')).toBeVisible();
  });

  test('Analytics dashboard loads for admin users', async ({ page }) => {
    // Login with an admin account
    await page.goto(`${BASE_URL}/beta`);
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'admin-password-123');
    await page.click('button[type="submit"]');
    
    // Navigate to analytics section (admin only)
    await page.click('text=Analytics');
    
    // Verify analytics dashboard is displayed
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
    
    // Check for key analytics components
    await expect(page.locator('.user-activity-chart')).toBeVisible();
    await expect(page.locator('.feedback-analysis')).toBeVisible();
  });
  
  test.describe('UX Audit System Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Login with an admin account
      await page.goto(`${BASE_URL}/beta`);
      await page.fill('#email', 'admin@example.com');
      await page.fill('#password', 'admin-password-123');
      await page.click('button[type="submit"]');
      
      // Navigate to analytics section
      await page.click('text=Analytics');
    });
    
    test('Session recording feature is accessible and loads correctly', async ({ page }) => {
      // Navigate to session recordings
      await page.click('text=Session Recordings');
      
      // Verify session list is visible
      await expect(page.locator('.session-recordings-list')).toBeVisible();
      
      // Check if we have session items or empty state
      await expect(page.locator('.session-item, .empty-sessions-message')).toBeVisible();
      
      // If sessions exist, check first one loads correctly
      if (await page.locator('.session-item').count() > 0) {
        await page.click('.session-item >> nth=0');
        
        // Verify player loads
        await expect(page.locator('.session-player')).toBeVisible();
        await expect(page.locator('.playback-controls')).toBeVisible();
        await expect(page.locator('.timeline')).toBeVisible();
      }
    });
    
    test('Heatmap visualization loads and displays data', async ({ page }) => {
      // Navigate to heatmaps
      await page.click('text=Heatmaps');
      
      // Verify heatmap component is visible
      await expect(page.locator('.heatmap-container')).toBeVisible();
      
      // Check filter controls
      await expect(page.locator('.heatmap-filters')).toBeVisible();
      
      // Verify heatmap canvas loads
      await expect(page.locator('.heatmap-canvas')).toBeVisible();
      
      // Test filter change
      await page.selectOption('.page-selector', 'homepage');
      await page.selectOption('.interaction-type', 'clicks');
      
      // Verify loading state and then content
      await expect(page.locator('.loading-indicator')).toBeVisible();
      await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.heatmap-canvas')).toBeVisible();
    });
    
    test('UX metrics evaluation displays charts and data', async ({ page }) => {
      // Navigate to UX metrics
      await page.click('text=UX Metrics');
      
      // Verify metrics component is visible
      await expect(page.locator('.ux-metrics-container')).toBeVisible();
      
      // Check if charts are visible
      await expect(page.locator('.metrics-chart')).toBeVisible();
      await expect(page.locator('.metric-card')).toHaveCount.above(0);
      
      // Test date range filter
      await page.click('.date-range-selector');
      await page.click('text=Last 30 days');
      
      // Verify data updates
      await expect(page.locator('.loading-indicator')).toBeVisible();
      await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.metrics-chart')).toBeVisible();
    });
  });
  
  test.describe('Task Prompt System Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Login with a beta tester account
      await page.goto(`${BASE_URL}/beta`);
      await page.fill('#email', 'beta-tester@example.com');
      await page.fill('#password', 'test-password-123');
      await page.click('button[type="submit"]');
    });
    
    test('Task list displays available tasks', async ({ page }) => {
      // Navigate to tasks section
      await page.click('text=Tasks');
      
      // Verify task list is visible
      await expect(page.locator('.task-list')).toBeVisible();
      
      // Check if we have task items or empty state
      await expect(page.locator('.task-item, .empty-tasks-message')).toBeVisible();
      
      // Verify task categories are visible
      await expect(page.locator('.task-categories')).toBeVisible();
    });
    
    test('Task prompt appears and functions correctly', async ({ page }) => {
      // Navigate to tasks section
      await page.click('text=Tasks');
      
      // If tasks exist, open the first one
      if (await page.locator('.task-item').count() > 0) {
        await page.click('.task-item >> nth=0');
        
        // Verify task prompt appears
        await expect(page.locator('.task-prompt')).toBeVisible();
        await expect(page.locator('.task-description')).toBeVisible();
        await expect(page.locator('.task-steps')).toBeVisible();
        
        // Start the task
        await page.click('button:has-text("Start Task")');
        
        // Verify task is now in progress
        await expect(page.locator('.task-prompt.in-progress')).toBeVisible();
        
        // Test step navigation
        if (await page.locator('.step-button').count() > 1) {
          await page.click('.step-button >> nth=1');
          await expect(page.locator('.step-content.active >> nth=1')).toBeVisible();
        }
        
        // Minimize and restore task
        await page.click('button:has-text("Minimize")');
        await expect(page.locator('.task-prompt')).not.toBeVisible();
        
        await page.click('.minimized-task-indicator');
        await expect(page.locator('.task-prompt')).toBeVisible();
      }
    });
    
    test('Task completion flow works correctly', async ({ page }) => {
      // Navigate to tasks section
      await page.click('text=Tasks');
      
      // If tasks exist, open the first one
      if (await page.locator('.task-item').count() > 0) {
        await page.click('.task-item >> nth=0');
        
        // Start the task
        await page.click('button:has-text("Start Task")');
        
        // Complete each step
        const stepsCount = await page.locator('.step-button').count();
        for (let i = 0; i < stepsCount; i++) {
          await page.click('button:has-text("Complete Step")');
        }
        
        // Verify task completion screen
        await expect(page.locator('.task-completed')).toBeVisible();
        await expect(page.locator('.feedback-form')).toBeVisible();
        
        // Submit feedback
        await page.fill('.feedback-input', 'Test feedback for smoke test');
        await page.click('button:has-text("Submit Feedback")');
        
        // Verify success message
        await expect(page.locator('.feedback-success')).toBeVisible();
        
        // Return to task list
        await page.click('button:has-text("Return to Tasks")');
        await expect(page.locator('.task-list')).toBeVisible();
        
        // Verify task is marked as completed
        await expect(page.locator('.task-item.completed >> nth=0')).toBeVisible();
      }
    });
    
    test('Task prompt integrates with session recording', async ({ page }) => {
      // Navigate to settings first to enable recording
      await page.click('text=Settings');
      
      // Enable task recording if not already enabled
      const isRecordingEnabled = await page.isChecked('#enable-task-recording');
      if (!isRecordingEnabled) {
        await page.click('#enable-task-recording');
        await page.click('button:has-text("Save")');
        await expect(page.locator('.settings-saved')).toBeVisible();
      }
      
      // Go to tasks
      await page.click('text=Tasks');
      
      // If tasks exist, open the first one
      if (await page.locator('.task-item').count() > 0) {
        await page.click('.task-item >> nth=0');
        
        // Start the task
        await page.click('button:has-text("Start Task")');
        
        // Verify recording indicator is visible
        await expect(page.locator('.recording-indicator')).toBeVisible();
        
        // Complete one step
        await page.click('button:has-text("Complete Step")');
        
        // Complete the task
        await page.click('button:has-text("Complete Task")');
        
        // Return to task list
        await page.click('button:has-text("Return to Tasks")');
        
        // Go to recordings to verify the session was recorded
        await page.click('text=My Recordings');
        
        // Verify recording appears in list
        await expect(page.locator('.recording-item')).toBeVisible();
        await expect(page.locator('.recording-item >> text=Task:')).toBeVisible();
      }
    });
  });
}); 