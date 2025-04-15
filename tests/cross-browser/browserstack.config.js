/**
 * BrowserStack Configuration for Cross-Browser Tests
 * 
 * This file now imports the configuration from the centralized config directory.
 * It's maintained for backward compatibility with existing scripts.
 */

// Import the cross-browser BrowserStack configuration from the central location
const browserStackConfig = require('../config/browserstack/cross-browser.config');

module.exports = browserStackConfig; 