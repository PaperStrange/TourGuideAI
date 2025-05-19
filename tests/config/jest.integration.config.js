/**
 * Jest Configuration for Integration Tests
 * 
 * This configuration is optimized for testing interactions between frontend and backend components.
 */

const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  testMatch: [
    '<rootDir>/src/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js',
    '<rootDir>/tests/config/integration-setup.js'
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/"
  ],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "axios": "axios/dist/node/axios.cjs",
    "\\.svg$": "<rootDir>/tests/config/mocks/svgMock.js"
  },
  moduleDirectories: ['node_modules', 'src'],
  // Longer timeout for integration tests
  testTimeout: 30000,
  verbose: true
}; 