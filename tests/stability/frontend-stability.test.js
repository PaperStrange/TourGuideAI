/**
 * Frontend Stability Tests
 * 
 * Tests to verify the stability of the frontend codebase, including:
 * - Router structure
 * - Theme Provider
 * - Global declarations
 * - Error boundaries
 * - Backend resilience
 * - UX Audit System components
 * - Task Prompt System components
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
  
  test.describe('UX Audit System Stability', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin to access UX audit features
      await page.goto('/beta');
      await page.fill('#email', 'admin@example.com');
      await page.fill('#password', 'admin-password-123');
      await page.click('button[type="submit"]');
      
      // Navigate to analytics section
      await page.click('text=Analytics');
    });
    
    test('should load SessionRecording component without errors', async ({ page }) => {
      // Click on a session recording to load the component
      await page.click('text=View Sessions');
      await page.click('.session-list-item >> nth=0');
      
      // Check if the component loaded properly
      await expect(page.locator('.session-recording-container')).toBeVisible();
      await expect(page.locator('.playback-controls')).toBeVisible();
      await expect(page.locator('.event-timeline')).toBeVisible();
      
      // Test playback controls
      await page.click('.play-button');
      await page.waitForTimeout(1000);
      
      // Ensure no console errors during playback
      let playbackErrors = false;
      page.on('console', msg => {
        if (msg.type() === 'error') {
          playbackErrors = true;
        }
      });
      
      await page.click('.pause-button');
      
      expect(playbackErrors).toBe(false);
    });
    
    test('should render HeatmapVisualization component correctly', async ({ page }) => {
      // Navigate to heatmap visualization
      await page.click('text=Heatmaps');
      
      // Check if the component loaded properly
      await expect(page.locator('.heatmap-visualization')).toBeVisible();
      await expect(page.locator('.heatmap-controls')).toBeVisible();
      
      // Test controls functionality
      await page.selectOption('.interaction-type-select', 'clicks');
      await page.fill('.intensity-slider', '75');
      
      // Verify canvas element is properly rendered
      await expect(page.locator('.heatmap-canvas')).toBeVisible();
      
      // Check export functionality
      await page.click('button:has-text("Export")');
      await expect(page.locator('.export-options')).toBeVisible();
    });
    
    test('should properly integrate UXMetricsEvaluation with the dashboard', async ({ page }) => {
      // Navigate to UX metrics section
      await page.click('text=UX Metrics');
      
      // Check if the component loaded properly
      await expect(page.locator('.ux-metrics-evaluation')).toBeVisible();
      await expect(page.locator('.metrics-chart')).toBeVisible();
      
      // Test filter functionality
      await page.click('.date-range-picker');
      await page.click('text=Last 7 days');
      
      // Verify metrics update without errors
      await expect(page.locator('.metrics-loading-indicator')).toBeVisible();
      await expect(page.locator('.metrics-loading-indicator')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.metrics-chart')).toBeVisible();
    });
  });
  
  test.describe('Task Prompt System Stability', () => {
    test.beforeEach(async ({ page }) => {
      // Login as a beta tester
      await page.goto('/beta');
      await page.fill('#email', 'beta-tester@example.com');
      await page.fill('#password', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Navigate to tasks section
      await page.click('text=Tasks');
    });
    
    test('should display InAppTaskPrompt component correctly', async ({ page }) => {
      // Click on a task to trigger the in-app task prompt
      await page.click('.task-list-item >> nth=0');
      
      // Check if the component loaded properly
      await expect(page.locator('.in-app-task-prompt')).toBeVisible();
      await expect(page.locator('.task-instructions')).toBeVisible();
      await expect(page.locator('.task-progress-indicator')).toBeVisible();
      
      // Test task interaction
      await page.click('button:has-text("Start Task")');
      await expect(page.locator('.task-in-progress')).toBeVisible();
    });
    
    test('should properly manage task state with TaskPromptManager', async ({ page }) => {
      // Complete a task to test state management
      await page.click('.task-list-item >> nth=0');
      await page.click('button:has-text("Start Task")');
      
      // Simulate completing the task
      await page.click('button:has-text("Complete Step")');
      await page.click('button:has-text("Complete Step")');
      await page.click('button:has-text("Complete Task")');
      
      // Verify task completion is recorded
      await expect(page.locator('.task-completed-message')).toBeVisible();
      
      // Return to task list and verify status update
      await page.click('button:has-text("Return to Tasks")');
      await expect(page.locator('.task-list-item.completed >> nth=0')).toBeVisible();
    });
    
    test('should integrate task recording with UX audit system', async ({ page }) => {
      // Enable session recording for tasks
      await page.click('text=Settings');
      await page.click('#enable-task-recording');
      await page.click('button:has-text("Save")');
      
      // Start a task with recording enabled
      await page.click('text=Tasks');
      await page.click('.task-list-item >> nth=0');
      await page.click('button:has-text("Start Task")');
      
      // Verify recording indicator is active
      await expect(page.locator('.recording-indicator')).toBeVisible();
      await expect(page.locator('.recording-indicator.active')).toBeVisible();
      
      // Complete the task
      await page.click('button:has-text("Complete Step")');
      await page.click('button:has-text("Complete Task")');
      
      // Verify recording stops properly
      await expect(page.locator('.recording-indicator')).not.toBeVisible();
      
      // Check recording was saved correctly
      await page.click('text=View Recordings');
      await expect(page.locator('.recording-list-item >> nth=0')).toContainText('Task:');
    });
    
    test('should handle multiple concurrent task prompts gracefully', async ({ page }) => {
      // Enable multiple task mode in settings
      await page.click('text=Settings');
      await page.click('#enable-multiple-tasks');
      await page.click('button:has-text("Save")');
      
      // Start multiple tasks
      await page.click('text=Tasks');
      await page.click('.task-list-item >> nth=0');
      await page.click('button:has-text("Start Task")');
      
      // Open another task while first is active
      await page.click('button:has-text("Minimize")');
      await page.click('.task-list-item >> nth=1');
      await page.click('button:has-text("Start Task")');
      
      // Verify both task indicators are present
      await expect(page.locator('.active-task-indicator')).toHaveCount(2);
      
      // Test switching between tasks
      await page.click('.active-task-indicator >> nth=0');
      await expect(page.locator('.in-app-task-prompt.active >> nth=0')).toBeVisible();
      
      await page.click('.active-task-indicator >> nth=1');
      await expect(page.locator('.in-app-task-prompt.active >> nth=1')).toBeVisible();
    });
  });
}); 