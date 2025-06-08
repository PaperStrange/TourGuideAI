/**
 * Jest Configuration for Backend Tests
 * 
 * This configuration is optimized for testing Node.js server, API routes, and services.
 */

const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../../..'),
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/server/**/*.test.js',
    '<rootDir>/server/tests/**/*.test.js'
  ],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/"
  ],
  moduleNameMapper: {
    "axios": "axios/dist/node/axios.cjs"
  },
  moduleDirectories: ['node_modules', 'server'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/*.d.ts',
    '!server/server.js',
    '!server/test-server.js'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  verbose: true
}; 