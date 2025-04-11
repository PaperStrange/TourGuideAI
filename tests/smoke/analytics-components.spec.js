/**
 * Analytics Components - Smoke Tests
 * 
 * These tests verify that the beta program analytics components render correctly 
 * and function as expected in a production-like environment.
 */

const { test, expect } = require('@playwright/test');
const { navigateToLoggedIn, waitForPageLoad } = require('../helpers/navigation');

// Base URL will be set by the CI/CD environment
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Analytics Components', () => {
  // Use a custom timeout for the entire test suite
  test.setTimeout(60000);
  
  test.beforeEach(async ({ page }) => {
    await navigateToLoggedIn(page, `${baseUrl}/beta-program/analytics`);
    await waitForPageLoad(page);
  });

  test('Beta Program Dashboard renders successfully', async ({ page }) => {
    // Verify dashboard title is displayed
    await expect(page.locator('h1:has-text("Beta Program Analytics")')).toBeVisible();
    
    // Verify overview tab is active by default
    await expect(page.locator('.summaryCards')).toBeVisible();
    
    // Verify tabs are displayed
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=User Activity')).toBeVisible();
    await expect(page.locator('text=Feature Usage')).toBeVisible();
    await expect(page.locator('text=Device Stats')).toBeVisible();
  });

  test('User Activity tab shows activity chart', async ({ page }) => {
    // Click on User Activity tab
    await page.click('text=User Activity');
    
    // Wait for user activity chart to render
    await page.waitForSelector('.userActivityChart');
    
    // Verify chart heading is visible
    await expect(page.locator('h3:has-text("User Activity")')).toBeVisible();
    
    // Verify time range selector is available
    await expect(page.locator('text=Time Range')).toBeVisible();
    
    // Verify metrics selector checkboxes are available
    await expect(page.locator('.metricControls')).toBeVisible();
  });

  test('Feature Usage tab shows usage chart', async ({ page }) => {
    // Click on Feature Usage tab
    await page.click('text=Feature Usage');
    
    // Wait for feature usage chart to render
    await page.waitForSelector('.chartContainer');
    
    // Verify chart heading is visible
    await expect(page.locator('h3:has-text("Feature Usage")')).toBeVisible();
    
    // Verify view selectors are available
    await expect(page.locator('.viewSelector')).toHaveCount(3);
    
    // Verify insights panel is displayed
    await expect(page.locator('text=Feature Insights')).toBeVisible();
  });

  test('Device Distribution tab shows distribution chart', async ({ page }) => {
    // Click on Device Stats tab
    await page.click('text=Device Stats');
    
    // Wait for device distribution chart to render
    await page.waitForSelector('.pieChartWrapper');
    
    // Verify chart heading is visible
    await expect(page.locator('h3:has-text("Device Distribution")')).toBeVisible();
    
    // Verify view selector is available
    await expect(page.locator('.viewSelector')).toBeVisible();
    
    // Verify insights panel is displayed
    await expect(page.locator('text=Device Insights')).toBeVisible();
  });

  test('Interactive elements respond to user actions', async ({ page }) => {
    // Test tab switching
    await page.click('text=Feature Usage');
    await expect(page.locator('h3:has-text("Feature Usage")')).toBeVisible();
    await page.click('text=Device Stats');
    await expect(page.locator('h3:has-text("Device Distribution")')).toBeVisible();
    
    // Test view selector in Device Distribution
    await page.selectOption('.viewSelector', 'os');
    // Wait for chart to update
    await page.waitForTimeout(1000);
    
    // Test returning to overview
    await page.click('text=Overview');
    await expect(page.locator('.summaryCards')).toBeVisible();
  });
}); 