/**
 * Playwright Configuration for Cross-Browser Testing
 * 
 * This file now imports the configuration from the centralized config directory.
 * It's maintained for backward compatibility with existing scripts.
 */

// Import the cross-browser configuration from the central location
const crossBrowserConfig = require('../config/playwright/cross-browser.config');

module.exports = crossBrowserConfig; 