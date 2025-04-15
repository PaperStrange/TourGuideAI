/**
 * Root Jest Configuration
 * 
 * This configuration imports and uses specialized configurations based on the test type.
 * Use environment variables to select the appropriate test type:
 * - JEST_ENV=frontend: For frontend React component tests
 * - JEST_ENV=backend: For backend API and service tests
 * - JEST_ENV=integration: For integration tests between frontend and backend
 * 
 * If no environment variable is set, defaults to frontend tests.
 */

const path = require('path');
const testEnv = process.env.JEST_ENV || 'frontend';

let config = {};

switch (testEnv) {
  case 'backend':
    config = require('./tests/config/jest/backend.config.js');
    break;
  case 'integration':
    config = require('./tests/config/jest/integration.config.js');
    break;
  case 'frontend':
  default:
    config = require('./tests/config/jest/frontend.config.js');
    break;
}

module.exports = config; 