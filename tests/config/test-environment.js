/**
 * Test Environment Configuration
 * 
 * This file sets up the environment variables needed for testing,
 * particularly for use in CI environments or when running tests locally.
 */

// Set environment variables
process.env.CI = 'true';
process.env.NODE_ENV = 'test';

// Optional: Set a mock URL for tests that require a base URL
process.env.TEST_BASE_URL = 'http://mock-tourguideai.test';

// Log the test environment configuration
console.log('Test environment variables set:');
console.log('- CI:', process.env.CI);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- TEST_BASE_URL:', process.env.TEST_BASE_URL);

// Export the configuration for programmatic use
module.exports = {
  isTestEnv: true,
  mockBaseUrl: process.env.TEST_BASE_URL
}; 